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

这会检查 Jev 的 TypeSafe、OpenCode、OpenRouter、Vercel，以及 DeepSeek、百炼、StartLux · Bamboo 的网站和 API。无需 Key，不读取本机配置、不发送聊天、不调用模型。最多约 25 秒；不更改代理、VPN 或 DNS。结果反映当前命令行网络，浏览器与命令行可能使用不同的代理设置。

按以下顺序选择，只给用户**一个主要方案，必要时一个备选**：

1. 用户已有 Key 或指定平台：优先尊重其选择。已有网页配置能用时保留，不为了推荐平台强行切换。
2. Jev 平台的网站和 API 均可达：优先推荐 **Jev**。通常从官方 TypeSafe 开始；希望免费时，可考虑 OpenCode，但先确认当前限时活动和接口限制。不要默认把需绑卡的 Vercel 放在新手首选。
3. Jev 站点打不开、接口返回地区限制，或用户不愿折腾注册/支付：优先推荐**国内平台 DeepSeek**；无法使用时再给百炼（北京）。功能相同，判断结果可能不同。
4. 用户想免费试原生判断模型，且 Bamboo 网站与接口可达：可以提供 **StartLux · Bamboo** 备选。它是第三方托管平台，不要称作已确认的国内厂商或 Jev 官方；说明当前推广期免费，政策可能变化。

`candidate: true` 仅表示可尝试。**401 是需要认证；403 可能是防爬或权限问题；451 是当前请求受地区限制；429 是暂时限流；超时不是全国都不可用。** 网站 403 可用本机浏览器复核，但浏览器能打开注册页不代表模型可调用。没有 Key 前只能报告可达性；Key 填好后以项目的「检测连接并保存」为准。无法确认网络时如实说明，给国内方案，不反复等待国外站点。

特别注意：本仓库曾实测 OpenCode 的 Jev 在大陆直连返回 451。无 Key 的网络检查可能先得到参数或认证错误，不能据此认定地区限制已解除；不要把它当作已验证的国内免代理免费方案。平台活动和页面入口会变化，必要时查阅官方当前说明及 docs/reference.md 中的接入记录。

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

交付回复控制在几步，按实际平台改写：

> 已安装并打开：**[本机使用地址]**。
>
> 根据这台电脑的网络，建议先用 **[推荐平台]**：[一句话说明原因及是否收费]。
>
> 1. 打开 **[申请 Key 的完整链接]**，[该平台具体创建步骤]。
> 2. 回到好感监控器，首次进入会显示「模型设置」；之后从「聊天设置 → 模型设置」打开。
> 3. 选择 **[项目里准确的平台名称]**，把 Key 粘贴到网页。**[Jev / StartLux 型号自动配置；LLM 等列表出现后选一个快速文本型号]**，点击「检测连接并保存」。
> 4. 在电脑微信或 QQ 多选聊天记录并复制，粘贴到网页；确认哪个昵称是自己，再开始分析。
>
> Key 不用发给我。下次使用，在 **[实际安装路径]** 运行 `npm start`，再打开 **[实际网址]**。关闭服务，在运行它的终端按 `Ctrl+C`。

注册、验证码、实名或支付步骤由用户操作。用户直接在**本机网页**填写 Key；不要要求发到对话里，不把 Key 写进源码、命令行参数或日志。网页保存到 `.runtime/model.json`，优先于 `.env`；不需要让新手编辑文件。分析时相关聊天会发到所选模型平台，不要描述成离线分析。

连接检测失败时按页面提示处理：401 检查 Key；402 检查额度；403 检查权限/服务开通；451 换当前网络可用的平台；超时可重试一次或换快速型号。失败不会覆盖旧配置，不循环重试。没有用户授权，不把真实聊天发给平台作安装验收；可用项目示例或合成文本。

交付时区分：**网页已打开 / 模型连接已验证 / 示例分析已完成**。用户还没填 Key，就写“安装完成，待你填写 Key”，不能写“全部可用”。也不要把已完成安装的用户继续留在一堆开发命令里。
