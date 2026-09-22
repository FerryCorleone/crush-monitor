import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "dotenv";
import {
  PROVIDERS,
  getProviderConfig,
  providerStatus,
} from "../server/provider-config";
import {
  evaluate,
  validateResult,
  ProviderError,
  providerErrorMessage,
} from "../server/provider";
import { updateConfiguration, saveConfiguration } from "../scripts/setup";
import { analyze, buildRequest } from "../server/analysis";
import type { AnalysisRequest } from "../shared/types";

const payload = {
  state: { message: "Synthetic connection test" },
  questions: {
    mood: {
      type: "choice" as const,
      instructions: "Pick a mood",
      criteria: { happy: null, sad: null },
    },
    quality: {
      type: "score" as const,
      instructions: "Rate quality",
      criteria: ["low", "mid", "high"] as const,
    },
    clear: {
      type: "noul" as const,
      instructions: "Is it clear?",
      criteria: { true: "clear", false: "unclear" },
    },
  },
};
const fixture = {
  model: "jev-1.13.0",
  answers: {
    mood: {
      type: "choice",
      choice: "happy",
      confidence: 0.6,
      probabilities: { happy: 0.8, sad: 0.2 },
    },
    quality: {
      type: "score",
      score: 1.8,
      confidence: 0.7,
      probabilities: { "0": 0, "1": 0.2, "2": 0.8 },
    },
    clear: { type: "noul", noul: 0.95 },
  },
  usage: { input_tokens: 100, output_tokens: 50 },
};

test("旧 TypeSafe Key 继续可用，切平台不借用旧 Key", () => {
  assert.equal(
    getProviderConfig({ TYPESAFE_API_KEY: "old-key" }).provider,
    "typesafe",
  );
  assert.throws(
    () =>
      getProviderConfig({
        JEV_PROVIDER: "vercel",
        TYPESAFE_API_KEY: "old-key",
      }),
    /API Key/,
  );
  assert.equal(
    getProviderConfig({
      JEV_PROVIDER: "vercel",
      AI_GATEWAY_API_KEY: "gateway-key",
    }).apiKey,
    "gateway-key",
  );
  assert.equal(
    getProviderConfig({
      JEV_PROVIDER: "openrouter",
      OPENROUTER_API_KEY: "router-key",
    }).apiKey,
    "router-key",
  );
  assert.equal(
    getProviderConfig({
      JEV_PROVIDER: " VERCEL ",
      JEV_API_KEY: " current-key ",
      TYPESAFE_API_KEY: "old-key",
    }).apiKey,
    "current-key",
  );
});

test("拼错平台、空 Key、占位符和粘贴整行配置提前报错；健康状态不含 Key", () => {
  for (const provider of ["typo", "__proto__", "cloudflare", "netlify"])
    assert.throws(
      () =>
        getProviderConfig({ JEV_PROVIDER: provider, JEV_API_KEY: "test-key" }),
      /Unsupported/,
    );
  for (const key of [
    "",
    "your_api_key",
    "Bearer test-key",
    "JEV_API_KEY=test-key",
    "key\nother",
    "'key'",
  ])
    assert.equal(providerStatus({ JEV_API_KEY: key }).configured, false);
  assert.throws(
    () =>
      getProviderConfig({
        JEV_PROVIDER: "vercel",
        JEV_API_KEY: "sk-or-example",
      }),
    /OpenRouter/,
  );
  assert.deepEqual(
    providerStatus({
      JEV_PROVIDER: "openrouter",
      JEV_API_KEY: "secret-test-value",
    }),
    { configured: true, provider: "openrouter", model: "typesafe/jev-1.13" },
  );
});

for (const provider of ["typesafe", "vercel", "openrouter"] as const) {
  test(`${provider} 路由、认证、三种判断和概率保真`, async () => {
    const config = getProviderConfig({
      JEV_PROVIDER: provider,
      JEV_API_KEY: "test-only-key",
    });
    let calls = 0;
    const mock: typeof fetch = async (url, options) => {
      calls++;
      assert.equal(url, PROVIDERS[provider].endpoint);
      assert.equal(options?.redirect, "error");
      assert.equal(
        new Headers(options?.headers).get("authorization"),
        "Bearer test-only-key",
      );
      assert.deepEqual(JSON.parse(String(options?.body)), {
        ...payload,
        model: config.model,
      });
      assert.ok(options?.signal);
      return Response.json(fixture);
    };
    const result = await evaluate(payload, undefined, config, mock);
    assert.deepEqual(result, fixture);
    assert.equal(calls, 1);
  });
}

