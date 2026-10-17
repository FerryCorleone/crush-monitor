import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  chmodSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { MODEL_PRESETS, type ModelSettings } from "../shared/model-presets";
import { liquidConfig, type LiquidConfig } from "./liquid";
import {
  getProviderConfig,
  ConfigurationError,
  type ProviderConfig,
} from "./provider-config";
export type LlmConfig = {
  engine: "llm";
  provider: string;
  name: string;
  endpoint: string;
  model: string;
  apiKey: string;
  protocol: "openai" | "anthropic";
  jsonMode: boolean;
};
export type DecisionsConfig = {
  engine: "decisions";
  provider: "openai-decisions";
  name: string;
  endpoint: string;
  model: "gpt-6-luna";
  apiKey: string;
  protocol: "decisions";
};
export type ActiveConfig =
  ProviderConfig | LlmConfig | DecisionsConfig | LiquidConfig;
export const modelConfigPath = resolve(
  process.env.CRUSH_CONFIG_PATH || ".runtime/model.json",
);
const schema = z
  .object({
    preset: z.string().max(80),
    protocol: z.enum(["openai", "anthropic", "jev", "decisions", "systemone"]),
    baseUrl: z.string().trim().max(500),
    model: z.string().trim().max(200),
    apiKey: z.string().trim().max(4096),
    jsonMode: z.boolean().default(true),
  })
  .strict();
