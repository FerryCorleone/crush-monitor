# Crush Monitor

[简体中文](README.md) · English

A tool for looking at conversations with your crush or partner, using Jev, StartLux, Liquid AI, OpenAI Decisions, or a text LLM. It helps you make sense of emotions and intentions, and spot replies you could have worded better.

AI doesn't know your relationship or what happens outside the chat. Take the results lightly—as another perspective. Your own judgment and an honest conversation still matter more.

## Let an agent install it

Send this to an agent with permission to run commands on your computer:

> Install and open this project on my local computer. Follow the repository instructions, check network access, and show me how to get an API key and start using it: https://github.com/FerryCorleone/crush-monitor

The agent installs and opens the app, then gives you signup steps for a suitable provider. You register, create a key and paste it into the app. [Full agent instructions](AGENTS.md).

## Features

- **WeChat-style chat view:** the top three emotion and intention probabilities beneath each message.
- **Affection and reply grades:** an overall signal score, SSS–D grades for your replies, and next-step suggestions.
- **Ongoing analysis:** new messages are merged, deduplicated and analyzed in batches; results survive refresh.
- **Local app, browser setup:** select a provider and enter your key in the page, without editing configuration files.

## Run locally

Requires [Node.js 22.12+](https://nodejs.org/en/download). Download the source and run these commands in the project directory on macOS, Windows or Linux:

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:3178/**. Model settings appear on first launch; later, open **聊天设置 → 模型设置** (Chat settings → Model settings). Keep the terminal running. Next time, use `npm start`; stop with `Ctrl+C`.

## Models and API keys

**We recommend Jev first:** it returns classifications, scores and probabilities directly, matching the app's per-message analysis. [Founder's launch post](https://x.com/CompleteSkeptic/status/2099925682726002904) · [Official introduction](https://typesafe.ai/blog/introducing-system-one-models-and-jev). If access is inconvenient, use DeepSeek, Qwen/Bailian or StartLux. The features stay the same; results vary by model.

| Type | Provider and key creation | Option in the app | Free access / notes |
| --- | --- | --- | --- |
| Jev | [TypeSafe](https://console.typesafe.ai/): sign in → API Keys → create | `Jev · TypeSafe` | No current new-user credit grant; a usable balance is required. Model ID is preset |
| Jev | [OpenCode](https://opencode.ai/console/): verify email → Settings → Service accounts → create key with Models: Request | `Jev · OpenCode（限时免费）` | Limited-time free `jev-1.13-free`; users in mainland China may encounter regional restrictions |
| Jev | [Vercel AI Gateway](https://vercel.com/d?to=/%5Bteam%5D/~/ai-gateway/api-keys): Create key | `Jev · Vercel AI Gateway` | Monthly $5 free credits currently cannot be used for Jev; card verification and usable paid credits required. Use a Gateway key, not an account token |
| Jev | [OpenRouter](https://openrouter.ai/settings/keys): Create Key | `Jev · OpenRouter` | Pay-as-you-go; check the dashboard for trial-credit eligibility |
| Native decisions | [StartLux · Bamboo](https://bamboonode.dev/register): register → [API Keys](https://bamboonode.dev/tokens) → create in the `default` group | `StartLux · Bamboo（试验性）` | Free during the promotion, with no top-up required. API hosted by Bamboo; model ID is preset |
| Native decisions | [Liquid AI](https://console.liquid.ai/): sign in → Dashboard → API Keys → create | `Liquid AI · d1-ultra` | $2 trial per new organization; $0.042 per million input tokens, billed per question. Chats may be used for training; review the [data terms](https://www.liquid.ai/terms-conditions) |
| Native decisions | [OpenAI Decisions](https://platform.openai.com/api-keys): create an official API key | `OpenAI Decisions · GPT-6 Luna（测试版）` | Paid API, beta entry; ChatGPT/Codex subscriptions exclude API credits |
| LLM | [DeepSeek](https://platform.deepseek.com/api_keys): API Keys → create | `DeepSeek` | Pay-as-you-go; check the dashboard for credits. Prefer a fast Flash model |
| LLM | [Qwen / Bailian](https://bailian.console.aliyun.com/): select Beijing → API Key → create | `通义千问 · 百炼（北京）` | Check dashboard trial eligibility. Regional keys cannot be mixed; prefer Qwen Flash |
| LLM | [GLM](https://bigmodel.cn/usercenter/proj-mgmt/apikeys): create API key | `智谱 GLM` | Free access and rate limits depend on the model |
| LLM | [Kimi](https://platform.kimi.com/): create a console API key | `Kimi` | Depends on account, model and promotions |
| LLM | [Doubao / Volcengine Ark](https://console.volcengine.com/ark/): create API key | `豆包 · 火山方舟` | Check dashboard credits; inference endpoint IDs are also accepted |
| LLM | [SiliconFlow](https://cloud.siliconflow.cn/account/ak): create API key | `硅基流动` | Depends on the model; not all models are free |
| LLM | [OpenAI](https://platform.openai.com/api-keys) / [Gemini](https://aistudio.google.com/apikey) / [Claude](https://platform.claude.com/settings/keys): create the matching key | `OpenAI` / `Google Gemini` / `Anthropic Claude` | Depends on provider and account; chat subscriptions are separate |
| LLM | [OpenRouter](https://openrouter.ai/settings/keys) / [Vercel](https://vercel.com/ai-gateway): create a platform key | `OpenRouter · LLM` / `Vercel AI Gateway · LLM` | Depends on provider and model; these are separate from the Jev entries |
| Custom | Use your provider's Base URL, model ID and key | `其他 OpenAI / Claude 兼容服务` | Compatible APIs and local servers supported; use `local` for a local server without authentication |

After pasting a key, LLM providers load a model list. Pick a fast text model, then click **检测连接并保存** (Test and save). If listing is unavailable, enter the model ID from the provider's console. Failed tests preserve the old configuration. If the app reports an invalid key or insufficient credits, check your key and balance with the provider.

Free-access policies can change; check the provider dashboard for current credits and conditions.

## Usage

1. Multi-select and copy WeChat or QQ messages on your computer, then paste into the app. For WhatsApp, export a `.txt` chat; for iMessage and other apps, use `Name: body` text.
2. Confirm which name is yours and start analysis. Adjust the relationship in **聊天设置** (Chat settings).
3. Read emotions, intentions, reply grades and next steps. Click the affection score for details.
4. Paste new messages to continue.

Two-person text conversations only. The app does not read chat databases or monitor messaging apps. See [format examples](docs/reference.en.md#chat-formats). The interface is currently in Chinese.

## Notes

- Affection is a conversation-signal score, not the probability that someone likes you. Scores across models are not directly comparable.
- Chats and results stay in the current browser. Changing browsers or ports, or clearing browser data, affects saved records.
- Keys are stored in plaintext in the local `.runtime/model.json`. Do not share `.runtime` or `.env`. Relevant chat excerpts are sent to your selected model provider using your account's credits.

[Troubleshooting, legacy configuration and development](docs/reference.en.md)

## License

[MIT](LICENSE). Not affiliated with WeChat, Tencent or TypeSafe.

## Community projects

Community members have brought Crush Monitor to phones and desktops, with a few twists of their own. More projects can be added here over time:

| Project | What's different |
| --- | --- |
| [FQKH / Crush-](https://github.com/FQKH/Crush-) | Android APK with a DeepSeek analysis option. The repository currently provides an APK but not the full source code. |
| [RYANFFY / crush-monitor-pack](https://github.com/RYANFFY/crush-monitor-pack) | Windows and macOS installers that save you from running the setup commands yourself. |
| [Reverie0123 / crush-monitor-universal](https://github.com/Reverie0123/crush-monitor-universal) | Supports DeepSeek and OpenAI-compatible APIs, with an option to switch back to Jev; adds explanations, reply rewrites and analysis report export. |

These are unofficial projects maintained independently by community members. Check each repository before downloading, installing or entering an API key; this project does not guarantee their security or functionality.
