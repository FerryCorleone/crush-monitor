// Presets are conveniences, not a claim that every account/model has been tested.
export const MODEL_PRESETS = [
  {
    id: "deepseek",
    name: "DeepSeek",
    protocol: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-flash",
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "qwen",
    name: "通义千问 · 百炼（北京）",
    protocol: "openai",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen3.8-flash",
    keyUrl: "https://bailian.console.aliyun.com/",
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    protocol: "openai",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4.7-flash",
    keyUrl: "https://bigmodel.cn/usercenter/proj-mgmt/apikeys",
  },
  {
    id: "kimi",
    name: "Kimi",
    protocol: "openai",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "",
    keyUrl: "https://platform.kimi.com/",
  },
  {
    id: "doubao",
    name: "豆包 · 火山方舟",
    protocol: "openai",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model: "",
    keyUrl: "https://console.volcengine.com/ark/",
  },
  {
    id: "siliconflow",
    name: "硅基流动",
    protocol: "openai",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "",
    keyUrl: "https://cloud.siliconflow.cn/account/ak",
  },
  {
    id: "openai-decisions",
    name: "OpenAI Decisions · GPT-6 Luna（测试版）",
    protocol: "decisions",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-6-luna",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "liquid",
    name: "Liquid AI · d1-ultra",
    protocol: "systemone",
    baseUrl: "https://api.liquid.ai/decisions/v1",
    model: "d1-ultra",
    keyUrl: "https://console.liquid.ai/",
  },
  {
    id: "openai",
    name: "OpenAI",
    protocol: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    protocol: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "",
    keyUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    protocol: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    model: "",
    keyUrl: "https://platform.claude.com/settings/keys",
  },
  {
    id: "openrouter-llm",
    name: "OpenRouter · LLM",
    protocol: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "",
    keyUrl: "https://openrouter.ai/settings/keys",
  },
  {
    id: "vercel-llm",
    name: "Vercel AI Gateway · LLM",
    protocol: "openai",
    baseUrl: "https://ai-gateway.vercel.sh/v1",
    model: "",
    keyUrl: "https://vercel.com/ai-gateway",
  },
  {
    id: "custom",
    name: "其他 OpenAI / Claude 兼容服务",
    protocol: "openai",
    baseUrl: "",
    model: "",
    keyUrl: "",
  },
  {
    id: "typesafe",
    name: "Jev · TypeSafe",
    protocol: "jev",
    baseUrl: "",
    model: "jev-1.13.0",
    keyUrl: "https://console.typesafe.ai/",
  },
  {
    id: "vercel",
    name: "Jev · Vercel AI Gateway",
    protocol: "jev",
    baseUrl: "",
    model: "typesafe-ai/jev",
    keyUrl: "https://vercel.com/ai-gateway",
  },
  {
    id: "openrouter",
    name: "Jev · OpenRouter",
    protocol: "jev",
    baseUrl: "",
    model: "typesafe/jev-1.13",
    keyUrl: "https://openrouter.ai/settings/keys",
  },
  {
    id: "opencode",
    name: "Jev · OpenCode（限时免费）",
    protocol: "jev",
    baseUrl: "",
    model: "jev-1.13-free",
    keyUrl: "https://opencode.ai/console/",
  },
] as const;
export type ModelSettings = {
  preset: string;
  protocol: "openai" | "anthropic" | "jev" | "decisions" | "systemone";
  baseUrl: string;
  model: string;
  apiKey: string;
  jsonMode: boolean;
};
export type PublicSettings = Omit<ModelSettings, "apiKey"> & {
  configured: boolean;
  hasKey: boolean;
  fingerprint: string;
  source: "web" | "environment" | "none";
  token: string;
};
