# Usage and development reference

[Back to README](../README.en.md) · [简体中文](reference.md)

## Chat formats

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

## More notes

- The affection score combines six dimensions: keeping the conversation going, engagement, care, openness, intimacy and concrete actions. Click the score for a breakdown. An explicit refusal that still applies limits the score. **It is not the probability that someone likes you.**
- Long conversations are processed in batches; the full history is not capped at 500 messages. New imports analyze new content and revisit recent messages from the other person. Previous grades for your own replies are retained.
- Scoring uses recent messages and relevant original excerpts from history, including invitations, care, refusals and retractions. Old scores are not evidence for new scores. Retrieval can miss context.
- Each model request stays within 500 messages and 12,000 text characters. Overlong individual messages are retained but need splitting before analysis. Paste at most 250,000 characters at a time; total history depends on browser storage capacity.
- Chats and results stay in this browser's local database. **清空聊天，重新开始** (Clear chat and start over) deletes them. Other browsers or URL ports do not share the same data; clearing browser data also removes it.
- Original messages needed for analysis are sent to your selected platform and its model provider using your account's credits. Local storage does not mean offline inference.
- If analysis fails, check the terminal, API key and account credits. Never commit `.env`, `.runtime` or private conversations.

## Connection and legacy configuration

Keys are stored in `.runtime/model.json` by the local server, never in browser storage or returned in settings responses. This is **plaintext local configuration**, restricted to the current user on macOS/Linux, not an encrypted vault. Do not share `.runtime`. Configuration endpoints are local-only; the service listens on loopback by default.

<details>
<summary>Upgrading / CLI configuration</summary>

Existing Jev `.env` settings remain supported, as does `npm run setup -- --en`. Browser-saved configuration takes precedence over `.env`. Delete `.runtime/model.json` to return to environment settings, then refresh. Changing provider or Base URL requires entering the matching key again. Set `CRUSH_OPEN_BROWSER=0` to disable automatic browser opening.

</details>

401: check key; 402: credits; 403: permissions; 404: model ID/endpoint; 429: rate limits; 451: region/network availability. If your endpoint does not support `response_format`, turn off JSON mode in connection options and test again; output validation remains strict.

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

## StartLux and Decisions verification

StartLux uses the AutoThink model. Quick judgment disables thinking on the same model; it does not select Instant. On 2026-11-02, real API tests with three synthetic messages covered emotions, intentions, reply ratings, affection and next steps, taking about 2.6–6.5 seconds per task. A separate request bypassing proxies took about 5.3 seconds. These are functionality checks, not comparative accuracy benchmarks.

OpenAI Decisions currently supports the official endpoint only and has passed local/mock tests, not real inference. Vercel and OpenRouter Decisions use different endpoints, model IDs or protocols; their keys cannot be entered under the official OpenAI preset. On 2026-10-13, a real Vercel test rejected free credits for the model; OpenRouter trial eligibility remained unverified.
