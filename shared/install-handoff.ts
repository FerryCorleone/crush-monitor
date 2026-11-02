import type { recommendProvider } from "./provider-recommendation";

export const DEFAULT_APP_URL = "http://127.0.0.1:3178/";

export function localAppUrl(value = DEFAULT_APP_URL): string {
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      throw new Error();
    return url.href;
  } catch {
    throw new Error("--app-url 须为本机使用地址，例如 http://127.0.0.1:3178/");
  }
}

// Keep acquisition inside the numbered instructions. The installer should not
// assume a first-time user already has a key or append a second advice section.
const keySteps: Record<string, string[]> = {
  typesafe: [
    "打开 [TypeSafe 控制台](https://console.typesafe.ai/)，注册并登录。",
    "进入「API Keys」，创建并复制 Key；若余额不足，按控制台提示自行决定是否充值。",
  ],
  opencode: [
    "打开 [OpenCode Console](https://opencode.ai/console/)，用邮箱注册、完成验证并登录。",
    "进入「Settings → Service accounts」，创建 Key，Models 权限选「Request」，复制生成的 Key。",
  ],
  openrouter: [
    "打开 [OpenRouter](https://openrouter.ai/settings/keys)，注册并登录。",
    "点击「Create Key」，创建并复制 Key；若余额不足，按控制台提示自行决定是否充值。",
  ],
  vercel: [
    "打开 [Vercel AI Gateway](https://vercel.com/d?to=/%5Bteam%5D/~/ai-gateway/api-keys)，注册并登录。",
    "按控制台要求完成账号验证并准备可用于 Jev 的付费额度。",
    "点击「Create key」，创建并复制 AI Gateway Key。",
  ],
  startlux: [
    "打开 [Bamboo 注册页](https://bamboonode.dev/register)，用邮箱注册、完成验证并登录。",
    "进入 [API Keys](https://bamboonode.dev/tokens)，创建 Key，分组选「default」，复制生成的 Key。",
  ],
  liquid: [
    "打开 [Liquid Console](https://console.liquid.ai/)，注册并登录。",
    "进入「Dashboard → API Keys」，创建并复制 Key。",
  ],
  deepseek: [
    "打开 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys)，注册并登录。",
    "进入「API Keys」，创建并复制 Key；若余额不足，按控制台提示自行决定是否充值。",
  ],
  qwen: [
    "打开 [阿里云百炼](https://bailian.console.aliyun.com/)，注册并登录，按页面提示开通服务。",
    "把地域切换为「北京」。",
    "进入「API Key」，创建并复制 Key。",
  ],
};

export function buildInstallHandoff(
  recommendation: ReturnType<typeof recommendProvider>,
  appUrl = DEFAULT_APP_URL,
) {
  const url = localAppUrl(appUrl);
  const provider = recommendation.primary;
  if (!provider || !keySteps[provider.id]) return null;
  const textModel = provider.tier === "llm";
  const steps = [
    ...keySteps[provider.id],
    `回到[好感监控器](${url})，打开「聊天设置 → 模型设置」，选择「${provider.appChoice}」，在网页中粘贴 Key${textModel ? "。" : "；型号自动配置。"}`,
    ...(textModel
      ? [
          "等待模型列表出现，选择 Flash 等快速文本型号；若没有列表，填写平台控制台显示的模型 ID。",
        ]
      : []),
    "点击「检测连接并保存」，等待连接成功。",
    "在电脑微信或 QQ 多选聊天记录并复制，粘贴到网页，确认哪个昵称是自己，开始分析。",
  ];
  return {
    providerId: provider.id,
    steps,
    markdown:
      `使用页面：[好感监控器](${url})，建议使用「${provider.appChoice}」。\n\n` +
      steps.map((step, i) => `${i + 1}. ${step}`).join("\n"),
  };
}