test("网关缺少确定度、概率、答案或返回错误分类时拒绝评分", () => {
  const changes = [
    (f: any) => delete f.answers.mood.confidence,
    (f: any) => delete f.answers.mood.probabilities.sad,
    (f: any) => delete f.answers.clear,
    (f: any) => {
      f.answers.clear.type = "boolean";
    },
    (f: any) => {
      f.answers.mood.choice = "unknown";
    },
    (f: any) => {
      f.answers.quality.score = 4;
    },
    (f: any) => {
      f.answers.mood.probabilities.happy = 0;
    },
    (f: any) => {
      f.answers.clear.noul = 1.1;
    },
  ];
  for (const change of changes) {
    const broken = structuredClone(fixture);
    change(broken);
    assert.throws(
      () => validateResult(broken, payload.questions),
      /Incomplete model response/,
    );
  }
});

test("401/402/403 不重试且不透出上游正文或 Key", async () => {
  const config = getProviderConfig({ JEV_API_KEY: "test-only-key" });
  for (const status of [401, 402, 403]) {
    let calls = 0;
    await assert.rejects(
      evaluate(payload, undefined, config, async () => {
        calls++;
        return new Response("private-chat-or-key", { status });
      }),
      (e: unknown) =>
        e instanceof ProviderError &&
        e.status === status &&
        !e.message.includes("private-chat-or-key"),
    );
    assert.equal(calls, 1);
  }
  assert.ok(
    !providerErrorMessage(new Error("private-chat-or-key")).includes(
      "private-chat-or-key",
    ),
  );
});

test("Vercel 真实账号验证错误明确提示绑卡，不误报 Key 错误或回显正文", async () => {
  const config = getProviderConfig({
    JEV_PROVIDER: "vercel",
    JEV_API_KEY: "test-only-key",
  });
  await assert.rejects(
    evaluate(payload, undefined, config, async () =>
      Response.json(
        {
          error: {
            type: "customer_verification_required",
            message: "private-upstream-text",
          },
        },
        { status: 403 },
      ),
    ),
    (error: unknown) =>
      error instanceof ProviderError &&
      error.status === 403 &&
      error.message.includes("绑定有效信用卡") &&
      !error.message.includes("private-upstream-text"),
  );
});

test("短暂限流只重试一次；较长 Retry-After 直接交还调用方", async () => {
  const config = getProviderConfig({ JEV_API_KEY: "test-only-key" });
  let calls = 0;
  await evaluate(payload, undefined, config, async () =>
    ++calls === 1
      ? new Response("", { status: 429, headers: { "Retry-After": "0" } })
      : Response.json(fixture),
  );
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(
    evaluate(payload, undefined, config, async () => {
      calls++;
      return new Response("", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }),
    (e: unknown) => e instanceof ProviderError && e.status === 429,
  );
  assert.equal(calls, 1);
});

test("取消不会发请求，非 JSON 成功响应不成为分析结果", async () => {
  const config = getProviderConfig({ JEV_API_KEY: "test-only-key" });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    evaluate(payload, controller.signal, config, async () => {
      assert.fail("must not fetch");
    }),
  );
  await assert.rejects(
    evaluate(
      payload,
      undefined,
      config,
      async () => new Response("<html>error</html>"),
    ),
    /Invalid response/,
  );
});

