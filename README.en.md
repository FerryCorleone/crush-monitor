# Crush Monitor

[简体中文](README.md) · English

A tool for looking at conversations with your crush or partner, using Jev, Liquid AI d1-ultra, OpenAI Decisions (experimental), or a text LLM. It helps you make sense of emotions and intentions, and spot replies you could have worded better.

AI doesn't know your relationship or what happens outside the chat. Take the results lightly—as another perspective. Your own judgment and an honest conversation still matter more.

## Features

- **WeChat-style conversation view:** analysis sits beneath each message.
- **Emotions and intentions:** the top three probabilities from 12 emotion and 35 intention categories.
- **Affection score and reply grades:** a conversation-level score, SSS–D grades for your replies, and suggested next steps.
- **Ongoing analysis:** paste more messages to continue. Overlapping excerpts are detected, long conversations run in batches, and results survive a page refresh.
- **Run locally with your own key:** configure your provider, model and API key directly in the browser. No hosted deployment required.

The interface and analysis labels are currently in Chinese. This README provides English setup instructions; it does not add an English UI.

## Why Jev?

Jev is TypeSafe's model for structured judgments, returning classifications, scores and probabilities. This app needs short, per-message assessments rather than long generated answers. Emotion and intention judgments can also run in parallel within a request.

