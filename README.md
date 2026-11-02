# Crush 好感监控器

简体中文 · [English](README.en.md)

一个分析你和 Crush 或对象聊天的小工具，支持 Jev、StartLux、Liquid AI、OpenAI Decisions 和常见文本大模型。帮你读懂一点对方的情绪和想法，也看看自己的回复哪里没表达好、可以怎么调整。

不过，AI 不知道你们现实中怎么相处，也不了解聊天之外的故事。分析结果就当图一乐、做个参考。怎么理解对方、怎么表达自己，最后还是得靠自己的感受和真诚。

## 让 Agent 帮你安装

把下面这句话发给有本机操作权限的 Agent：

> 请先读取仓库的 AGENTS.md，帮我安装并打开这个项目。检测网络后，按 Jev → StartLux 等原生判断模型 → LLM 推荐，最后从获取 API Key 开始给我编号使用步骤：https://github.com/FerryCorleone/crush-monitor

**安装 Agent 请先读取 [AGENTS.md](AGENTS.md)**：先检查网络，再按上述顺序推荐。安装回复只需一句结果和编号使用步骤，从注册、创建 API Key 开始，到网页配置、导入聊天结束；不列多平台对比表，步骤后不追加注意事项。

## 特点

- **微信风格界面**：聊天气泡下直接显示情绪和意图的前三项概率。
- **好感度与回复评级**：查看整体好感信号，自己的回复按 SSS 到 D 分档，并给出下一步建议。
- **连续分析**：新记录自动合并去重、分批分析，刷新后可继续。
- **本机运行，网页配 Key**：在页面选平台、填 Key，无需改配置文件。

## 本地运行