test("持续服务失败最多两次，不切换平台；重试等待可以取消", async () => {
  const config = getProviderConfig({
    JEV_PROVIDER: "openrouter",
    JEV_API_KEY: "test-only-key",
  });
  let calls = 0;
  await assert.rejects(
    evaluate(payload, undefined, config, async (url) => {
      calls++;
      assert.equal(url, PROVIDERS.openrouter.endpoint);
      return new Response("", { status: 503, headers: { "Retry-After": "0" } });
    }),
    (error: unknown) => error instanceof ProviderError && error.status === 503,
  );
  assert.equal(calls, 2);
  const controller = new AbortController();
  calls = 0;
  await assert.rejects(
    evaluate(payload, controller.signal, config, async () => {
      calls++;
      controller.abort();
      return new Response("", { status: 429, headers: { "Retry-After": "1" } });
    }),
  );
  assert.equal(calls, 1);
});

test("配置更新保留端口、注释和其他变量；重复运行不会重复键", async () => {
  const previous =
    "# My config\r\nPORT=4321\r\nHOST=127.0.0.1\r\nTYPESAFE_API_KEY=legacy-key\r\nEXTRA=value\r\nexport JEV_PROVIDER=typesafe\r\nJEV_API_KEY=old-key\r\n";
  const text = updateConfiguration(previous, "openrouter", "sk-or-test-key");
  assert.equal(updateConfiguration(text, "openrouter", "sk-or-test-key"), text);
  assert.equal((text.match(/^JEV_API_KEY=/gm) || []).length, 1);
  assert.ok(text.includes("# My config"));
  assert.equal(parse(text).PORT, "4321");
  assert.equal(parse(text).EXTRA, "value");
  assert.equal(getProviderConfig(parse(text)).provider, "openrouter");
  assert.equal(getProviderConfig(parse(text)).apiKey, "sk-or-test-key");
  const folder = await mkdtemp(join(tmpdir(), "crush-setup-"));
  try {
    const file = join(folder, ".env");
    await saveConfiguration(file, text);
    await saveConfiguration(file, text);
    assert.equal(await readFile(file, "utf8"), text);
    if (process.platform !== "win32")
      assert.equal((await stat(file)).mode & 0o777, 0o600);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("三平台贯通总览、对方情绪意图、我方评级，使用同一评分规则", async (t) => {
  const originalFetch = globalThis.fetch;
  const previous = {
    provider: process.env.JEV_PROVIDER,
    key: process.env.JEV_API_KEY,
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previous.provider === undefined) delete process.env.JEV_PROVIDER;
    else process.env.JEV_PROVIDER = previous.provider;
    if (previous.key === undefined) delete process.env.JEV_API_KEY;
    else process.env.JEV_API_KEY = previous.key;
  });
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(String(options?.body));
    const answers = Object.fromEntries(
      Object.entries(request.questions).map(([id, value]) => {
        const q = value as { type: string; criteria: Record<string, unknown> };
        if (q.type === "noul") return [id, { type: "noul", noul: 0.1 }];
        const keys = Object.keys(q.criteria);
        const probabilities = Object.fromEntries(
          keys.map((key, i) => [key, i === 0 ? 1 : 0]),
        );
        return [
          id,
          {
            type: q.type,
            confidence: 1,
            probabilities,
            ...(q.type === "choice" ? { choice: keys[0] } : { score: 0 }),
          },
        ];
      }),
    );
    return Response.json({
      model: request.model,
      answers,
      usage: fixture.usage,
    });
  };
  for (const task of ["overview", "other_messages", "self_message"] as const) {
    const request: AnalysisRequest = {
      revision: 1,
      relation: "crush",
      task,
      targetIds:
        task === "overview" ? [] : [task === "other_messages" ? "m1" : "m2"],
      messages: [
        {
          id: "m1",
          sender: "other",
          text: "今天怎么样？",
          timestamp: null,
          kind: "text",
        },
        {
          id: "m2",
          sender: "self",
          text: "挺好的，你呢？",
          timestamp: null,
          kind: "text",
        },
      ],
    };
    assert.ok(Object.keys(buildRequest(request).questions).length > 0);
    const results = [];
    for (const provider of ["typesafe", "vercel", "openrouter"]) {
      process.env.JEV_PROVIDER = provider;
      process.env.JEV_API_KEY = "test-only-key";
      const { model, latencyMs, ...result } = await analyze(request);
      assert.ok(model);
      results.push(result);
    }
    assert.deepEqual(results[0], results[1]);
    assert.deepEqual(results[0], results[2]);
  }
});
