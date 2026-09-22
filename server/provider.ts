import type { Questions, SystemOneRequest } from "@typesafe-ai/sdk";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { getProviderConfig, type ProviderConfig } from "./provider-config";

const probability = z.number().min(0).max(1);
const distribution = z.record(probability);
const answerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("noul"), noul: probability }),
  z.object({
    type: z.literal("choice"),
    choice: z.string(),
    confidence: probability,
    probabilities: distribution,
  }),
  z.object({
    type: z.literal("score"),
    score: z.number().nonnegative(),
    confidence: probability,
    probabilities: distribution,
  }),
]);
const resultSchema = z.object({
  model: z.string().min(1),
  answers: z.record(answerSchema),
  usage: z.object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
  }),
});

export class ProviderError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function providerErrorMessage(error: unknown): string {
  if (error instanceof ProviderError) return error.message;
  return "连接超时或网络不可达，请检查网络后重试。 / Connection failed or timed out.";
}

function httpError(status: number, name: string) {
  const reason: Record<number, string> = {
    400: "请求未被接受，请检查模型是否可用或缩小聊天范围 / Invalid request",
    401: "Key 无效或已过期，请运行 npm run setup 重新配置 / Invalid API key",
    402: "额度不足，请在该平台检查余额或计费设置 / Insufficient credits",
    403: "没有模型调用权限，请检查 Key 权限和模型访问权限 / Access denied",
    404: "模型或接口暂不可用，请检查平台公告 / Model or endpoint unavailable",
    413: "聊天过长，请缩小范围 / Request too large",
    422: "无法处理当前输入，请缩小聊天范围 / Invalid input",
    429: "请求受限，请稍后重试并检查账号限额 / Rate limit reached",
  };
  return new ProviderError(
    status,
    `${name}：${reason[status] || "服务暂不可用，请稍后重试 / Service unavailable"}`,
  );
}

// Preserve native Jev confidence and every probability; never fabricate a
// distribution or turn an incomplete gateway response into a successful score.
export function validateResult(value: unknown, questions: Questions) {
  const parsed = resultSchema.safeParse(value);
  const invalid = () =>
    new ProviderError(
      502,
      "模型返回的评分或概率不完整，请重试或切换平台。 / Incomplete model response.",
    );
  if (!parsed.success) throw invalid();
  for (const [id, question] of Object.entries(questions)) {
    const answer = parsed.data.answers[id];
    if (!answer || answer.type !== question.type) throw invalid();
    if (question.type === "noul" || answer.type === "noul") continue;
    const keys = Object.keys(question.criteria);
    if (
      keys.length !== Object.keys(answer.probabilities).length ||
      keys.some((key) => !Object.hasOwn(answer.probabilities, key))
    )
      throw invalid();
    const sum = Object.values(answer.probabilities).reduce((a, b) => a + b, 0);
    // Jev rounds probabilities to two decimals; large choice sets need tolerance.
    if (Math.abs(sum - 1) > keys.length * 0.005 + 0.001) throw invalid();
    if (answer.type === "choice" && !keys.includes(answer.choice))
      throw invalid();
    if (answer.type === "score" && answer.score > keys.length - 1)
      throw invalid();
  }
  return parsed.data;
}

// Native contracts: docs.typesafe.ai/api, Vercel's /sdks-and-apis/typesafe,
// and OpenRouter's /api/alpha/decisions. These are NOT chat/completions APIs.
export async function evaluate(
  payload: SystemOneRequest<Questions>,
  signal?: AbortSignal,
  config: ProviderConfig = getProviderConfig(),
  fetchImpl: typeof fetch = fetch,
) {
  const deadline = AbortSignal.timeout(45000);
  const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  for (let attempt = 0; ; attempt++) {
    requestSignal.throwIfAborted();
    const response = await fetchImpl(config.endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, model: config.model }),
      signal: AbortSignal.any([requestSignal, AbortSignal.timeout(30000)]),
    });
    if (!response.ok) {
      // Do not surface provider bodies: they may echo credentials or chat text.
      if (config.provider === "vercel" && response.status === 403) {
        const details = await response.json().catch(() => null);
        if (details?.error?.type === "customer_verification_required") {
          throw new ProviderError(
            403,
            "Vercel AI Gateway：账号需要先绑定有效信用卡才能调用（包括免费额度）。请在 Vercel 控制台完成验证后重试。 / Add a valid credit card in Vercel to enable AI Gateway.",
          );
        }
      } else {
        await response.body?.cancel();
      }
      const retry = response.headers.get("retry-after");
      const seconds =
        retry === null
          ? 0.4
          : /^\d+(\.\d+)?$/.test(retry)
            ? Number(retry)
            : Math.max(0, (Date.parse(retry) - Date.now()) / 1000);
      if (
        attempt === 0 &&
        [429, 503, 529].includes(response.status) &&
        Number.isFinite(seconds) &&
        seconds <= 3
      ) {
        await delay(Math.max(100, seconds * 1000), undefined, {
          signal: requestSignal,
        });
        continue;
      }
      throw httpError(response.status, config.name);
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new ProviderError(
        502,
        `${config.name} 返回格式异常，请重试 / Invalid response`,
      );
    }
    return validateResult(data, payload.questions);
  }
}

export async function checkProvider(
  config: ProviderConfig = getProviderConfig(),
  signal?: AbortSignal,
) {
  const result = await evaluate(
    {
      state: "This is a connection test. The sky is blue.",
      questions: {
        color: {
          type: "choice",
          instructions: "What color is the sky in the text?",
          criteria: { blue: null, red: null },
        },
        clarity: {
          type: "score",
          instructions: "How explicit is the sky color?",
          criteria: ["Not mentioned", "Implied", "Explicitly stated"],
        },
        mentioned: {
          type: "noul",
          instructions: "Does the text mention the sky?",
        },
      },
    },
    signal,
    config,
  );
  return {
    provider: config.provider,
    model: result.model,
    usage: result.usage,
  };
}
