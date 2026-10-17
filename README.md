# Crush 好感监控器

简体中文 · [English](README.en.md)

一个分析你和 Crush 或对象聊天的小工具，支持 Jev、OpenAI Decisions（测试版）和常见文本大模型。帮你读懂一点对方的情绪和想法，也看看自己的回复哪里没表达好、可以怎么调整。

不过，AI 不知道你们现实中怎么相处，也不了解聊天之外的故事。分析结果就当图一乐、做个参考。怎么理解对方、怎么表达自己，最后还是得靠自己的感受和真诚。

## 特点

- **微信风格界面**：还原聊天气泡，分析结果直接显示在消息下方。
- **情绪与意图**：每句两行标签，从 12 类情绪、35 类意图中分别展示概率最高的三项。
- **好感度与回复评级**：顶部显示好感信号评分，自己的回复按 SSS 到 D 分档，并给出下一步建议。
- **连续分析**：继续粘贴新记录即可更新，识别重复片段，自动分批处理长记录；已分析内容保存在本机，刷新后可以继续。
- **本机运行，网页配 Key**：启动后在页面选择平台、填写 Key、检测连接即可；无需改配置文件。

## 为什么用 Jev

Jev 是 TypeSafe 推出的结构化判断模型，直接返回分类、评分和概率。这款工具主要需要逐句判断，不需要生成长篇回答，正好适合它的输出方式；情绪和意图也可以放在同一次请求里并行分析。

