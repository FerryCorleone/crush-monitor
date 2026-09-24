import { test } from "node:test";
import assert from "node:assert/strict";
import { currentAction } from "../shared/action";
import { overviewJob } from "../shared/incremental";
import { buildRequest } from "../server/analysis";
import type { Message, Overview } from "../shared/types";

const messages: Message[] = [
  {
    id: "invite",
    sender: "self",
    text: "周六一起吃饭吗？",
    timestamp: null,
    kind: "text",
  },
  {
    id: "accept",
    sender: "other",
    text: "好呀，你订位置吧",
    timestamp: null,
    kind: "text",
  },
  {
    id: "booked",
    sender: "self",
    text: "订好了，六点见",
    timestamp: null,
    kind: "text",
  },
  {
    id: "tired",
    sender: "other",
    text: "今天加班好累",
    timestamp: null,
    kind: "text",
  },
  {
    id: "sleep",
    sender: "other",
    text: "我要睡觉了，明天聊",
    timestamp: null,
    kind: "text",
  },
];
const overview: Overview = {
  action: "continue",
  actionAnchorId: "accept",
  actionEvidenceId: "accept",
  evidenceId: null,
  stage: "flow",
  affinity: { value: 60, confidence: 0.8, status: "clear", probabilities: {} },
};

test("追加消息后总览包含最新结尾，行动引用仍允许近期和历史原话", () => {
  const before = buildRequest(
    overviewJob(messages.slice(0, 2), "crush", 1, {}),
  );
  const after = buildRequest(overviewJob(messages, "crush", 2, {}));
  assert.equal(before.state.conversationEnd?.text, "好呀，你订位置吧");
  assert.equal(after.state.conversationEnd?.text, "我要睡觉了，明天聊");
  assert.deepEqual(
    Object.keys(
      (after.questions.actionEvidence as { criteria: object }).criteria,
    ).sort(),
    ["0", "1", "2", "3", "4", "none"],
  );
  assert.ok(after.state.messages.some((m) => m.text === "周六一起吃饭吗？"));
});

test("很久以前仍相关的边界保留为背景和行动引用候选", () => {
  const all: Message[] = Array.from({ length: 150 }, (_, i) => ({
    id: `m${i}`,
    sender: i % 2 ? "self" : "other",
    text: "日常聊天",
    timestamp: null,
    kind: "text",
  }));
  all[0].text = "只做朋友，请不要追我";
  const req = buildRequest(
    overviewJob(all, "crush", 2, {
      m0: { id: "m0", kind: "boundary", confidence: 0.9, status: "active" },
    }),
  );
  assert.ok(req.state.historicalEvidence?.some((e) => e.sourceId === "0"));
  const options = Object.keys(
    (req.questions.actionEvidence as { criteria: object }).criteria,
  );
  assert.ok(options.includes("0"));
  assert.equal(req.state.conversationEnd?.sender, "self");
});

test("更新中、失败、旧缓存和不匹配的消息结尾都不能显示为当前建议", () => {
  assert.equal(currentAction(overview, messages.slice(0, 2), true), overview);
  assert.equal(currentAction(overview, messages, false), null);
  assert.equal(currentAction(overview, messages, true), null);
  assert.equal(
    currentAction(
      { ...overview, actionAnchorId: undefined },
      messages.slice(0, 2),
      true,
    ),
    null,
  );
  assert.equal(currentAction(overview, [], true), null);
  const updated = {
    ...overview,
    action: "close",
    actionAnchorId: "sleep",
    actionEvidenceId: "sleep",
  };
  assert.equal(currentAction(updated, messages, true), updated);
  assert.equal(currentAction(updated, messages, false), null);
});
