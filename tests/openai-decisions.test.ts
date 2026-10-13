import { test } from "node:test";
import assert from "node:assert/strict";
import type { Questions } from "@typesafe-ai/sdk";
import {
  compileDecisionsRequest,
  decodeDecisions,
  planDecisionsBatches,
} from "../server/openai-decisions";
import { evaluate, ProviderError } from "../server/provider";
import {
  settingsConfig,
  parseSettings,
  configFingerprint,
} from "../server/model-config";
import { analyze, buildRequest } from "../server/analysis";

const settings = {
  preset: "openai-decisions",
  protocol: "decisions" as const,
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-6-luna",
  apiKey: "test-only-key",
  jsonMode: false,
};
const config = settingsConfig(settings);
const questions: Questions = {
  emotion: {
    type: "choice",
    instructions: { question: "情绪？", continuation: ["合成测试"] },
    criteria: { happy: "开心", sad: "难过" },
  },
  quality: {
    type: "score",
    instructions: "回复质量？",
    criteria: ["低", "中", "高"],
  },
  enough: {
    type: "noul",
    instructions: "证据够吗？",
    criteria: { true: "清楚", false: "不清楚" },
  },
};
const wire = compileDecisionsRequest({
  state: { messages: ["合成测试"] },
  questions,
});
const response = {
  model: "gpt-6-luna",
  usage: { input_tokens: 123, output_tokens: 0 },
  answers: [
    {
      name: "q0",
      type: "choice",
      choice: "happy",
      confidence: 0.63,
      probabilities: [
        { value: "happy", probability: 0.8 },
        { value: "sad", probability: 0.2 },
      ],
    },
    {
      name: "q1",
      type: "score",
      score: 1.7,
      confidence: 0.71,
      probabilities: [
        { value: 0, label: "0", probability: 0.1 },
        { value: 1, label: "1", probability: 0.1 },
        { value: 2, label: "2", probability: 0.8 },
      ],
    },
    { name: "q2", type: "predicate", probability: 0.9 },
  ],
};

test("Decisions uses the dedicated official endpoint and a fixed model, not Chat Completions", () => {
  assert.equal(config.endpoint, "https://api.openai.com/v1/decisions");
  assert.equal(
    parseSettings({ ...settings, model: "user-typo" }).model,
    "gpt-6-luna",
  );
  assert.throws(() =>
    parseSettings({ ...settings, baseUrl: "https://evil.example/v1" }),
  );
  assert.throws(() => parseSettings({ ...settings, preset: "custom" }));
  assert.throws(() => parseSettings({ ...settings, apiKey: "" }));
  assert.equal(
    configFingerprint(config),
    configFingerprint(
      settingsConfig({ ...settings, apiKey: "another-test-key" }),
    ),
  );
  assert.notEqual(
    configFingerprint(config),
    configFingerprint(
      settingsConfig({ ...settings, preset: "openai", protocol: "openai" }),
    ),
  );
  assert.equal(wire.model, "gpt-6-luna");
  assert.equal(wire.input, JSON.stringify({ messages: ["合成测试"] }));
  assert.deepEqual(
    wire.questions.map((q) => q.type),
    ["choice", "score", "predicate"],
  );
  assert.ok(wire.questions[0].instructions.includes("continuation"));
  assert.ok(wire.questions[2].instructions.includes("不清楚"));
  assert.ok("levels" in wire.questions[1]);
  assert.deepEqual(wire.questions[1].levels, [
    { label: "0", description: "低" },
    { label: "1", description: "中" },
    { label: "2", description: "高" },
  ]);
});

test("Decisions preserves native confidence, full probabilities and fractional scores by name", () => {
  const result = decodeDecisions(
    { ...response, answers: [...response.answers].reverse() },
    questions,
  );
  assert.deepEqual(result.answers.emotion, {
    type: "choice",
    choice: "happy",
    confidence: 0.63,
    probabilities: { happy: 0.8, sad: 0.2 },
  });
  assert.equal((result.answers.quality as any).score, 1.7);
  assert.equal((result.answers.quality as any).confidence, 0.71);
  assert.deepEqual(result.answers.enough, { type: "noul", noul: 0.9 });
  assert.deepEqual(result.usage, { input_tokens: 123, output_tokens: 0 });
});

test("Decisions refuses missing/duplicate/mismatched judgments and never fabricates distributions", () => {
  const variants = [
    (r: any) => r.answers.pop(),
    (r: any) => (r.answers[1].name = "q0"),
    (r: any) => (r.answers[0].name = "q09"),
    (r: any) => (r.answers[0].name = "q99"),
    (r: any) => r.answers[0].probabilities.pop(),
    (r: any) => (r.answers[0].probabilities[1].value = "happy"),
    (r: any) => (r.answers[0].probabilities[1].value = "unknown"),
    (r: any) => (r.answers[1].probabilities[0].label = "高"),
    (r: any) => (r.answers[1].probabilities[0].value = 42),
    (r: any) => (r.answers[0].confidence = 1.1),
    (r: any) => (r.answers[1].score = 42),
    (r: any) => (r.answers[2].probability = -1),
    (r: any) => (r.answers[0].probabilities[0].probability = 0.1),
    (r: any) => (r.answers[0].choice = "unknown"),
  ];
  for (const mutate of variants) {
    const r = structuredClone(response);
    mutate(r);
    assert.throws(() => decodeDecisions(r, questions), ProviderError);
  }
  assert.throws(
    () =>
      decodeDecisions(
        {
          ...response,
          answers: [
            { type: "refusal", name: "q0" },
            ...response.answers.slice(1),
          ],
        },
        questions,
      ),
    /拒绝/,
  );
});

