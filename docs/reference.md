# 使用与开发参考

[返回 README](../README.md) · [English](reference.en.md)

## 聊天记录格式

| 来源 | 粘贴方式 |
| --- | --- |
| 微信 | 电脑版多选复制的“昵称 → 时间 → 正文”三行格式 |
| QQ | `昵称: 09-17 19:26:53`，下一行是正文；也支持带年份的日期 |
| WhatsApp | [导出聊天](https://faq.whatsapp.com/1180414079177245/)后，打开 `.txt` 并复制内容；支持下方两种常见格式 |
| iMessage / 其他软件 | 将文字整理成 `昵称: 内容`，一条消息一个开头；支持英文和带空格的昵称 |

```text
[9/17/26, 7:26:53 PM] Alex: Dinner tonight?
[9/17/26, 7:27:00 PM] Me: Sounds good
```

```text
17/09/2026, 19:26 - Alex: Dinner tonight?
17/09/2026, 19:27 - Me: Sounds good
```

iMessage 等软件复制后若只有正文，没有发送人，请先补上 `Alex:` / `Me:`，程序不会猜谁说了哪句话。这里只兼容整理后的文字，未验证 iMessage 原生批量复制格式，也不读取它的数据库。WhatsApp 不同语言、版本的导出格式可能不同；以上格式有自动化测试覆盖，不代表所有客户端都已实测。

保留多行正文和连续同人发言，日期按原样保存，不猜月份/日期顺序或缺失年份。只支持两人文字对话，不解析图片、语音、ZIP、HTML 或聊天数据库，也不后台监听。界面和分析标签目前为中文，英文 README 不代表界面已英文化。

## 更多说明

- 好感度由主动延续、回应投入、关心体贴、自我开放、亲密表达、实际行动六项加权得出，点击顶部可看细项。明确且仍有效的拒绝会限制总分；分数不是对方喜欢你的概率。
- 长聊天自动分批，不再限制整个会话只能保存 500 条。追加时分析新增内容、复查最近的对方消息；自己的旧回复评级保留。
- 评分使用近期原文与相关历史原话。邀约、关心、拒绝、撤回等事件会被索引，但旧分数不会作为新评分的证据。历史检索可能遗漏相关线索，结果仍是辅助参考。
- 每个模型请求仍控制在 500 条、12,000 字以内；单条超长消息会保存并提示拆分。一次粘贴超过 25 万字符时请分次追加，历史总量受浏览器存储空间限制。
- 聊天和分析保存在当前浏览器的本机数据库，刷新后恢复；设置中的“清空聊天，重新开始”会删除这些记录。不同浏览器或不同网址端口不共享记录，清理浏览器数据也会删除记录。
- 分析所需原文会发送至你选择的平台及其模型服务商，模型用量由自己的账号承担；本机保存不等于离线分析。
- 网页能打开但无法分析时，先检查启动终端、Key 和账号额度。不要把 `.env`、`.runtime` 或私人聊天提交到仓库。

## 连接与旧版配置

Key 保存在本机服务目录的 `.runtime/model.json`，不写入浏览器存储，也不会从设置接口返回完整 Key。这个文件是**本机明文配置**（macOS / Linux 限当前用户读写），不是加密保险箱；不要分享 `.runtime` 文件夹。配置页面只允许本机访问，默认服务也只监听本机。

<details>
<summary>旧版升级 / 命令行配置</summary>

旧 `.env` 中的 `JEV_PROVIDER`、`JEV_API_KEY`、`TYPESAFE_API_KEY` 仍兼容，`npm run setup` 仍可配置 Jev。**网页保存的配置优先于 `.env`**；如需恢复环境变量配置，删除 `.runtime/model.json` 后刷新页面。

网页预设不允许把平台 Key 悄悄发往另一个地址。切换服务商或 Base URL 后，需要重新填写对应 Key。无图形界面的环境可设置 `CRUSH_OPEN_BROWSER=0` 关闭自动打开浏览器。

</details>

401 检查 Key，402 检查额度，403 检查模型权限，404 检查模型 ID / 地址，429 等待限流恢复，451 检查平台地区与网络支持。如果接口不支持 `response_format`，在「连接选项」中关闭 JSON 模式再检测；返回结果仍会严格校验。

## 开发

React + TypeScript + Vite + Express。所有模型共用同一套情绪、意图、好感度、回复评级、下一步规则。支持 Liquid System One、OpenAI Chat Completions、Anthropic Messages、OpenAI Decisions，以及原来的 Jev 接口：

| 平台 | 接口 | 模型 |
| --- | --- | --- |
| TypeSafe | [System One](https://docs.typesafe.ai/api) | `jev-1.13.0` |
| Vercel | [TypeSafe 兼容接口](https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe) | `typesafe-ai/jev` |
| OpenRouter | [Decisions（Alpha）](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request) | `typesafe/jev-1.13` |
| OpenCode | [System One](https://opencode.ai/v2/docs/console/models/#jev) | `jev-1.13-free`（限时免费） |
| StartLux · Bamboo | [原生 Decisions](https://bamboonode.dev/docs/ai-model/decisions/startlux) | `startlux-decision-27b-autothink` |
| Liquid AI | [System One](https://docs.liquid.ai/lfm/models/d1) | `d1-ultra` |
| OpenAI | [Decisions（公开测试）](https://developers.openai.com/api/docs/guides/decisions) | `gpt-6-luna`（仅模拟接口测试） |

Jev 保留原始概率和确定度。LLM 按相同问题和分类返回相对权重，代码归一化为分布并计算评分与分布集中度；LLM 百分比是模型估计，不是经校准的真实心理概率，也不能与 Jev 的结果直接当作同尺度测量。没有新增回复生成、改写或报告功能。

OpenAI Decisions 使用独立接口，把原有判断题映射成 predicate / choice / score，保留返回的原始概率、确定度和小数评分。按问题数及候选数量分批、最多并行两批，我方回复隔离后续聊天；拒答或不完整结果会报错，不补造分数。它与 Jev 的分数也不能直接视为同尺度测量。

LLM 使用独立的请求编排：共享分类定义、缩短输出编号、并行分析，逐句完成后只计算一次总览。DeepSeek 等已确认支持的型号会关闭深度思考；不支持关闭的型号沿用平台设置。我方回复仍隔离之后发生的聊天，避免拿后续结果倒推当时的表达质量。

返回值会校验选项、数量和数值范围。格式错误只重试未通过的判断；截断则自动拆小批、增加输出预算重试一次，仍失败就保留已完成批次并提示，不补造分数。百炼按具体型号处理思考参数，并兼容只支持流式返回的模型。连接检测最长 40 秒，可在页面取消；平台未开通服务、额度不足会分别提示。已用 DeepSeek 官方及百炼的 Qwen、DeepSeek、Kimi、GLM、MiniMax 代表型号做真实链路测试；其他平台的预设与协议测试不等于逐型号验证。尚未完成中文恋爱聊天的跨模型准确率评测。

```sh
npm run dev        # 开发模式：http://127.0.0.1:5178/
npm test           # 本地测试，不调用模型
npm run check:api  # 检查所选平台的 Key 和三种判断接口，使用少量 API 额度
npm run check:live # 用示例聊天检查完整分析，使用所选平台的 API 额度
```

## StartLux 与 Decisions 接入说明

StartLux 使用 AutoThink 型号；“快速判断”关闭该型号的思考，并非切换到 Instant。2026-11-02 的三条合成消息实测覆盖情绪、意图、回复评级、好感度和下一步，各任务约 2.6–6.5 秒；本机绕过代理的独立判断请求约 5.3 秒。速度与可用性随环境变化，未进行恋爱聊天场景的跨模型准确率评测。

OpenAI Decisions 目前只适配官方接口，并仅通过本地与模拟测试。Vercel、OpenRouter 的 Decisions 不能直接把 Key 填到官方入口；它们使用的地址、型号或协议不同。2026-10-13 实测 Vercel 的免费额度不能访问对应型号；OpenRouter 赠额资格尚未验证。