- [创始人 Diogo Almeida 的 Jev 首发推文（2026-09-15）](https://x.com/CompleteSkeptic/status/2099925682726002904)
- [官方模型介绍](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

## 模型选择与 API Key

**建议优先用 Jev。** 本项目最初围绕它的分类、评分和概率输出设计。如果注册、支付或获取 Jev Key 不方便，可以改用 DeepSeek、通义千问等 LLM，情绪、意图、好感度和回复评级等功能保持不变。不同模型的结果会有差异，目前没有恋爱聊天场景的准确率排名。

### 首选：Jev

在下面任一平台创建 Key，再到网页选择对应的 **Jev** 入口。型号已预设，无需自己查找，也不需要把项目部署到 Vercel。

| 平台 | 创建 Key | 配置时选择 | 免费额度 |
| --- | --- | --- | --- |
| TypeSafe 官方 | 登录 [TypeSafe 控制台](https://console.typesafe.ai/)，在 API Keys 中创建并复制 Key | Jev · TypeSafe | **新用户目前不再赠送免费额度**。此前的 $5 活动已停止，恢复时间未定（[官方公告](https://x.com/typesafeai/status/2104337824292220981)） |
| OpenCode Console | [邮箱注册并验证](https://opencode.ai/console/)，在 Settings → Service accounts 创建 Key，Models 权限选 Request | Jev · OpenCode（限时免费） | **限时免费** `jev-1.13-free`；本次新账号未绑卡、未充值调用成功，不自动切换付费型号（[官方说明](https://opencode.ai/v2/docs/console/models/)） |
| Vercel AI Gateway | 注册或登录 Vercel，进入 [AI Gateway → API Keys](https://vercel.com/d?to=/%5Bteam%5D/~/ai-gateway/api-keys)，点击 **Create key**。需要的是 AI Gateway Key，不是账户 Access Token | Jev · Vercel AI Gateway | 平台免费档 **每月 $5，但当前不能用于 Jev**。Jev 标记为不支持免费额度，需购买额度（[型号列表](https://vercel.com/ai-gateway/models?q=jev)、[规则](https://vercel.com/docs/ai-gateway/pricing)） |
| OpenRouter | 注册或登录 [OpenRouter](https://openrouter.ai/settings/keys)，在 Keys 页面点击 **Create Key**，创建并复制 Key | Jev · OpenRouter | 官方称有少量新用户试用额度，但未明确金额及是否可用于 Jev。[Jev 为付费模型](https://openrouter.ai/typesafe/jev-1.13/)，没有可用余额需充值；不要把免费模型额度当成 Jev 额度（[说明](https://openrouter.ai/support/)） |

OpenCode 实测日期：**2026-10-13**。未绑卡、未充值完成了聊天分析；经代理调用正常，本次大陆直连返回 HTTP 451。它暂不能作为国内直连方案推荐；免费活动可能结束，不会自动切换付费版。

Vercel 免费档需完成信用卡验证（[官方说明](https://community.vercel.com/t/free-credits-temporarily-have-restricted-access-due-to-abuse/21461/8)）；购买额度后转为付费档，不再享有每月 $5 赠额。

其他平台额度核对日期：**2026-10-04**。平台赠额不等于 Jev 免费；使用前确认账户余额和型号权限，后续以官方政策及控制台为准。

### Liquid AI：d1-ultra

Liquid AI 的 d1-ultra 可用于情绪、意图和评分分析，直接返回分类、分数和概率。

| 平台 | 获取 Key | 网页选择 | 费用与额度 |
| --- | --- | --- | --- |
| Liquid 官方 | 登录 [Liquid Console](https://console.liquid.ai/)，在 Dashboard → API Keys 创建 Key | Liquid AI · d1-ultra | 新组织 US$2 试用；每百万输入 Token US$0.042，输出免费（[价格说明](https://www.liquid.ai/pricing)） |

填入 Key 后点击「检测连接并保存」，型号已预设。输入按每道问题计费，额度以控制台为准。聊天内容可能用于模型训练，使用前请了解[数据使用条款](https://www.liquid.ai/terms-conditions)。

### 试验性接入：OpenAI Decisions

在 [OpenAI 控制台](https://platform.openai.com/api-keys)创建 API Key，网页选择「OpenAI Decisions · GPT-6 Luna（测试版）」。型号和地址已预设，只需填 Key；原有情绪、意图、好感度、回复评级和下一步功能保持不变。

它通过[专用判断接口](https://developers.openai.com/api/docs/guides/decisions)直接返回概率、分类和评分，不生成长篇回答。目前处于公开测试，标准价格为每百万输入 Token $0.10，无输出 Token 费用；其他计费条件以官方为准。ChatGPT / Codex 订阅不包含 API 额度。

**本项目目前仅适配 OpenAI 官方 Decisions 接口，已通过本地与模拟接口测试，尚未完成真实调用验证。** 使用前先检测连接；账号权限、地区和额度仍需确认，暂不承诺速度或效果优于 Jev。

<details>
<summary>其他平台和免费额度</summary>

[Vercel](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-decisions) 与 [OpenRouter](https://openrouter.ai/openai/gpt-6-luna-decisions)也提供 GPT-6 Luna Decisions，但它们的型号、认证或请求格式不同，不能把 Key 直接填进本项目的 OpenAI 官方入口。

截至 **2026-10-13**，实测 Vercel 每月 $5 免费额度不能用于该型号，请求返回 403；OpenRouter 的新用户赠额是否可用尚未验证。该型号暂无实测通过的免费方案，未验证的独立转接平台不列为推荐。

</details>

### 备选：LLM 文本大模型

国内用户可从 DeepSeek 或通义千问开始；已有其他平台 Key，也可以使用对应入口。

| LLM 平台 | 申请 Key | 网页配置 | 免费额度 |
| --- | --- | --- | --- |
| [DeepSeek](https://platform.deepseek.com/api_keys) | API Keys → 创建 | 选择 DeepSeek，自动读取账号模型，优先 `deepseek-flash`（V4.1 Flash） | 不承诺赠额，以控制台为准 |
| [通义千问 · 百炼](https://bailian.console.aliyun.com/) | 创建北京地域 API Key | 选择百炼（北京），默认 `qwen3.8-flash` | 试用额度、模型范围和有效期以控制台为准 |
| [智谱 GLM](https://bigmodel.cn/usercenter/proj-mgmt/apikeys) | API Key → 创建 | 选择智谱，默认 `glm-4.7-flash`；确认账号可用模型 | 是否免费及限速以所选模型控制台为准 |
| [Kimi](https://platform.kimi.com/) / [豆包 · 火山方舟](https://console.volcengine.com/ark/) / [硅基流动](https://cloud.siliconflow.cn/account/ak) | 各平台控制台创建 | 选择平台，粘贴 Key 后自动显示模型列表；也可手动填写 ID；豆包也可填推理接入点 ID | 以平台、模型和活动为准 |
| [OpenAI](https://platform.openai.com/api-keys) / [Gemini](https://aistudio.google.com/apikey) / [Claude](https://platform.claude.com/settings/keys) | 各平台创建开发者 API Key | 选择平台后读取或填写模型 ID | 以账号和模型为准；聊天订阅不等于 API 额度 |
| [OpenRouter](https://openrouter.ai/settings/keys) / [Vercel AI Gateway](https://vercel.com/ai-gateway) | 创建平台 API Key | 选择带「LLM」的入口，填写平台模型 ID | 以平台及所选模型为准 |

- **选型号**：填 Key 后自动读取列表，可以搜索；点击型号会回填输入框并收起列表。若平台不提供列表，按其控制台填写模型 ID。
- **先选快速文本模型**：如 DeepSeek Flash、Qwen Flash。图片、语音、向量等专用型号会被过滤；深度思考模型可能等待更久。列表里能看到，不代表账号已开通或有可用额度，以连接检测为准。
- **检测并保存**：显示耗时，可随时取消，最长 40 秒；服务未开通或额度不足会明确提示。检测失败不会覆盖原来的配置。聊天会员订阅不等于 API 额度。

<details>
<summary>其他地域、第三方接口或本机模型</summary>

选择「其他 OpenAI / Claude 兼容服务」，填写服务商提供的 Base URL、模型 ID 和 Key；本机无鉴权服务可填 `local`。接口兼容不代表每个型号都已实测。

</details>

## 本地运行

需要 Node.js 22.12+。下载源码并解压，在项目目录运行（macOS、Windows、Linux 相同）：

```sh
npm ci
npm run build
npm start
```

服务启动后会尝试自动打开 **http://127.0.0.1:3178/**；没有打开就手动访问。首次进入会弹出「模型设置」：**选服务商 → 填 Key → 确认型号 → 检测连接并保存**。检测只发送测试题，使用少量 API 额度，不会读取聊天。失败不会覆盖原来的配置。

保持终端运行，下次只需 `npm start`。更换平台或 Key，在「聊天设置 → 模型设置」修改，保存后即时生效，无需重启。换模型会保留聊天、清除旧分析并重新分析，避免混用结果。

Key 保存在本机服务目录的 `.runtime/model.json`，不写入浏览器存储，也不会从设置接口返回完整 Key。这个文件是**本机明文配置**（macOS / Linux 限当前用户读写），不是加密保险箱；不要分享 `.runtime` 文件夹。配置页面只允许本机访问，默认服务也只监听本机。

<details>
<summary>旧版升级 / 命令行配置</summary>

旧 `.env` 中的 `JEV_PROVIDER`、`JEV_API_KEY`、`TYPESAFE_API_KEY` 仍兼容，`npm run setup` 仍可配置 Jev。**网页保存的配置优先于 `.env`**；如需恢复环境变量配置，删除 `.runtime/model.json` 后刷新页面。

网页预设不允许把平台 Key 悄悄发往另一个地址。切换服务商或 Base URL 后，需要重新填写对应 Key。无图形界面的环境可设置 `CRUSH_OPEN_BROWSER=0` 关闭自动打开浏览器。

</details>

401 检查 Key，402 检查额度，403 检查模型权限，404 检查模型 ID / 地址，429 等待限流恢复，451 检查平台地区与网络支持。如果接口不支持 `response_format`，在「连接选项」中关闭 JSON 模式再检测；返回结果仍会严格校验。

### 让 AI Agent 帮你安装

可以把仓库链接发给 Codex、Claude Code 等，让它按「本地运行」完成安装。给 Agent 的简短指引：

1. 检查 Node.js 版本，安装依赖、构建并启动服务；没有 Key 也可以先把网页打开，不必等待用户申请完。
2. 用户未指定模型时，先推荐 Jev 并给出上面的申请链接；获取不便时再介绍 LLM 备选，尊重用户已有的 Key 和选择。说明限时免费、网络限制及未实测入口，不承诺赠额或分析效果。
3. 引导用户在本机「模型设置」中填写 Key、选择型号并检测，不要求把 Key 发到对话里，也不必手改配置文件。失败时按页面提示检查权限、额度或型号，不反复盲目重试。
4. 交付时给出实际访问地址，说明如何下次启动、终端按 `Ctrl+C` 停止；分清「网页已启动」「连接检测通过」「聊天分析已验证」，没有验证的不要说已完成。

## 怎么用

1. 复制聊天记录，或打开导出的文本文件，将内容粘贴到网页输入框。
2. 选择哪个昵称是自己，点击“开始分析”；关系可在设置中调整。
3. 查看情绪、意图和回复评级，点击标签展开详情。
4. 有新聊天时继续粘贴，结果会随上下文更新。

### 支持的聊天格式

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

## 说明

- 好感度由主动延续、回应投入、关心体贴、自我开放、亲密表达、实际行动六项加权得出，点击顶部可看细项。明确且仍有效的拒绝会限制总分；分数不是对方喜欢你的概率。
- 长聊天自动分批，不再限制整个会话只能保存 500 条。追加时分析新增内容、复查最近的对方消息；自己的旧回复评级保留。
- 评分使用近期原文与相关历史原话。邀约、关心、拒绝、撤回等事件会被索引，但旧分数不会作为新评分的证据。历史检索可能遗漏相关线索，结果仍是辅助参考。
- 每个模型请求仍控制在 500 条、12,000 字以内；单条超长消息会保存并提示拆分。一次粘贴超过 25 万字符时请分次追加，历史总量受浏览器存储空间限制。
- 聊天和分析保存在当前浏览器的本机数据库，刷新后恢复；设置中的“清空聊天，重新开始”会删除这些记录。不同浏览器或不同网址端口不共享记录，清理浏览器数据也会删除记录。
- 分析所需原文会发送至你选择的平台及其模型服务商，模型用量由自己的账号承担；本机保存不等于离线分析。
- 网页能打开但无法分析时，先检查启动终端、Key 和账号额度。不要把 `.env`、`.runtime` 或私人聊天提交到仓库。

## 开发

React + TypeScript + Vite + Express。所有模型共用同一套情绪、意图、好感度、回复评级、下一步规则。支持 Liquid System One、OpenAI Chat Completions、Anthropic Messages、OpenAI Decisions，以及原来的 Jev 接口：

| 平台 | 接口 | 模型 |
| --- | --- | --- |
| TypeSafe | [System One](https://docs.typesafe.ai/api) | `jev-1.13.0` |
| Vercel | [TypeSafe 兼容接口](https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe) | `typesafe-ai/jev` |
| OpenRouter | [Decisions（Alpha）](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request) | `typesafe/jev-1.13` |
| OpenCode | [System One](https://opencode.ai/v2/docs/console/models/#jev) | `jev-1.13-free`（限时免费） |
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

## License

[MIT](LICENSE)。本项目与微信、腾讯及 TypeSafe 无隶属关系。

## 社区作品

有人已经把好感监控器搬上了手机和桌面，也加了自己的新玩法。欢迎来看看，后续有意思的版本也可以继续加进来：

| 项目 | 做了什么 |
| --- | --- |
| [FQKH / Crush-](https://github.com/FQKH/Crush-) | 安卓 APK 版，增加了 DeepSeek 分析选项；仓库目前提供安装包，未提供完整源码。 |
| [RYANFFY / crush-monitor-pack](https://github.com/RYANFFY/crush-monitor-pack) | Windows、macOS 安装包，省去手动运行命令的步骤。 |
| [Reverie0123 / crush-monitor-universal](https://github.com/Reverie0123/crush-monitor-universal) | 通用模型版，支持 DeepSeek / OpenAI 兼容接口，也可切回 Jev；增加判断理由、回复改写和分析报告导出。 |

以上均为社区作者独立维护的非官方项目。下载、安装或填写 API Key 前，请自行核对各仓库说明；本项目不对其安全性和运行效果作保证。