test("Decisions bounds batches and isolates each self-reply continuation", () => {
  const qs: Questions = Object.fromEntries(
    Array.from({ length: 110 }, (_, i) => ["m" + i, questions.quality]),
  );
  const batches = planDecisionsBatches(qs);
  assert.equal(batches.length, 3);
  assert.ok(batches.every((batch) => Object.keys(batch).length <= 48));
  const isolated = planDecisionsBatches({
    early: {
      ...questions.emotion,
      instructions: { question: "表达质量", continuation: ["第一句"] },
    },
    late: {
      ...questions.emotion,
      instructions: {
        question: "表达质量",
        continuation: ["第一句", "第二句"],
      },
    },
  });
  assert.equal(isolated.length, 2);
  assert.ok(
    !JSON.stringify(
      compileDecisionsRequest({ state: {}, questions: isolated[0] }),
    ).includes("第二句"),
  );
  assert.throws(
    () =>
      compileDecisionsRequest({
        state: "x",
        questions: {
          x: { type: "choice", instructions: "x", criteria: { only: null } },
        },
      }),
    /2 至 255/,
  );
});

function mockAnswer(body: any) {
  return {
    model: body.model,
    usage: { input_tokens: 10, output_tokens: 0 },
    answers: body.questions.map((q: any) => {
      if (q.type === "predicate")
        return { type: "predicate", name: q.name, probability: 0.1 };
      if (q.type === "choice")
        return {
          type: "choice",
          name: q.name,
          choice: q.choices[0].value,
          confidence: 1,
          probabilities: q.choices.map((c: any, i: number) => ({
            value: c.value,
            probability: i === 0 ? 1 : 0,
          })),
        };
      return {
        type: "score",
        name: q.name,
        score: 0,
        confidence: 1,
        probabilities: q.levels.map((l: any, i: number) => ({
          value: i,
          label: l.label,
          probability: i === 0 ? 1 : 0,
        })),
      };
    }),
  };
}

test("Decisions transport limits concurrency, aggregates usage, honours cancellation and never retries authentication", async () => {
  let active = 0,
    max = 0,
    calls = 0;
  const mock: typeof fetch = async (url, options) => {
    assert.equal(url, config.endpoint);
    assert.equal(
      new Headers(options?.headers).get("authorization"),
      "Bearer test-only-key",
    );
    const body = JSON.parse(String(options?.body));
    assert.ok(!("messages" in body) && !("max_tokens" in body));
    calls++;
    active++;
    max = Math.max(max, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return Response.json(mockAnswer(body));
  };
  const qs: Questions = Object.fromEntries(
    Array.from({ length: 110 }, (_, i) => ["m" + i, questions.quality]),
  );
  const r = await evaluate(
    { state: "synthetic", questions: qs },
    undefined,
    config,
    mock,
  );
  assert.equal(max, 2);
  assert.equal(calls, 3);
  assert.equal(Object.keys(r.answers).length, 110);
  assert.equal(r.usage.input_tokens, 30);
  const c = new AbortController();
  c.abort();
  await assert.rejects(
    evaluate({ state: "x", questions }, c.signal, config, mock),
  );
  assert.equal(calls, 3);
  let failures = 0;
  await assert.rejects(
    evaluate(
      { state: "x", questions: { enough: questions.enough } },
      undefined,
      config,
      async () => {
        failures++;
        return Response.json(
          { error: "test-only-key and private chat must stay hidden" },
          { status: 401 },
        );
      },
    ),
    (error) =>
      error instanceof ProviderError &&
      error.status === 401 &&
      !error.message.includes("test-only-key"),
  );
  assert.equal(failures, 1);
});

test("Decisions feeds the existing emotion, intent, self-rating and overview pipeline (mock API)", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (_url, options) =>
    Response.json(mockAnswer(JSON.parse(String(options?.body))));
  const messages = [
    {
      id: "m1",
      sender: "other" as const,
      text: "周末一起吃饭吗？",
      timestamp: null,
      kind: "text" as const,
    },
    {
      id: "m2",
      sender: "self" as const,
      text: "好啊，你想吃什么？",
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
    assert.ok(Object.keys(buildRequest(input).questions).length);
    const r = await analyze(input, undefined, config);
    assert.equal(r.model, "gpt-6-luna");
    assert.equal(r.revision, 1);
    if (task === "overview") assert.ok(r.overview);
    else assert.ok(r.lines?.length);
  }
});
