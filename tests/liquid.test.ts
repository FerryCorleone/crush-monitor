import { test } from "node:test";
import assert from "node:assert/strict";
import type { Questions } from "@typesafe-ai/sdk";
import { compileLiquidRequest, liquidConfig } from "../server/liquid";
import {
  activeConfig,
  configFingerprint,
  parseSettings,
  settingsConfig,
} from "../server/model-config";
import { evaluate, checkProvider, ProviderError } from "../server/provider";
import { analyze, buildRequest } from "../server/analysis";

const settings = {
  preset: "liquid",
  protocol: "systemone" as const,
  baseUrl: "https://api.liquid.ai/decisions/v1",
  model: "d1-ultra",
  apiKey: "test-only-liquid-key",
  jsonMode: false,
};
const config = settingsConfig(settings);
const payload = {
  state: { message: "Synthetic blue square" },
  questions: {
    color: {
      type: "choice" as const,
      instructions: { question: "Color?", continuation: ["blue"] },
      criteria: { blue: null, red: "red" },
    },
    quality: {
      type: "score" as const,
      instructions: "Clarity?",
      criteria: ["low", "mid", "high"] as const,
    },
    clear: { type: "noul" as const, instructions: "Clear?" },
  },
};
const fixture = {
  model: "d1-ultra",
  answers: {
    color: {
      type: "choice",
      choice: "blue",
      confidence: 0.63,
      probabilities: { blue: 0.8, red: 0.2 },
    },
    quality: {
      type: "score",
      score: 1.7,
      confidence: 0.71,
      probabilities: { "0": 0.1, "1": 0.1, "2": 0.8 },
    },
    clear: { type: "noul", noul: 0.9 },
  },
  usage: { input_tokens: 123, output_tokens: 0 },
};

test("Liquid fixes its own endpoint/model, normalizes native text only in its adapter and preserves scores", async () => {
  assert.equal(config.endpoint, "https://api.liquid.ai/decisions/v1/systemone");
  assert.equal(parseSettings({ ...settings, model: "typo" }).model, "d1-ultra");
  for (const change of [
    { apiKey: "" },
    { preset: "custom" },
    { protocol: "decisions" },
    { baseUrl: "https://evil.example" },
  ])
    assert.throws(() => parseSettings({ ...settings, ...change }));
  const before = structuredClone(payload);
  const result = await evaluate(
    payload,
    undefined,
    config,
    async (url, options) => {
      assert.equal(url, config.endpoint);
      assert.equal(options?.redirect, "error");
      assert.equal(
        new Headers(options?.headers).get("authorization"),
        "Bearer test-only-liquid-key",
      );
      assert.ok(options?.signal);
      const body = JSON.parse(String(options?.body));
      assert.equal(body.model, "d1-ultra");
      assert.equal(body.state, JSON.stringify(payload.state));
      assert.equal(
        body.questions.color.instructions,
        JSON.stringify(payload.questions.color.instructions),
      );
      assert.deepEqual(body.questions.color.criteria, {
        blue: "blue",
        red: "red",
      });
      assert.deepEqual(body.questions.quality.criteria, ["low", "mid", "high"]);
      return Response.json(fixture);
    },
  );
  assert.deepEqual(payload, before);
  assert.deepEqual(result, fixture);
  assert.notEqual(
    configFingerprint(config),
    configFingerprint(
      settingsConfig({
        ...settings,
        preset: "typesafe",
        protocol: "jev",
        baseUrl: "",
      }),
    ),
  );
  assert.equal(
    configFingerprint(config),
    configFingerprint(liquidConfig("different-test-key")),
  );
});

test("Liquid environment selection never falls back to a Jev or OpenAI key", (t) => {
  const old = { ...process.env };
  t.after(() => {
    process.env = old;
  });
  process.env.CRUSH_PROVIDER = "liquid";
  process.env.JEV_API_KEY = "other-provider-key";
  process.env.OPENAI_API_KEY = "another-provider-key";
  delete process.env.LIQUID_API_KEY;
  assert.throws(() => activeConfig(), /Liquid API key required/);
  process.env.LIQUID_API_KEY = "test-only-liquid-key";
  assert.equal(activeConfig().provider, "liquid");
  process.env.CRUSH_PROVIDER = "typo";
  assert.throws(() => activeConfig(), /CRUSH_PROVIDER/);
});

