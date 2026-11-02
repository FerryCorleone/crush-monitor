import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInstallHandoff, localAppUrl } from "../shared/install-handoff";
import {
  recommendProvider,
  type ProviderAvailability,
} from "../shared/provider-recommendation";
import { NETWORK_TARGETS, checkNetwork } from "../scripts/check-network";
import { MODEL_PRESETS } from "../shared/model-presets";

function scenario(selected: string | null, uncertain = false) {
  return recommendProvider(
    NETWORK_TARGETS.map(
      (p) =>
        ({
          id: p.id,
          group: p.group,
          name: p.name,
          keyUrl: p.website,
          appChoice: MODEL_PRESETS.find((model) => model.id === p.id)!.name,
          candidate: p.id === selected && !uncertain,
          website: {
            status:
              p.id === selected
                ? uncertain
                  ? "unknown"
                  : "reachable"
                : "restricted",
            httpStatus: p.id === selected ? (uncertain ? undefined : 200) : 451,
            elapsedMs: 1,
          },
          api: {
            status:
              p.id === selected
                ? uncertain
                  ? "unknown"
                  : "auth-required"
                : "restricted",
            httpStatus: p.id === selected ? (uncertain ? undefined : 401) : 451,
            elapsedMs: 1,
          },
        }) satisfies ProviderAvailability,
    ),
  );
}

test("every installation handoff starts with registration and key creation and ends with chat analysis", () => {
  for (const provider of NETWORK_TARGETS) {
    const handoff = buildInstallHandoff(
      scenario(provider.id),
      "http://127.0.0.1:3199/",
    )!;
    assert.equal(handoff.providerId, provider.id);
    assert.match(handoff.steps[0], /上表.*申请链接.*注册/);
    assert.ok(handoff.choices.length >= 3);
    assert.ok(handoff.choices.some((p) => p.domestic));
    for (const choice of handoff.choices) {
      const row = handoff.markdown
        .split("\n")
        .find((line) => line.startsWith(`| ${choice.appChoice} |`))!;
      assert.match(row, /https:\/\/.*注册.*创建/);
      assert.match(row, /当前网络可达|网络待复核|当前网络未连通/);
    }
    const create = handoff.steps.findIndex((step) =>
      /创建并复制|复制生成/.test(step),
    );
    const paste = handoff.steps.findIndex((step) =>
      step.includes("在网页中粘贴 Key"),
    );
    const connect = handoff.steps.findIndex((step) =>
      step.includes("检测连接并保存"),
    );
    assert.ok(create > 0 && create < paste && paste < connect);
    assert.ok(handoff.markdown.includes("http://127.0.0.1:3199/"));
    assert.ok(
      handoff.markdown.includes(
        MODEL_PRESETS.find((p) => p.id === provider.id)!.name,
      ),
    );
    assert.ok(
      !/注意事项|补充说明|下次|停止服务|温馨提示/.test(handoff.markdown),
    );
    assert.ok(
      handoff.markdown.indexOf("| 模型") < handoff.markdown.indexOf("1. "),
    );
    assert.equal(
      (handoff.markdown.match(/^\d+\. /gm) ?? []).length,
      handoff.steps.length,
    );
    assert.ok(
      handoff.markdown.endsWith(
        `${handoff.steps.length}. ${handoff.steps.at(-1)}`,
      ),
    );
    assert.match(handoff.steps.at(-1)!, /聊天记录.*开始分析。$/);
  }
});

test("StartLux remains preferred while Jev and a domestic alternative stay visible with honest network labels", () => {
  const handoff = buildInstallHandoff(scenario("startlux"))!;
  assert.ok(handoff.markdown.includes("https://bamboonode.dev/register"));
  assert.ok(handoff.markdown.includes("https://bamboonode.dev/tokens"));
  assert.ok(handoff.markdown.includes("default"));
  assert.equal(handoff.providerId, "startlux");
  assert.deepEqual(
    handoff.choices.map((p) => p.id),
    ["typesafe", "startlux", "deepseek"],
  );
  assert.deepEqual(
    handoff.choices.map((p) => p.availability),
    ["unavailable", "candidate", "unavailable"],
  );
  assert.ok(handoff.markdown.includes("型号自动配置"));
});

test("shared steps let users choose any listed provider without being forced back to the primary", () => {
  const qwen = buildInstallHandoff(scenario("qwen"))!;
  assert.equal(qwen.providerId, "qwen");
  assert.ok(qwen.markdown.includes("北京"));
  assert.ok(qwen.markdown.includes("等待模型列表出现"));
  assert.ok(qwen.steps.some((step) => step.includes("选择上表对应的平台")));
  assert.ok(!qwen.steps.some((step) => /选择「/.test(step)));
  assert.ok(qwen.markdown.includes("只需申请所选平台的 Key"));
});

test("uncertain recommendations produce no handoff and links cannot embed credentials or external hosts", () => {
  assert.equal(buildInstallHandoff(scenario("typesafe", true)), null);
  assert.equal(buildInstallHandoff(scenario(null)), null);
  for (const url of [
    "",
    "https://example.com/",
    "http://key@localhost/",
    "http://localhost/?key=secret",
    "http://localhost/#secret",
    "http://localhost/api/settings",
  ])
    assert.throws(() => localAppUrl(url), /本机使用地址/);
});

test("network output puts ready-to-use handoff before detailed probes and uses the actual app URL", async () => {
  const report = await checkNetwork(
    async () => new Response(null, { status: 401 }),
    "http://localhost:3199/",
  );
  assert.equal(report.recommendation.primary?.id, "typesafe");
  assert.equal(report.handoff?.providerId, "typesafe");
  assert.ok(report.handoff?.markdown.includes("http://localhost:3199/"));
  const keys = Object.keys(report);
  assert.ok(keys.indexOf("handoff") < keys.indexOf("providers"));
  assert.equal(report.modelCallVerified, false);
});