export function parseSettings(input: unknown): ModelSettings {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new ConfigurationError("配置格式不正确，请检查后重试。");
  const s = result.data;
  const preset = MODEL_PRESETS.find((p) => p.id === s.preset);
  if (!preset || (s.preset !== "custom" && s.protocol !== preset.protocol))
    throw new ConfigurationError("服务商与接口类型不匹配。");
  if (
    !s.apiKey ||
    /[\s\x00-\x1f\x7f"'`=]/.test(s.apiKey) ||
    /^(your[_-].*|replace[_-].*|xxx+|<.*>)$/i.test(s.apiKey)
  )
    throw new ConfigurationError(
      "请粘贴 API Key 本身，不要带 Bearer、变量名或引号。",
    );
  if (s.protocol === "jev") {
    const config = getProviderConfig({
      JEV_PROVIDER: s.preset,
      JEV_API_KEY: s.apiKey,
    });
    return { ...s, baseUrl: "", model: config.model };
  }
  if (s.protocol === "decisions") {
    if (s.preset !== "openai-decisions" || s.baseUrl !== preset.baseUrl)
      throw new ConfigurationError(
        "Decisions 仅支持 OpenAI 官方地址，请选择对应入口。",
      );
    return { ...s, model: "gpt-6-luna", jsonMode: false };
  }
  if (s.protocol === "systemone") {
    if (s.preset !== "liquid" || s.baseUrl !== preset.baseUrl)
      throw new ConfigurationError(
        "Liquid 仅支持官方 System One 地址，请选择 Liquid AI 入口。",
      );
    return { ...s, model: "d1-ultra", jsonMode: false };
  }
  if (!s.model || /[\s\x00-\x1f]/.test(s.model))
    throw new ConfigurationError("请填写平台提供的模型 ID，不是模型昵称。");
  let u: URL;
  try {
    u = new URL(s.baseUrl);
  } catch {
    throw new ConfigurationError("API 地址不正确，请填写完整的 Base URL。");
  }
  if (
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    (u.protocol !== "https:" &&
      !(
        u.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
      ))
  )
    throw new ConfigurationError(
      "API 地址须使用 HTTPS；本机服务可使用 HTTP。请勿在地址中携带 Key。",
    );
  s.baseUrl = u.href
    .replace(/\/+$/, "")
    .replace(/\/(chat\/completions|messages)$/, "");
  if (s.preset !== "custom" && s.baseUrl !== preset.baseUrl)
    throw new ConfigurationError(
      "此平台的地址固定；其他区域或代理地址请选择“其他兼容服务”。",
    );
  return s;
}
export function settingsConfig(s: ModelSettings): ActiveConfig {
  s = parseSettings(s);
  if (s.protocol === "jev")
    return getProviderConfig({ JEV_PROVIDER: s.preset, JEV_API_KEY: s.apiKey });
  if (s.protocol === "systemone") return liquidConfig(s.apiKey);
  if (s.protocol === "decisions")
    return {
      engine: "decisions",
      provider: "openai-decisions",
      name: "OpenAI Decisions",
      endpoint: "https://api.openai.com/v1/decisions",
      model: "gpt-6-luna",
      apiKey: s.apiKey,
      protocol: "decisions",
    };
  return {
    engine: "llm",
    provider: s.preset,
    name: MODEL_PRESETS.find((p) => p.id === s.preset)!.name,
    endpoint:
      s.baseUrl +
      (s.protocol === "anthropic" ? "/messages" : "/chat/completions"),
    model: s.model,
    apiKey: s.apiKey,
    protocol: s.protocol,
    jsonMode: s.jsonMode,
  };
}
export function readSettings(file = modelConfigPath): ModelSettings | null {
  if (!existsSync(file)) return null;
  try {
    return parseSettings(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    throw new ConfigurationError(
      "本机模型配置无法读取，请在网页中重新填写并保存。",
    );
  }
}
export function activeConfig(): ActiveConfig {
  const saved = readSettings();
  if (saved) return settingsConfig(saved);
  if (process.env.CRUSH_PROVIDER?.trim().toLowerCase() === "liquid")
    return liquidConfig(process.env.LIQUID_API_KEY);
  if (process.env.CRUSH_PROVIDER?.trim())
    throw new ConfigurationError(
      "CRUSH_PROVIDER 仅支持 liquid；Jev 请使用 JEV_PROVIDER。",
    );
  return getProviderConfig();
}
export function configFingerprint(config: ActiveConfig): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        config.provider,
        config.endpoint,
        config.model,
        "protocol" in config ? config.protocol : "jev",
        "engine" in config
          ? config.engine === "decisions"
            ? "decisions-adapter-v1"
            : config.engine === "liquid"
              ? "liquid-adapter-v1"
              : "llm-adapter-v2"
          : "llm-adapter-v1",
      ]),
    )
    .digest("hex")
    .slice(0, 20);
}
export function saveSettings(s: ModelSettings, file = modelConfigPath) {
  const value = parseSettings(s);
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const temp = file + "." + randomUUID() + ".tmp";
  writeFileSync(temp, JSON.stringify(value), { mode: 0o600, flag: "wx" });
  renameSync(temp, file);
  if (process.platform !== "win32") chmodSync(file, 0o600);
}
export function publicSettings() {
  try {
    const config = activeConfig(),
      saved = readSettings();
    return {
      ...(saved
        ? {
            preset: saved.preset,
            protocol: saved.protocol,
            baseUrl: saved.baseUrl,
            model: saved.model,
            jsonMode: saved.jsonMode,
          }
        : {
            preset: config.provider,
            protocol:
              "engine" in config && config.engine === "liquid"
                ? ("systemone" as const)
                : ("jev" as const),
            baseUrl:
              "engine" in config && config.engine === "liquid"
                ? "https://api.liquid.ai/decisions/v1"
                : "",
            model: config.model,
            jsonMode: true,
          }),
      configured: true,
      hasKey: true,
      fingerprint: configFingerprint(config),
      source: saved ? ("web" as const) : ("environment" as const),
    };
  } catch {
    return {
      preset: "deepseek",
      protocol: "openai" as const,
      baseUrl: MODEL_PRESETS[0].baseUrl,
      model: MODEL_PRESETS[0].model,
      jsonMode: true,
      configured: false,
      hasKey: false,
      fingerprint: "",
      source: "none" as const,
    };
  }
}
export function submittedSettings(body: unknown): ModelSettings {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ConfigurationError("配置格式不正确。");
  const s = parsed.data;
  if (!s.apiKey) {
    const old = activeConfig(),
      view = publicSettings();
    if (
      view.preset !== s.preset ||
      view.protocol !== s.protocol ||
      view.baseUrl !== s.baseUrl
    )
      throw new ConfigurationError(
        "更换服务商或地址后，请重新填写对应的 Key。",
      );
    s.apiKey = old.apiKey;
  }
  return parseSettings(s);
}