需要 [Node.js 22.12+](https://nodejs.org/zh-cn/download)。下载源码，在项目目录运行，macOS、Windows、Linux 相同：

```sh
npm ci
npm run build
npm start
```

启动后打开 **http://127.0.0.1:3178/**。首次会弹出「模型设置」；之后从「聊天设置 → 模型设置」进入。终端保持运行，下次只需 `npm start`；停止服务按 `Ctrl+C`。

## 模型选择与 API Key

**优先推荐 Jev**：它直接返回分类、评分和概率，适合这款工具的逐句分析。[创始人首发推文](https://x.com/CompleteSkeptic/status/2099925682726002904) · [官方介绍](https://typesafe.ai/blog/introducing-system-one-models-and-jev)。按当前网络，优先选 Jev，其次选 StartLux 等原生判断模型，最后再选 DeepSeek、百炼等 LLM。分析功能相同，结果会有差异。

| 类型 | 平台与 Key 创建步骤 | 网页中选择 | 免费额度 / 注意事项 |
| --- | --- | --- | --- |
| Jev | [TypeSafe 官方](https://console.typesafe.ai/)：登录 → API Keys → 创建 | `Jev · TypeSafe` | 当前无新用户赠额，需有可用余额；型号自动配置 |
| Jev | [OpenCode](https://opencode.ai/console/)：邮箱注册 → Settings → Service accounts → 创建 Key，Models 选 Request | `Jev · OpenCode（限时免费）` | `jev-1.13-free` 限时免费；国内用户可能遇到地区限制 |
| Jev | [OpenRouter](https://openrouter.ai/settings/keys)：Create Key | `Jev · OpenRouter` | Jev 按量付费；试用额度是否适用，以控制台为准 |
| Jev | [Vercel AI Gateway](https://vercel.com/d?to=/%5Bteam%5D/~/ai-gateway/api-keys)：Create key | `Jev · Vercel AI Gateway` | 当前每月 $5 免费额度不能用于 Jev；需绑卡及可用付费额度。创建 Gateway Key，不是账户 Token |
| 原生判断 | [StartLux · Bamboo](https://bamboonode.dev/register)：注册 → [API Keys](https://bamboonode.dev/tokens) → 创建，分组选 `default` | `StartLux · Bamboo（试验性）` | 推广期免费，无需充值；由 Bamboo 提供 API，型号自动配置 |
| 原生判断 | [Liquid AI](https://console.liquid.ai/)：登录 → Dashboard → API Keys → 创建 | `Liquid AI · d1-ultra` | 新组织 $2 试用；每百万输入 Token $0.042，按每道问题计费；聊天可能用于训练，先看[数据条款](https://www.liquid.ai/terms-conditions) |
| 原生判断 | [OpenAI Decisions](https://platform.openai.com/api-keys)：创建官方 API Key | `OpenAI Decisions · GPT-6 Luna（测试版）` | 付费 API，测试版入口；ChatGPT/Codex 订阅不含 API 额度 |
| LLM | [DeepSeek](https://platform.deepseek.com/api_keys)：API Keys → 创建 | `DeepSeek` | 按量付费，赠额以控制台为准；优先选择 Flash 快速型号 |
| LLM | [通义千问 · 百炼](https://bailian.console.aliyun.com/)：地域选北京 → API Key → 创建 | `通义千问 · 百炼（北京）` | 试用额度以控制台为准；北京 Key 不能与其他地域混用，优先选 Qwen Flash |
| LLM | [智谱](https://bigmodel.cn/usercenter/proj-mgmt/apikeys)：创建 API Key | `智谱 GLM` | 免费情况及限速以所选型号为准 |
| LLM | [Kimi](https://platform.kimi.com/)：登录控制台 → 创建 API Key | `Kimi` | 以账号、型号和活动为准 |
| LLM | [豆包 · 火山方舟](https://console.volcengine.com/ark/)：控制台创建 API Key | `豆包 · 火山方舟` | 额度以控制台为准；也可填推理接入点 ID |
| LLM | [硅基流动](https://cloud.siliconflow.cn/account/ak)：创建 API Key | `硅基流动` | 以所选型号为准，不是所有型号都免费 |
| LLM | [OpenAI](https://platform.openai.com/api-keys) / [Gemini](https://aistudio.google.com/apikey) / [Claude](https://platform.claude.com/settings/keys)：各自创建 API Key | `OpenAI` / `Google Gemini` / `Anthropic Claude` | 以平台和账号为准；聊天会员不等于 API 额度 |
| LLM | [OpenRouter](https://openrouter.ai/settings/keys) / [Vercel](https://vercel.com/ai-gateway)：创建平台 Key | `OpenRouter · LLM` / `Vercel AI Gateway · LLM` | 以平台及所选型号为准；与上面的 Jev 入口区分 |
| 自定义 | 使用服务商提供的 Base URL、模型 ID 和 Key | `其他 OpenAI / Claude 兼容服务` | 支持兼容接口及本机模型；本机无鉴权服务可填 `local` |

粘贴 Key 后，LLM 会自动读取型号列表，选一个快速文本型号，再点「检测连接并保存」。若没有列表，按平台控制台填写模型 ID；检测失败不会覆盖旧配置。若提示 Key 无效或额度不足，回对应平台检查 Key 与余额。

免费政策可能变化，具体额度和使用条件以平台控制台为准。

## 怎么用

1. 在电脑微信或 QQ 多选聊天记录并复制，粘贴到网页。WhatsApp 可导出 `.txt` 后复制；iMessage 等可整理成 `昵称: 内容`。
2. 确认哪个昵称是自己，开始分析；关系可在「聊天设置」中调整。
3. 查看情绪、意图、回复评级和下一步建议；点击顶部好感度看细项。
4. 有新聊天继续粘贴即可，无需重新整理整段记录。

只支持两人文字聊天，不读取聊天软件数据库，也不后台监听。其他格式见[聊天记录示例](docs/reference.md#聊天记录格式)。界面目前为中文。

## 说明

- 好感度是聊天信号评分，不是“对方喜欢你的概率”。不同模型的结果也不能当作同一把尺子比较。
- 聊天和分析保存在当前浏览器；换浏览器、换端口或清理浏览器数据会影响记录。
- Key 明文保存在本机 `.runtime/model.json`，请勿分享 `.runtime` 或 `.env`。分析所需聊天会发给你选择的模型平台，并使用该账号的额度。

[常见问题、旧版配置与开发说明](docs/reference.md)

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