- [Launch post by founder Diogo Almeida](https://x.com/CompleteSkeptic/status/2099925682726002904)
- [Official introduction](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

## Choose a model and get an API key

**We recommend starting with Jev.** The app was originally designed around its classifications, scores and probabilities. If registration, payment or getting a Jev key is difficult, use a text LLM such as DeepSeek or Qwen instead. Emotions, intentions, affection scores and reply grades remain the same features. Results vary by model; we do not have an accuracy ranking for relationship conversations.

### First choice: Jev

Create a key with one of these providers and select its **Jev** entry in the app. Model IDs are preset; you do not need to find one yourself or deploy the website to Vercel.

| Provider | Create a key | Setup choice | Free credits |
| --- | --- | --- | --- |
| TypeSafe | Sign in to the [TypeSafe console](https://console.typesafe.ai/), create a key under API Keys and copy it | Jev · TypeSafe | **New signups no longer receive free credits.** The former $5 offer has stopped, with no announced return date ([official announcement](https://x.com/typesafeai/status/2104337824292220981)) |
| OpenCode Console | [Sign up and verify your email](https://opencode.ai/console/); create a key in Settings → Service accounts with Models access set to Request | Jev · OpenCode（限时免费） | **Limited-time free** `jev-1.13-free`. Verified with a new account, no payment method or top-up; no automatic paid fallback ([official docs](https://opencode.ai/v2/docs/console/models/)) |
| Vercel AI Gateway | Sign in to Vercel, open [AI Gateway → API Keys](https://vercel.com/d?to=/%5Bteam%5D/~/ai-gateway/api-keys) and select **Create key**. Use an AI Gateway key, not a Vercel account Access Token | Jev · Vercel AI Gateway | The platform offers **$5/month, but Jev is currently ineligible**. Its catalog entry does not accept free credits; purchased credits are required ([model list](https://vercel.com/ai-gateway/models?q=jev), [rules](https://vercel.com/docs/ai-gateway/pricing)) |
| OpenRouter | Sign in to [OpenRouter Keys](https://openrouter.ai/settings/keys), select **Create Key** and copy the new key | Jev · OpenRouter | The FAQ mentions a small new-user allowance, but specifies neither an amount nor Jev eligibility. [Jev is paid](https://openrouter.ai/typesafe/jev-1.13/); top up if you have no usable balance. Free-model quotas are not Jev credits ([details](https://openrouter.ai/support/)) |

OpenCode verified on **2026-10-13**: full chat analysis completed without a payment method or top-up. Requests worked through a proxy; mainland-direct inference returned HTTP 451 in our test. It is not currently a verified mainland-direct option. The promotion may end; the app never switches automatically to the paid model.

Vercel requires credit-card verification for its free tier ([official guidance](https://community.vercel.com/t/free-credits-temporarily-have-restricted-access-due-to-abuse/21461/8)). Purchasing credits moves the account to the paid tier and ends the monthly $5 grant.

Other providers checked on **2026-10-04**. Platform credits do not automatically mean free Jev access. Confirm your balance and model permissions; policies and dashboard eligibility may change.

### Liquid AI: d1-ultra

Create a key in [Liquid Console](https://console.liquid.ai/) under Dashboard → API Keys. Select **Liquid AI · d1-ultra** in the app, enter the key, then test and save. The fixed `d1-ultra` model uses the [native System One API](https://docs.liquid.ai/lfm/models/d1), preserving Choice/Noul/Score probabilities, confidence and fractional scores. Liquid credentials are separate from Jev and OpenAI; the adapter never switches models.

As of **2026-10-17**, [official pricing](https://www.liquid.ai/pricing) is **US$0.042 per million input tokens**, with free output and **US$2 credit per new organization**, subject to dashboard eligibility, expiry and balance. **Each question is billed independently**, including shared conversation input. Overview and per-message analysis ask several questions, so pasted text length alone underestimates cost. Response `usage.input_tokens` already totals all questions; consult the platform bill. Temporary rate/service errors retry at most once. Connection checks also use credits.

**Privacy:** [Section 6 of Liquid's general terms](https://www.liquid.ai/terms-conditions) permits training, fine-tuning and evaluation using submitted content. No service-specific exception has been verified for this endpoint. Use fictional, non-personal samples only; do not upload real private chats. Running locally does not keep inference data on your device.

**Verification:** startup/build passed; a real three-primitive connectivity check passed; fictional overview, emotion/intent and self-reply analysis passed. The four real requests contained 28 questions and 9,083 input tokens, estimated at US$0.000382, without top-ups or automatic recharge. These checks do not establish accuracy or support for every length or region.

Without browser-saved settings, a private local `.env` may select `CRUSH_PROVIDER=liquid` and `LIQUID_API_KEY`. Browser settings take precedence. Never paste keys into chat, commit them, or put them in command arguments.

### Experimental: OpenAI Decisions

Create a key in the [OpenAI console](https://platform.openai.com/api-keys) and select **OpenAI Decisions · GPT-6 Luna（测试版）**. The endpoint and model are preset; only the key is needed. Emotions, intentions, affection scores, reply grades and next steps remain the same features.

The [dedicated judgment API](https://developers.openai.com/api/docs/guides/decisions) returns native probabilities, classifications and scores rather than long generated answers. It is in public beta. Standard pricing is $0.10 per million input tokens, with no output-token charges; check the official page for other pricing conditions. ChatGPT / Codex subscriptions do not include API credits.

**Only the official OpenAI Decisions endpoint is currently integrated. Local and mock API tests pass; real API inference has not been verified.** Test the connection before use. Access depends on account permissions, region and credits; we do not claim better speed or accuracy than Jev.

<details>
<summary>Other providers and free credits</summary>

[Vercel](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-decisions) and [OpenRouter](https://openrouter.ai/openai/gpt-6-luna-decisions) also offer GPT-6 Luna Decisions. Their model IDs, authentication or request formats differ; do not enter their keys in this app's official OpenAI entry.

As of **2026-10-13**, a live Vercel request returned HTTP 403: its monthly $5 free credits cannot access this model. OpenRouter's new-user credit eligibility has not been tested. No free route for this model has passed our live test; unverified independent gateways are not listed as recommendations.

</details>

### Alternative: a text LLM

DeepSeek and Qwen are convenient starting points for users in mainland China. If you already have another provider's key, use its matching entry.

Built-in LLM presets include [DeepSeek](https://platform.deepseek.com/api_keys), [Qwen / Alibaba Bailian](https://bailian.console.aliyun.com/), [GLM](https://bigmodel.cn/usercenter/proj-mgmt/apikeys), [Kimi](https://platform.kimi.com/), [Doubao / Volcengine Ark](https://console.volcengine.com/ark/), [SiliconFlow](https://cloud.siliconflow.cn/account/ak), [OpenAI](https://platform.openai.com/api-keys), [Gemini](https://aistudio.google.com/apikey), [Claude](https://platform.claude.com/settings/keys), [OpenRouter](https://openrouter.ai/settings/keys), and [Vercel AI Gateway](https://vercel.com/ai-gateway).

- **Pick a model:** paste your key to load a searchable list. Clicking a model fills the field and closes the list. If listing is unsupported, enter the model ID from the provider's console.
- **Start with a fast text model**, such as DeepSeek Flash or Qwen Flash. Dedicated image, audio and embedding models are filtered out; thinking models may take longer. A listed model may still require activation or credits on your account—use the connection test to check.
- **Test and save:** the test shows elapsed time, can be cancelled and stops after 40 seconds. Missing activation and insufficient credits have separate messages. A failed test preserves the previous configuration. A chat subscription does not include API credits; check the provider's console for trials and pricing.

<details>
<summary>Other regions, gateways or local models</summary>

Choose the custom OpenAI / Claude-compatible service and enter the provider's Base URL, model ID and key. For local servers without authentication, use `local` as the key. Protocol compatibility does not mean every model has been tested.

</details>

## Run locally

Install Node.js 22.12+. Download or clone this repository, then run these commands in the project directory. The same commands work on macOS, Windows and Linux.

```sh
npm ci
npm run build
npm start
```

Startup attempts to open **http://127.0.0.1:3178/** in your browser. Open it manually if needed. First launch shows model settings: **choose provider → paste key → confirm model → test and save**. The test sends synthetic questions, costs a small amount of API credits, and does not send your chats. A failed test preserves the previous configuration.

Keep the terminal running; next time use `npm start`. Change providers in **聊天设置 → 模型设置** (Chat settings → Model settings), with no restart required. Changing models preserves messages but clears old analysis and runs it again.

Keys are stored in `.runtime/model.json` by the local server, never in browser storage or returned in settings responses. This is **plaintext local configuration**, restricted to the current user on macOS/Linux, not an encrypted vault. Do not share `.runtime`. Configuration endpoints are local-only; the service listens on loopback by default.

<details>
<summary>Upgrading / CLI configuration</summary>

Existing Jev `.env` settings remain supported, as does `npm run setup -- --en`. Browser-saved configuration takes precedence over `.env`. Delete `.runtime/model.json` to return to environment settings, then refresh. Changing provider or Base URL requires entering the matching key again. Set `CRUSH_OPEN_BROWSER=0` to disable automatic browser opening.

</details>

401: check key; 402: credits; 403: permissions; 404: model ID/endpoint; 429: rate limits; 451: region/network availability. If your endpoint does not support `response_format`, turn off JSON mode in connection options and test again; output validation remains strict.

### Installing with an AI agent

You can give this repository link to Codex, Claude Code or another agent and ask it to follow the local setup steps. For agents:

1. Check Node.js, install dependencies, build and start the service. No key is needed to open the setup page; do not block installation while the user obtains one.
2. If the user has no preference, recommend Jev and link to the providers above. Offer LLMs when obtaining a Jev key is inconvenient; respect an existing key or explicit choice. Explain limited-time offers, network restrictions and unverified entries without promising credits or analysis quality.
3. Guide the user to enter their key, choose a model and test it in the local settings page. Do not ask them to paste secrets into the conversation or edit configuration files manually. Follow errors about access, credits or model IDs instead of retrying blindly.
4. Hand over the actual URL, the restart command and `Ctrl+C` to stop the server. Distinguish “page running,” “connection verified” and “chat analysis verified”; report only what was checked.

## Usage

1. Copy your conversation, or open a text export and copy its contents. Paste into the input field.
2. Select your own name and click **开始分析** (Analyze). Relationship settings are available in **聊天设置** (Chat settings).
3. Read the emotion, intention and reply labels. Click a label for details.
4. Paste new messages to continue the conversation.

### Supported text formats

| Source | What to paste |
| --- | --- |
| WeChat | Desktop multi-message copy: name, Chinese date/time, then message body on separate lines |
| QQ | `Name: 09-17 19:26:53`, followed by the body on the next line; dates with a year also work |
| WhatsApp | [Export a chat](https://faq.whatsapp.com/1180414079177245/), open the `.txt` file and copy its contents; the two common layouts below are supported |
| iMessage / other apps | Format each message as `Name: body`; English names and names containing spaces work |

```text
[9/17/26, 7:26:53 PM] Alex: Dinner tonight?
[9/17/26, 7:27:00 PM] Me: Sounds good
```

```text
17/09/2026, 19:26 - Alex: Dinner tonight?
17/09/2026, 19:27 - Me: Sounds good
```

If copying from iMessage or another app gives you only the message bodies, add `Alex:` / `Me:` yourself. The app cannot recover missing sender information. Native iMessage bulk-copy compatibility has not been verified; only the manually labelled text format is supported. WhatsApp exports can vary by locale and version. The formats above have automated parser tests, not end-to-end verification on every client.

Multiline bodies and consecutive messages from the same person are preserved. Dates are kept as copied: the parser does not guess day/month order or missing years. Only two-person text conversations are supported—not images, audio, ZIP/HTML exports or chat databases. The app does not monitor messaging apps in the background.

## Notes

- The affection score combines six dimensions: keeping the conversation going, engagement, care, openness, intimacy and concrete actions. Click the score for a breakdown. An explicit refusal that still applies limits the score. **It is not the probability that someone likes you.**
- Long conversations are processed in batches; the full history is not capped at 500 messages. New imports analyze new content and revisit recent messages from the other person. Previous grades for your own replies are retained.
- Scoring uses recent messages and relevant original excerpts from history, including invitations, care, refusals and retractions. Old scores are not evidence for new scores. Retrieval can miss context.
- Each model request stays within 500 messages and 12,000 text characters. Overlong individual messages are retained but need splitting before analysis. Paste at most 250,000 characters at a time; total history depends on browser storage capacity.
- Chats and results stay in this browser's local database. **清空聊天，重新开始** (Clear chat and start over) deletes them. Other browsers or URL ports do not share the same data; clearing browser data also removes it.
- Original messages needed for analysis are sent to your selected platform and its model provider using your account's credits. Local storage does not mean offline inference.
- If analysis fails, check the terminal, API key and account credits. Never commit `.env`, `.runtime` or private conversations.

## Development

React + TypeScript + Vite + Express. The existing categories, scoring weights, grades, next-step rules and incremental chat processing are shared by all providers. The adapter supports Liquid System One (`d1-ultra`), OpenAI Chat Completions, Anthropic Messages, OpenAI Decisions, and native Jev endpoints (TypeSafe, Vercel, OpenRouter, OpenCode).

Jev distributions remain unchanged. LLMs return relative weights against the same questions and categories; code normalizes them into distributions and derives scores and distribution concentration. LLM percentages are not calibrated probabilities of someone's feelings, nor directly comparable measurements to Jev. No reply generation or new analysis features are added.

OpenAI Decisions maps the existing questions to predicate / choice / score and preserves native probabilities, confidence and fractional scores. Requests are bounded by question and option counts, with at most two batches in parallel; self-reply continuations are isolated. Refusals and incomplete results fail explicitly without fabricated scores. Its scores are not directly interchangeable with Jev measurements.

LLMs use a separate request pipeline: shared category definitions, short output IDs, concurrent batches and one overview after per-message analysis. Thinking is disabled for DeepSeek and other explicitly supported models; unsupported models keep their platform defaults. Self-reply ratings cannot see later messages.

Categories, counts and numeric ranges are validated. Only invalid judgments are retried; truncated batches are split and retried once with a larger output budget. Completed batches are retained if recovery fails, without placeholder scores. Bailian uses model-specific thinking controls and accepts streaming-only models. Connection checks time out after 40 seconds and can be cancelled; activation and quota errors are reported separately. Real API tests cover native DeepSeek and representative Qwen, DeepSeek, Kimi, GLM and MiniMax models on Bailian; other presets and protocol tests do not imply per-model verification. Cross-model accuracy on Chinese relationship chats has not been benchmarked.

```sh
npm run dev        # http://127.0.0.1:5178/
npm test           # local tests; no model calls
npm run check:api  # verify the selected provider; uses a small amount of API credits
npm run check:live # full analysis with sample chat; uses the selected provider's credits
```

## License

[MIT](LICENSE). Not affiliated with WeChat, Tencent, TypeSafe or any messaging platform mentioned here.

## Community projects

Community members have brought Crush Monitor to phones and desktops, with a few twists of their own. More projects can be added here over time:

| Project | What's different |
| --- | --- |
| [FQKH / Crush-](https://github.com/FQKH/Crush-) | Android APK with a DeepSeek analysis option. The repository currently provides an APK but not the full source code. |
| [RYANFFY / crush-monitor-pack](https://github.com/RYANFFY/crush-monitor-pack) | Windows and macOS installers that save you from running the setup commands yourself. |
| [Reverie0123 / crush-monitor-universal](https://github.com/Reverie0123/crush-monitor-universal) | Supports DeepSeek and OpenAI-compatible APIs, with an option to switch back to Jev; adds explanations, reply rewrites and analysis report export. |

These are unofficial projects maintained independently by community members. Check each repository before downloading, installing or entering an API key; this project does not guarantee their security or functionality.
