# Crush Monitor

[简体中文](README.md) · English

A Jev-powered tool for looking at conversations with your crush or partner. It helps you make sense of emotions and intentions, and spot replies you could have worded better.

AI doesn't know your relationship or what happens outside the chat. Take the results lightly—as another perspective. Your own judgment and an honest conversation still matter more.

## Features

- **WeChat-style conversation view:** analysis sits beneath each message.
- **Emotions and intentions:** the top three probabilities from 12 emotion and 35 intention categories.
- **Affection score and reply grades:** a conversation-level score, SSS–D grades for your replies, and suggested next steps.
- **Ongoing analysis:** paste more messages to continue. Overlapping excerpts are detected, long conversations run in batches, and results survive a page refresh.
- **Run locally with your own key:** choose TypeSafe, Vercel AI Gateway or OpenRouter and use your own API credits. No hosted deployment required.

The interface and analysis labels are currently in Chinese. This README provides English setup instructions; it does not add an English UI.

## Why Jev?

Jev is TypeSafe's model for structured judgments, returning classifications, scores and probabilities. This app needs short, per-message assessments rather than long generated answers. Emotion and intention judgments can also run in parallel within a request.

- [Launch post by founder Diogo Almeida](https://x.com/CompleteSkeptic/status/2099925682726002904)
- [Official introduction](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

## Get an API key

Choose **one** provider below. All three serve Jev; you do not need three accounts or a Vercel-hosted website.

| Provider | Create a key | Setup choice | Free credits |
| --- | --- | --- | --- |
| TypeSafe | Sign in to the [TypeSafe console](https://console.typesafe.ai/), create a key under API Keys and copy it | `typesafe` | New users previously received **$5 in trial credits**; check the console for current availability and amount |
| Vercel AI Gateway | Sign in to Vercel, open [AI Gateway → API Keys](https://vercel.com/d?to=/%5Bteam%5D/~/ai-gateway/api-keys) and select **Create key**. Use an AI Gateway key, not a Vercel account Access Token | `vercel` | **$5/month** on the free tier; card verification required. Purchasing credits ends the monthly free grant ([details](https://vercel.com/docs/ai-gateway/pricing)) |
| OpenRouter | Sign in to [OpenRouter Keys](https://openrouter.ai/settings/keys), select **Create Key** and copy the new key | `openrouter` | A small new-user trial allowance, with no fixed amount publicly specified. [Jev is paid](https://openrouter.ai/typesafe/jev-1.13/), not a free model ([details](https://openrouter.ai/support/)) |

Vercel AI Gateway currently requires a valid credit card on the account, including for free usage. Without verification, requests return 403.

Free-credit information checked on 2026-09-22. Make sure the account has available credits and access to Jev; grants and promotions may change, so check the provider's dashboard.

## Run locally

Install Node.js 22.12+. Download or clone this repository, then run these commands in the project directory. The same commands work on macOS, Windows and Linux.

```sh
npm ci
npm run setup -- --en
```

**Choose the provider, then paste its key.** Key input is hidden and saved in the local `.env`. The endpoint and model are set automatically. Setup sends one synthetic test request to verify the connection, using a small amount of API credits without reading your chats.

```sh
npm run build
npm start
```

Open **http://127.0.0.1:3178/** and leave the terminal running. Next time, just run `npm start`. To change providers or keys, run setup again and restart the service; no rebuild is required.

<details>
<summary>Manual configuration / upgrading an existing installation</summary>

Alternatively, copy `.env.example` to `.env` and edit only these two lines:

```dotenv
JEV_PROVIDER=vercel
JEV_API_KEY=your_provider_key
```

Allowed providers: `typesafe`, `vercel`, `openrouter`. The key must belong to the selected provider. Do not add an API URL or model name. The old `TYPESAFE_API_KEY=...` configuration still works without changes when staying with TypeSafe.

`JEV_API_KEY` takes precedence. If unset, the selected provider uses `TYPESAFE_API_KEY`, `AI_GATEWAY_API_KEY` or `OPENROUTER_API_KEY`, respectively. Credentials are never borrowed from a different provider. Shell environment variables take precedence over `.env`; remove stale shell settings if necessary.

</details>

Run `npm run check:api` to retry the connection test. For 401, check the key; 402, credits; 403, model permissions; 429, rate limits. For network errors, check connectivity to the selected provider. Setup reports saved configuration and successful verification separately.

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
- If analysis fails, check the terminal, API key and account credits. Never commit `.env` or private conversations.

## Development

React + TypeScript + Vite + Express. The same emotion, intention and scoring rules run through three endpoints:

| Provider | API | Model |
| --- | --- | --- |
| TypeSafe | [System One](https://docs.typesafe.ai/api) | `jev-1.13.0` |
| Vercel | [TypeSafe-compatible API](https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe) | `typesafe-ai/jev` |
| OpenRouter | [Decisions (Alpha)](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request) | `typesafe/jev-1.13` |

Native Jev probabilities and confidence are preserved; Chat Completions is not used to simulate scores. Vercel manages its model alias, so the underlying version may change. Results are not guaranteed to be identical across providers. Offline tests cover all three adapters and the analysis pipeline. On 2026-09-22, a real Vercel account passed checks for all three question types, the affection overview, emotions, intentions and reply grades. OpenRouter has not yet been verified with a real account. Run `npm run check:api` to verify your own access.

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

These are unofficial projects maintained independently by community members. Check each repository before downloading, installing or entering an API key; this project does not guarantee their security or functionality.
