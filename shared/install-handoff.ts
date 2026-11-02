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

// Each choice includes its acquisition path; shared steps work for any choice.
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

const descriptions: Record<string, string> = {
  typesafe: "Jev 原生判断；官方入口，需可用余额",
  opencode: "Jev 原生判断；免费型号的活动及地区权限以控制台为准",
  openrouter: "Jev 原生判断；按量付费",
  vercel: "Jev 原生判断；需账号验证及可用于 Jev 的付费额度",
  startlux: "原生判断；Bamboo 第三方托管，型号自动配置",
  liquid:
    "原生判断；聊天可能用于训练，先看 [数据条款](https://www.liquid.ai/terms-conditions)",
  deepseek: "国内平台，LLM 文本分析；按量付费",
  qwen: "国内平台，LLM 文本分析；选北京地域，试用额度以控制台为准",
};

const availabilityLabels = {
  candidate: "当前网络可达，待填 Key 检测",
  "needs-verification": "网络待复核，暂未确认可用",
  unavailable: "当前网络未连通",
};

export function buildInstallHandoff(
  recommendation: ReturnType<typeof recommendProvider>,
  appUrl = DEFAULT_APP_URL,
) {
  const url = localAppUrl(appUrl);
  const provider = recommendation.primary;
  if (!provider || !keySteps[provider.id]) return null;
  const choices = recommendation.choices.filter((p) => keySteps[p.id]);
  const steps = [
    "从上表选择一个当前网络可达的平台，打开该行申请链接，注册并登录。",
    "按该行路径创建并复制 API Key；只需申请所选平台的 Key。",
    `回到[好感监控器](${url})，打开「聊天设置 → 模型设置」，选择上表对应的平台，在网页中粘贴 Key。`,
    "Jev、StartLux 等原生判断模型的型号自动配置；若选 LLM，等待模型列表出现，选择 Flash 等快速文本型号；没有列表时填写平台控制台显示的模型 ID。",
    "点击「检测连接并保存」，等待连接成功。",
    "在电脑微信或 QQ 多选聊天记录并复制，粘贴到网页，确认哪个昵称是自己，开始分析。",
  ];
  return {
    providerId: provider.id,
    choices,
    steps,
    markdown:
      `使用页面：[好感监控器](${url})，优先建议「${provider.appChoice}」，也可以选择下列其他模型。\n\n` +
      "| 模型（页面选项） | 特点与当前网络 | 获取 API Key |\n| --- | --- | --- |\n" +
      choices
        .map(
          (p) =>
            `| ${p.appChoice} | ${descriptions[p.id]}；${availabilityLabels[p.availability]} | ${keySteps[p.id].join(" ")} |`,
        )
        .join("\n") +
      "\n\n" +
      steps.map((step, i) => `${i + 1}. ${step}`).join("\n"),
  };
}
