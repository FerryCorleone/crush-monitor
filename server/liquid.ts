import type { Questions, SystemOneRequest } from "@typesafe-ai/sdk";
import { ConfigurationError } from "./provider-config";

export const LIQUID_ENDPOINT = "https://api.liquid.ai/decisions/v1/systemone";
export type LiquidConfig = {
  engine: "liquid";
  provider: "liquid";
  name: "Liquid AI";
  endpoint: typeof LIQUID_ENDPOINT;
  model: "d1-ultra";
  apiKey: string;
  protocol: "systemone";
};

export function liquidConfig(apiKey: string | undefined): LiquidConfig {
  const key = apiKey?.trim() || "";
  if (
    !key ||
    /[\s\x00-\x1f\x7f"'`=]/.test(key) ||
    /^(your[_-].*|replace[_-].*|xxx+|<.*>)$/i.test(key)
  )
    throw new ConfigurationError(
      "Liquid AI 未配置有效 API Key，请在模型设置填写 Liquid Key。 / Liquid API key required.",
    );
  return {
    engine: "liquid",
    provider: "liquid",
    name: "Liquid AI",
    endpoint: LIQUID_ENDPOINT,
    model: "d1-ultra",
    apiKey: key,
    protocol: "systemone",
  };
}

const describe = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value);

// Liquid uses the native System One primitives, with text state/instructions
// and described criteria. Preserve each question's own continuation separately.
export function compileLiquidRequest(payload: SystemOneRequest<Questions>) {
  return {
    model: "d1-ultra",
    state: describe(payload.state),
    questions: Object.fromEntries(
      Object.entries(payload.questions).map(([id, q]) => [
        id,
        {
          type: q.type,
          instructions:
            describe(q.instructions) +
            (q.type === "noul" && q.criteria
              ? "\nPredicate criteria: " + describe(q.criteria)
              : ""),
          ...(q.type === "choice"
            ? {
                criteria: Object.fromEntries(
                  Object.entries(q.criteria).map(([key, value]) => [
                    key,
                    value == null ? key : describe(value),
                  ]),
                ),
              }
            : q.type === "score"
              ? { criteria: Object.values(q.criteria).map(describe) }
              : {}),
        },
      ]),
    ),
  };
}
