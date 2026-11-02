import { test } from "node:test";
import assert from "node:assert/strict";
import type { Questions } from "@typesafe-ai/sdk";
import { getProviderConfig } from "../server/provider-config";
import {
  parseSettings,
  settingsConfig,
  configFingerprint,
  saveSettings,
  readSettings,
} from "../server/model-config";
import { evaluate, ProviderError } from "../server/provider";
import {
  compileStartluxRequest,
  planStartluxBatches,
} from "../server/startlux";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const settings = {
  preset: "startlux",
  protocol: "jev" as const,
  baseUrl: "",
  model: "user-typo",
  apiKey: "test-only-key",
  jsonMode: false,
};
const config = settingsConfig(settings);
const quality: Questions[string] = {
  type: "score",
  instructions: "回复质量？",
  criteria: ["低", "中", "高"],
};

test("StartLux uses a fixed native endpoint/model, persists thinking mode, and never borrows another provider's key", async () => {
  assert.equal(config.endpoint, "https://api.bamboonode.dev/v1/decisions");
  assert.equal(config.model, "startlux-decision-27b-autothink");
  assert.equal(parseSettings(settings).thinkMode, "auto");
  assert.throws(() =>
    getProviderConfig({
      JEV_PROVIDER: "startlux",
      TYPESAFE_API_KEY: "other-key",
    }),
  );
  assert.throws(() =>
    getProviderConfig({
      JEV_PROVIDER: "startlux",
      BAMBOO_API_KEY: "test-only-key",
      STARTLUX_THINK_MODE: "always",
    }),
  );
  assert.throws(() => parseSettings({ ...settings, thinkMode: "instant" }));
  const fast = settingsConfig({ ...settings, thinkMode: "never" });
  assert.notEqual(configFingerprint(config), configFingerprint(fast));
  assert.equal(
    configFingerprint(config),
    configFingerprint(settingsConfig({ ...settings, apiKey: "new-key" })),
  );
  const dir = await mkdtemp(join(tmpdir(), "crush-startlux-"));
  try {
    const file = join(dir, "model.json");
    saveSettings({ ...settings, thinkMode: "never" }, file);
    assert.equal(readSettings(file)?.thinkMode, "never");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("StartLux bounds candidate work and physically isolates reply continuations", () => {
  const qs: Questions = Object.fromEntries(
    Array.from({ length: 37 }, (_, i) => [`q${i}`, quality]),
  );
  const batches = planStartluxBatches(qs);
  assert.equal(batches.length, 4);
  assert.ok(batches.every((b) => Object.keys(b).length <= 12));
  const big: Questions = Object.fromEntries(
    Array.from({ length: 5 }, (_, i) => [
      `c${i}`,
      {
        type: "choice",
        instructions: "选项？",
        criteria: Object.fromEntries(
          Array.from({ length: 201 }, (_, j) => [`e${j}`, null]),
        ),
      },
    ]),
  );
  assert.equal(planStartluxBatches(big).length, 5);
  const isolated = planStartluxBatches({
    early: {
      ...quality,
      instructions: { question: "质量？", continuation: ["第一句"] },
    },
    late: {
      ...quality,
      instructions: { question: "质量？", continuation: ["第一句", "第二句"] },
    },
  });
  assert.equal(isolated.length, 2);
  const wire = compileStartluxRequest(
    { state: {}, questions: isolated[0] },
    "never",
  );
  assert.equal(wire.think_mode, "never");
  assert.equal(wire.none_check, false);
  assert.equal(wire.allow_none, false);
  assert.equal(wire.return_thought, false);
  assert.ok(JSON.stringify(wire).includes("第一句"));
  assert.ok(!JSON.stringify(wire).includes("第二句"));
  assert.throws(
    () =>
      compileStartluxRequest({
        state: "x",
        questions: {
          invalid: {
            type: "score",
            instructions: "x",
            // Deliberately exceed the SDK's score-level type for runtime validation.
            criteria: Array(11).fill("x") as never,
          },
        },
      }),
    ProviderError,
  );
});

test("StartLux preserves native fractional scores/confidence, sums usage, limits concurrency and honours cancellation", async () => {
  const questions: Questions = Object.fromEntries(
    Array.from({ length: 37 }, (_, i) => [`q${i}`, quality]),
  );
  let calls = 0,
    active = 0,
    max = 0;
  const mock: typeof fetch = async (url, options) => {
    assert.equal(url, config.endpoint);
    const body = JSON.parse(String(options?.body));
    assert.equal(
      new Headers(options?.headers).get("authorization"),
      "Bearer test-only-key",
    );
    assert.ok(!("messages" in body) && !("input" in body));
    calls++;
    active++;
    max = Math.max(max, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return Response.json({
      model: body.model,
      usage: { input_tokens: 123, output_tokens: 7 },
      answers: Object.fromEntries(
        Object.keys(body.questions).map((id) => [
          id,
          {
            type: "score",
            score: 1.7,
            confidence: 0.63,
            probabilities: { 0: 0.1, 1: 0.1, 2: 0.8 },
          },
        ]),
      ),
    });
  };
  const r = await evaluate(
    { state: "synthetic", questions },
    undefined,
    config,
    mock,
  );
  assert.equal(calls, 4);
  assert.equal(max, 2);
  assert.equal(Object.keys(r.answers).length, 37);
  assert.deepEqual(r.usage, { input_tokens: 492, output_tokens: 28 });
  assert.deepEqual(r.answers.q0, {
    type: "score",
    score: 1.7,
    confidence: 0.63,
    probabilities: { 0: 0.1, 1: 0.1, 2: 0.8 },
  });
  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(
    evaluate({ state: "x", questions }, cancelled.signal, config, mock),
  );
  assert.equal(calls, 4);
  const during = new AbortController();
  const pending = evaluate(
    { state: "x", questions: { q: quality } },
    during.signal,
    config,
    async (_url, options) =>
      new Promise((_resolve, reject) => {
        options!.signal!.addEventListener(
          "abort",
          () => reject(options!.signal!.reason),
          { once: true },
        );
        during.abort();
      }),
  );
  await assert.rejects(pending);
});

test("StartLux rejects incomplete/null responses, cancels sibling batches and never exposes upstream content", async () => {
  const questions: Questions = Object.fromEntries(
    Array.from({ length: 13 }, (_, i) => [`q${i}`, quality]),
  );
  let calls = 0,
    aborted = false;
  const mock: typeof fetch = async (_url, options) => {
    calls++;
    if (calls === 1)
      return Response.json({
        model: config.model,
        answers: {},
        usage: { input_tokens: 1, output_tokens: 0 },
      });
    return new Promise((_resolve, reject) => {
      options!.signal!.addEventListener(
        "abort",
        () => {
          aborted = true;
          reject(options!.signal!.reason);
        },
        { once: true },
      );
    });
  };
  await assert.rejects(
    evaluate({ state: "x", questions }, undefined, config, mock),
    ProviderError,
  );
  assert.equal(calls, 2);
  assert.equal(aborted, true);
  let failures = 0;
  await assert.rejects(
    evaluate(
      { state: "x", questions: { q: quality } },
      undefined,
      config,
      async () => {
        failures++;
        return new Response("test-only-key private-chat", { status: 401 });
      },
    ),
    (e: unknown) =>
      e instanceof ProviderError &&
      e.status === 401 &&
      !e.message.includes("test-only-key"),
  );
  assert.equal(failures, 1);
  await assert.rejects(
    evaluate(
      {
        state: "x",
        questions: {
          q: {
            type: "choice",
            instructions: "x",
            criteria: { yes: null, no: null },
          },
        },
      },
      undefined,
      config,
      async () =>
        Response.json({
          model: config.model,
          answers: {
            q: {
              type: "choice",
              choice: null,
              confidence: 0.1,
              probabilities: { yes: 0.5, no: 0.5 },
            },
          },
          usage: { input_tokens: 1, output_tokens: 0 },
        }),
    ),
    ProviderError,
  );
});
