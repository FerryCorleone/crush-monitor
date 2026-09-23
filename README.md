# Crush 好感监控器

简体中文 · [English](README.en.md)

一个用 Jev 分析你和 Crush 或对象聊天的小工具。帮你读懂一点对方的情绪和想法，也看看自己的回复哪里没表达好、可以怎么调整。

不过，AI 不知道你们现实中怎么相处，也不了解聊天之外的故事。分析结果就当图一乐、做个参考。怎么理解对方、怎么表达自己，最后还是得靠自己的感受和真诚。

## 特点

- **微信风格界面**：还原聊天气泡，分析结果直接显示在消息下方。
- **情绪与意图**：每句两行标签，从 12 类情绪、35 类意图中分别展示概率最高的三项。
- **好感度与回复评级**：顶部显示好感信号评分，自己的回复按 SSS 到 D 分档，并给出下一步建议。
- **连续分析**：继续粘贴新记录即可更新，识别重复片段，自动分批处理长记录；已分析内容保存在本机，刷新后可以继续。
- **本机运行，自带 Key**：无需服务器，支持 TypeSafe 官方、Vercel AI Gateway 和 OpenRouter，使用自己的 Key 和额度。

## 为什么用 Jev

Jev 是 TypeSafe 推出的结构化判断模型，直接返回分类、评分和概率。这款工具主要需要逐句判断，不需要生成长篇回答，正好适合它的输出方式；情绪和意图也可以放在同一次请求里并行分析。

- [创始人 Diogo Almeida 的 Jev 首发推文（2026-09-15）](https://x.com/CompleteSkeptic/status/2099925682726002904)
- [官方模型介绍](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

## 申请 API Key

下面三个平台任选一个，都调用 Jev。不用同时注册，也不用把网站部署到 Vercel。

| 平台 | 创建 Key | 配置时选择 | 免费额度 |
| --- | --- | --- | --- |
| TypeSafe 官方 | 登录 [TypeSafe 控制台](https://console.typesafe.ai/)，在 API Keys 中创建并复制 Key | `typesafe` | 此前新用户有 **$5 试用额度**，后续是否赠送及金额以控制台为准 |
| Vercel AI Gateway | 注册或登录 Vercel，进入 [AI Gateway → API Keys](https://vercel.com/d?to=/%5Bteam%5D/~/ai-gateway/api-keys)，点击 **Create key**。需要的是 AI Gateway Key，不是账户 Access Token | `vercel` | 免费档 **每月 $5**；需绑卡验证，购买额度后不再享有每月赠额（[说明](https://vercel.com/docs/ai-gateway/pricing)） |
| OpenRouter | 注册或登录 [OpenRouter](https://openrouter.ai/settings/keys)，在 Keys 页面点击 **Create Key**，创建并复制 Key | `openrouter` | 新用户有少量试用额度，官方未公布固定金额；[Jev 为付费模型](https://openrouter.ai/typesafe/jev-1.13/)，不属于免费模型（[说明](https://openrouter.ai/support/)） |

Vercel AI Gateway 目前要求账号先绑定有效信用卡，免费调用也需要完成验证；否则会返回 403。

免费额度核对日期：2026-09-22。确认所选平台有可用额度及 Jev 访问权限；赠额和活动可能变化，以各平台控制台为准。

## 本地运行

需要 Node.js 22.12+。下载源码并解压，在项目目录运行（macOS、Windows、Linux 相同）：

```sh
npm ci
npm run setup
```

按提示**选择平台 → 粘贴该平台的 Key**。Key 输入时不显示，配置保存在本机 `.env`；地址和模型名自动设置。随后会用一条测试消息检测连接，消耗少量 API 额度，不读取你的聊天。

```sh
npm run build
npm start
```

打开 **http://127.0.0.1:3178/**。使用时保持终端运行；下次只需执行 `npm start`。切换平台或更换 Key，重新运行 `npm run setup`，然后重启服务，无需重新构建。

<details>
<summary>手动配置 / 旧版升级</summary>

也可以复制 `.env.example` 为 `.env`，只改这两行：

```dotenv
JEV_PROVIDER=vercel
JEV_API_KEY=你的平台Key
```

`JEV_PROVIDER` 只能填 `typesafe`、`vercel` 或 `openrouter`，Key 必须来自对应平台。不要填写 API 地址或模型名。原来的 `TYPESAFE_API_KEY=...` 配置仍然兼容，不切平台无需修改。

已有 `JEV_API_KEY` 时优先使用它；未填写时，按所选平台读取 `TYPESAFE_API_KEY`、`AI_GATEWAY_API_KEY` 或 `OPENROUTER_API_KEY`。不跨平台借用 Key。终端环境变量优先于 `.env`，排查配置时注意是否有旧的环境变量。

</details>

连接检测失败时，运行 `npm run check:api` 重试。401 检查 Key，402 检查额度，403 检查模型权限，429 等待限流恢复。网络错误需要检查本机到对应平台的连接。配置向导保存成功与连接检测通过会分开提示。

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
- 网页能打开但无法分析时，先检查启动终端、Key 和账号额度。不要把 `.env` 或私人聊天提交到仓库。

## 开发

React + TypeScript + Vite + Express。三平台共用同一套情绪、意图和评分规则，仅切换请求入口：

| 平台 | 接口 | 模型 |
| --- | --- | --- |
| TypeSafe | [System One](https://docs.typesafe.ai/api) | `jev-1.13.0` |
| Vercel | [TypeSafe 兼容接口](https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe) | `typesafe-ai/jev` |
| OpenRouter | [Decisions（Alpha）](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request) | `typesafe/jev-1.13` |

保留 Jev 原始概率和确定度，不通过 Chat Completions 模拟评分。Vercel 的模型别名由平台维护，实际版本可能更新；不同入口不保证给出完全相同的结果。三平台有离线协议与分析流程测试覆盖。2026-09-22 已用真实 Vercel 账号验证三种判断、好感度总览、情绪与意图、回复评级；OpenRouter 尚未完成真实账号调用验证。自己的账号是否可用，请运行 `npm run check:api`。

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

以上均为社区作者独立维护的非官方项目。下载、安装或填写 API Key 前，请自行核对各仓库说明；本项目不对其安全性和运行效果作保证。
