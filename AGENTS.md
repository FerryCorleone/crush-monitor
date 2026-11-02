# 给安装 Agent 的指引

适用于豆包、Codex、Claude Code 等能在用户电脑执行命令、打开浏览器的 Agent。用户让你“安装并打开”时，请完成到网页可操作，再交付获取 Key 的步骤。只有聊天或浏览器权限时，先说明需要本机命令执行能力，不要把云端沙箱当成用户电脑。

## 1. 安装并打开

- 检查操作系统、Node.js 和 npm。需要 Node.js **22.12+**；缺少时使用 [Node.js 官方安装包](https://nodejs.org/zh-cn/download)，按系统和架构选择。已有合适版本就直接使用。
- 仓库是 **https://github.com/FerryCorleone/crush-monitor**。安装到独立目录；已有目录先检查，保留聊天、`.env` 和 `.runtime`，不覆盖用户的 Key。不需要先申请 Key。
- 有 Git 可克隆；没有 Git 或克隆失败，可下载 [官方源码 ZIP](https://github.com/FerryCorleone/crush-monitor/archive/refs/heads/main.zip) 并解压。GitHub 主站下载失败时可尝试 [GitHub 官方下载域名](https://codeload.github.com/FerryCorleone/crush-monitor/zip/refs/heads/main)。这些都失败时，说明下载阻塞，不能声称已装好；不使用来历不明的镜像包。
- 在含 `package.json` 的目录依次执行：

  ```sh
  npm ci
  npm run build
  npm start
  ```

  npm 下载失败时，可说明使用 npmmirror 后，仅对本次安装执行 `npm ci --registry=https://registry.npmmirror.com`；不要改用户的全局 npm 源，不关闭锁文件完整性校验。
- 使用独立终端或 Agent 支持的持久进程启动，任务回复后保持服务运行。日常使用 `npm start`，不用带文件监听的 `npm run dev`。
- 检查 **http://127.0.0.1:3178/api/health**，再在用户电脑浏览器实际打开 **http://127.0.0.1:3178/**。首次无需 Key 即可看到模型设置。服务启动日志、构建成功不等于网页已打开。
- 3178 已被占用时，先确认是不是本项目的健康服务；是则复用，否则换空闲端口并告知实际地址，不结束用户其他程序。更换端口会使用另一份浏览器聊天存储，不能说旧记录丢了。不要把服务监听地址改成 `0.0.0.0`。

## 2. 检查网络，再推荐获取 Key 的路径

在**用户电脑**、同一个安装目录运行：

```sh
npm run --silent check:network -- --json
```

这会分别检查 Jev 的 TypeSafe、OpenCode、OpenRouter、Vercel，原生判断模型 StartLux · Bamboo、Liquid，以及 LLM DeepSeek、百炼的网站和 API。无需 Key，不读取本机配置、不发送聊天、不调用模型。最多约 25 秒；不更改代理、VPN 或 DNS。

**必须先完成检测，再推荐模型。用户没有指定平台时，按以下顺序，不能跳级：**

| 优先级 | 推荐范围 | 进入下一档的条件 |
| --- | --- | --- |
| 1 | **Jev**：TypeSafe、OpenCode、OpenRouter、Vercel | 先检查所有 Jev 入口；不能只因 TypeSafe 一个站点失败就跳过全部 Jev |
| 2 | **类似 Jev 的原生判断模型**：优先 StartLux · Bamboo，再考虑 Liquid AI | Jev 确实不可用、或用户明确放弃 Jev 后再选；只在国内网络下也先检查可访问的 StartLux，不直接跳到 LLM |
| 3 | **LLM 文本大模型**：DeepSeek、百炼等 | 前两档都无法使用，或用户明确要求 LLM 时才推荐 |

StartLux 是本仓库已接入的名称；用户口述“StarLark”时先结合上下文确认，不能自行新增不存在的预设。Bamboo 是第三方托管平台，不能仅凭可直连就称作国内厂商。Liquid 的数据使用条件见 README；OpenAI Decisions 暂不作为首次安装的默认推荐，用户明确选择时再指导。

默认读取检查结果中的 **`recommendation`**，不要根据 `providers` 数组位置、响应快慢、用户所在地或自己的偏好重新选平台：

- `status: candidate`：按 `primary.appChoice` 和 `primary.keyUrl` 给出一个主要方案，必要时仅一个备选。没有 Key 时只能说“建议使用，待填 Key 检测”，不能说已能调用模型。
- `status: needs-verification`：先复核 `pendingProviders`，**不能直接推荐 DeepSeek**。在用户当前浏览器打开对应注册页，确认可操作；再核对启动项目和检测命令的进程是否能走同一网络链路。浏览器和命令行可能使用不同代理，系统代理或 VPN 开启不保证 Node.js 请求自动走代理。不要自行关闭 VPN、强制直连、修改全局代理或 DNS。
- `status: unavailable`：说明当前未找到可用入口；依次核对 Jev → 原生判断 → LLM，给出一个能操作的下一步，不编造成功结果。

浏览器复核后，用实际结果补充判断，不需要向用户展示 JSON。若该档有可注册的入口但 API 仍不确定，先给这一档的注册和连接检测步骤，或说明具体阻塞；不能把“未确认”改写成“国内网络不可用”。批量复核一次即可；还不确定时说明限制，让用户决定是否试下一档，不循环重试。

**网络结果的含义：**401 是需要认证，不能判为网络不通；403 可能是防爬或权限问题，需要复核；451 是该次请求受地区限制；429 是暂时限流；超时不是全国都不可用。没有 Key 前的探测不能证明账号额度、地区权限或真实推理可用。最终以用户在项目里「检测连接并保存」为准。

本仓库曾遇到 OpenCode 大陆直连 451，只是当时那条网络链路的记录。**不能因此忽略用户当前的 VPN/代理，也不能把旧结论当作这次检测结果。** 用户明确使用代理时，按当前可用链路检查；不承诺免费活动长期有效，不自动切换付费型号。

用户已经指定平台或明确要求沿用自己的 Key 时，尊重其选择，不强行切换。已保存配置只能在用户同意沿用时继续使用；首次安装不要擅自读取或复用其他项目的凭据。

## 3. 给用户能直接照做的获取步骤

回复里必须贴**实际可点击的申请链接**和项目中的**准确选项名称**，不要只说“去官网申请”。按推荐方案抽取下表一行，不要整张表甩给新手。

| 方案 | 让用户自己操作的步骤 | 本项目中选择 |
| --- | --- | --- |
| Jev 官方 | 打开 https://console.typesafe.ai/ → 注册/登录 → API Keys → 创建并复制 Key。当前不再给新用户赠额，需确认余额。 | `Jev · TypeSafe`；型号自动配置 |
| OpenCode | 打开 https://opencode.ai/console/ → 邮箱注册并验证 → Settings → Service accounts → 创建 Key，Models 权限选 Request。当前限时免费型号为 `jev-1.13-free`，地区、活动和账号权限以实测为准。 | `Jev · OpenCode（限时免费）`；不切换付费型号 |
| DeepSeek | 打开 https://platform.deepseek.com/api_keys → 注册/登录 → API Keys → 创建并复制 Key。若提示额度不足，用户自行决定是否充值；不承诺免费赠额。 | `DeepSeek`；粘贴 Key 后从列表选快速文本型号，通常优先 Flash |
| 通义千问 | 打开 https://bailian.console.aliyun.com/ → 登录并按提示开通百炼 → 地域选**北京** → API Key → 创建并复制。各地域 Key 不能混用；试用额度以控制台为准。[官方创建说明](https://help.aliyun.com/zh/model-studio/get-api-key) | `通义千问 · 百炼（北京）`；从列表选 Qwen Flash 等快速文本型号 |
| StartLux | 打开 https://bamboonode.dev/register 注册并验证邮箱 → 登录后到 https://bamboonode.dev/tokens → 创建 Key，分组选 `default`。[当前活动说明](https://bamboonode.dev/docs/ai-model/decisions/startlux) | `StartLux · Bamboo（试验性）`；型号自动配置，默认自动思考 |

用户特别选择 OpenRouter 或 Vercel 时，使用 README「模型选择与 API Key」里的对应链接和说明，明确付费/绑卡条件；平台赠额不一定能用于 Jev。不要把聊天会员订阅当成 API 额度，不自动替用户充值或绑定支付方式。

## 4. 带用户配置并开始使用

最终回复必须是简短、可直接照做的操作清单：

- 开头最多两句：实际使用地址，以及推荐哪个平台、为什么。需要降级时简短说明上一档的具体阻塞，不展开技术分析。
- 后面使用 **1、2、3……的连续编号**，按该平台真正需要的操作拆分，**不规定固定步数**。每步只写一个明确目标；不要把注册、找 Key、打开设置、保存、导入聊天全挤进一大段。
- 顺序覆盖：申请链接和注册登录 → 创建并复制 Key → 打开本机网页的模型设置 → 选择准确平台并填写 Key/型号 → 检测并保存 → 复制聊天并开始分析。能自然合并的操作可以合并，需要分开的就分开。
- 必须给可点击的真实链接和界面里的准确选项。Jev、StartLux、Liquid 型号自动配置；LLM 等列表出现后选快速文本型号。不要让用户猜模型 ID。
- 不贴整张平台表、网络日志、HTTP 状态码、源码结构、开发思路或冗长原理。用户只需要知道接下来点哪里、填什么。
- 末尾用一两句说明 Key 在本机网页填写、不用发到对话；下次启动方式和停止方式。注册验证或付款需要用户操作时，在对应编号步骤里写清楚。

下面仅示范 StartLux 的写法，**不是要求每个平台使用同样步数**；实际回复按检测结论替换，不得机械推荐 StartLux：

> 已安装并打开：[好感监控器](http://127.0.0.1:3178/)。当前 Jev 入口受限，建议先用 StartLux，推广期无需充值。
>
> 1. 打开 [Bamboo 注册页](https://bamboonode.dev/register)，用邮箱完成注册并登录。
> 2. 进入 [API Keys](https://bamboonode.dev/tokens)，创建 Key，分组选 `default`，复制生成的 Key。
> 3. 回到[好感监控器](http://127.0.0.1:3178/)，打开「聊天设置 → 模型设置」，选择「StartLux · Bamboo（试验性）」，粘贴 Key；型号自动配置。
> 4. 点击「检测连接并保存」，等待连接成功。
> 5. 复制微信或 QQ 聊天记录并粘贴到网页，确认哪个昵称是自己，开始分析。
>
> Key 只填在本机网页，不用发给我。下次在 [实际安装目录] 运行 `npm start`；停止服务在运行终端按 `Ctrl+C`。

注册、验证码、实名或支付步骤由用户操作。用户直接在**本机网页**填写 Key；不要要求发到对话里，不把 Key 写进源码、命令行参数或日志。网页保存到 `.runtime/model.json`，优先于 `.env`；不需要让新手编辑文件。分析时相关聊天会发到所选模型平台，不要描述成离线分析。

连接检测失败时按页面提示处理：401 检查 Key；402 检查额度；403 检查权限/服务开通；451 换当前网络可用的平台；超时可重试一次或换快速型号。失败不会覆盖旧配置，不循环重试。没有用户授权，不把真实聊天发给平台作安装验收；可用项目示例或合成文本。

交付时区分：**网页已打开 / 模型连接已验证 / 示例分析已完成**。用户还没填 Key，就写“安装完成，待你填写 Key”，不能写“全部可用”。也不要把已完成安装的用户继续留在一堆开发命令里。
