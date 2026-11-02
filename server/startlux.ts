import type { Questions, SystemOneRequest } from "@typesafe-ai/sdk";
import { ProviderError } from "./provider";

// Native contract: bamboonode.dev/docs/ai-model/decisions/startlux and
// github.com/StartLuxLabs/StartLux-Decision/blob/main/docs/api.md.
export function compileStartluxRequest(
  payload: SystemOneRequest<Questions>,
  thinkMode: "auto" | "never" = "auto",
) {
  const questions = Object.fromEntries(
    Object.entries(payload.questions).map(([id, q]) => {
      if (q.type !== "noul") {
        const count = Object.keys(q.criteria).length;
        if (count < 2 || count > (q.type === "score" ? 10 : 255))
          throw new ProviderError(
            400,
            "StartLux 分类须有 2–255 个选项，评分须有 2–10 档。",
          );
      }
      return [
        id,
        {
          ...q,
          instructions:
            typeof q.instructions === "string"
              ? q.instructions
              : JSON.stringify(q.instructions),
        },
      ];
    }),
  );
  return {
    state: payload.state,
    questions,
    model: "startlux-decision-27b-autothink",
    think_mode: thinkMode,
    // Our taxonomies already contain unknown/neutral choices. Do not add a
    // hidden candidate or accept null decisions in place of complete results.
    none_check: false,
    allow_none: false,
    return_thought: false,
  };
}

// Application limits, not upstream maxima. Keep continuation evidence separate
// so a reply's grade cannot see other replies that have not happened yet.
export function planStartluxBatches(questions: Questions): Questions[] {
  const groups = new Map<string, [string, Questions[string]][]>();
  for (const entry of Object.entries(questions)) {
    const instructions = entry[1].instructions;
    const key =
      instructions &&
      typeof instructions === "object" &&
      !Array.isArray(instructions) &&
      "continuation" in instructions
        ? JSON.stringify(instructions.continuation)
        : "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  const batches: Questions[] = [];
  for (const group of groups.values()) {
    let batch: typeof group = [],
      cells = 0;
    for (const entry of group) {
      const size =
        entry[1].type === "noul" ? 1 : Object.keys(entry[1].criteria).length;
      if (batch.length >= 12 || (batch.length && cells + size > 360)) {
        batches.push(Object.fromEntries(batch));
        batch = [];
        cells = 0;
      }
      batch.push(entry);
      cells += size;
    }
    if (batch.length) batches.push(Object.fromEntries(batch));
  }
  return batches;
}