test("Liquid rejects incomplete, unexpected and out-of-range native responses without fabricating values", async () => {
  for (const change of [
    (r: any) => delete r.answers.color.confidence,
    (r: any) => delete r.answers.clear,
    (r: any) => delete r.answers.color.probabilities.red,
    (r: any) => (r.answers.color.choice = "unknown"),
    (r: any) => (r.answers.color.confidence = 2),
    (r: any) => (r.answers.quality.score = 3),
    (r: any) => (r.answers.clear.noul = -0.1),
    (r: any) => (r.answers.color.probabilities.blue = 0.1),
    (r: any) => (r.answers.extra = r.answers.clear),
    (r: any) => (r.model = "another-model"),
  ]) {
    const raw = structuredClone(fixture);
    change(raw);
    await assert.rejects(
      evaluate(payload, undefined, config, async () => Response.json(raw)),
      ProviderError,
    );
  }
});

test("Liquid authentication and balance errors do not retry or echo bodies; transient retries are bounded and cancellable", async () => {
  for (const status of [401, 402, 403]) {
    let calls = 0;
    await assert.rejects(
      evaluate(payload, undefined, config, async () => {
        calls++;
        return new Response("private-body test-only-liquid-key", { status });
      }),
      (e: any) =>
        e instanceof ProviderError &&
        e.status === status &&
        !/private-body|test-only-liquid-key/.test(e.message),
    );
    assert.equal(calls, 1);
  }
  for (const status of [429, 503]) {
    let calls = 0;
    await assert.rejects(
      evaluate(payload, undefined, config, async () => {
        calls++;
        return new Response("", { status, headers: { "retry-after": "0" } });
      }),
      ProviderError,
    );
    assert.equal(calls, 2);
  }
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(
    evaluate(payload, controller.signal, config, async () => {
      calls++;
      setTimeout(() => controller.abort(), 5);
      return new Response("", { status: 429, headers: { "retry-after": "1" } });
    }),
  );
  assert.equal(calls, 1);
  await assert.rejects(
    evaluate(payload, AbortSignal.abort(), config, async () => {
      assert.fail("cancelled request must not fetch");
    }),
  );
  const expired = new DOMException("test timeout", "TimeoutError");
  await assert.rejects(
    evaluate(payload, undefined, config, async (_url, opts) => {
      assert.ok(opts?.signal);
      throw expired;
    }),
    (e) => e === expired,
  );
});

export function nativeFixture(body: { model: string; questions: Questions }) {
  return {
    model: body.model,
    usage: { input_tokens: 10, output_tokens: 0 },
    answers: Object.fromEntries(
      Object.entries(body.questions).map(([id, q]) => [
        id,
        q.type === "noul"
          ? { type: "noul", noul: 0.1 }
          : {
              type: q.type,
              confidence: 1,
              probabilities: Object.fromEntries(
                Object.keys(q.criteria).map((key, i) => [key, i === 0 ? 1 : 0]),
              ),
              ...(q.type === "choice"
                ? { choice: Object.keys(q.criteria)[0] }
                : { score: 0 }),
            },
      ]),
    ),
  };
}

test("Liquid probe and all application flows use native judgments; each self reply excludes future messages", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async (_url, options) =>
    Response.json(nativeFixture(JSON.parse(String(options?.body))));
  assert.equal((await checkProvider(config)).model, "d1-ultra");
  const messages = [
    {
      id: "m1",
      sender: "other" as const,
      text: "虚构样本：周末一起看展吗？",
      timestamp: null,
      kind: "text" as const,
    },
    {
      id: "m2",
      sender: "self" as const,
      text: "好呀，上午可以吗？",
      timestamp: null,
      kind: "text" as const,
    },
    {
      id: "m3",
      sender: "self" as const,
      text: "FUTURE-REPLY",
      timestamp: null,
      kind: "text" as const,
    },
    {
      id: "m4",
      sender: "other" as const,
      text: "FUTURE-ANSWER",
      timestamp: null,
      kind: "text" as const,
    },
  ];
  for (const task of ["overview", "other_messages", "self_message"] as const) {
    const input = {
      revision: 1,
      relation: "crush" as const,
      task,
      messages,
      targetIds:
        task === "overview" ? [] : [task === "other_messages" ? "m1" : "m2"],
    };
    const body = compileLiquidRequest(buildRequest(input));
    if (task === "self_message")
      assert.ok(!JSON.stringify(body).includes("FUTURE"));
    const result = await analyze(input, undefined, config);
    assert.equal(result.model, "d1-ultra");
    if (task === "overview") assert.ok(result.overview);
    else assert.ok(result.lines?.length);
  }
  const body = compileLiquidRequest(
    buildRequest({
      revision: 1,
      relation: "crush",
      task: "self_message",
      messages,
      targetIds: ["m2", "m3"],
    }),
  );
  assert.ok(!body.state.includes("FUTURE"));
  assert.ok(!body.questions.m2_score.instructions.includes("FUTURE"));
  assert.ok(body.questions.m3_score.instructions.includes("FUTURE-REPLY"));
  assert.ok(!JSON.stringify(body).includes("FUTURE-ANSWER"));
});
