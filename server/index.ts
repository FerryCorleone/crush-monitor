import { execFile } from "node:child_process";
import "dotenv/config";
import express from "express";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { analyze, requestSchema } from "./analysis";
import { ConfigurationError } from "./provider-config";
import {
  activeConfig,
  configFingerprint,
  publicSettings,
} from "./model-config";
import { settingsRouter } from "./settings-api";
import { ProviderError, providerErrorMessage } from "./provider";
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "512kb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  next();
});
// Host allowlist prevents a DNS-rebound website from reading the local config token.
app.use("/api", (req, res, next) => {
  const host = req.headers.host || "";
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) {
    res.status(403).json({ error: "请使用本机地址访问。" });
    return;
  }
  const origin = req.headers.origin;
  const allowed = [
    `http://${host}`,
    "http://127.0.0.1:5178",
    "http://localhost:5178",
  ];
  if (origin && !allowed.includes(origin)) {
    res.status(403).json({ error: "请求来源不允许" });
    return;
  }
  next();
});
app.use("/api/settings", settingsRouter);
app.get("/api/health", (_req, res) => {
  const s = publicSettings();
  res.json({
    configured: s.configured,
    engine:
      s.protocol === "jev"
        ? "jev"
        : s.protocol === "systemone"
          ? "liquid"
          : s.protocol === "decisions"
            ? "decisions"
            : "llm",
    provider: s.preset,
    model: s.model,
    fingerprint: s.fingerprint,
  });
});
let calls = 0;
let windowAt = Date.now();
let active = 0;
const budgets = new Map<string, { count: number; at: number }>();
app.post("/api/analyze", async (req, res) => {
  const origin = req.headers.origin;
  if (
    origin &&
    origin !== `${req.protocol}://${req.headers.host}` &&
    !["http://127.0.0.1:5178", "http://localhost:5178"].includes(origin)
  ) {
    res.status(403).json({ error: "请求来源不允许" });
    return;
  }
  const valid = requestSchema.safeParse(req.body);
  if (!valid.success) {
    res.status(400).json({ error: "聊天结构或长度不符合要求，请校正后重试" });
    return;
  }
  const configuration = publicSettings();
  if (!configuration.configured) {
    res
      .status(503)
      .json({ error: "请先打开模型设置，填写 API Key 并检测连接。" });
    return;
  }
  const now = Date.now();
  if (now - windowAt > 3600000) {
    calls = 0;
    windowAt = now;
    budgets.clear();
  }
  const key = req.ip || "local";
  let entry = budgets.get(key);
  if (!entry || now - entry.at > 60000) {
    entry = { count: 0, at: now };
    budgets.set(key, entry);
  }
  if (entry.count >= 180 || calls >= 3000 || active >= 8) {
    res.setHeader(
      "Retry-After",
      String(
        calls >= 3000
          ? Math.max(1, Math.ceil((windowAt + 3600000 - now) / 1000))
          : Math.max(1, Math.ceil((entry.at + 60000 - now) / 1000)),
      ),
    );
    res.status(429).json({ error: "分析请求较多，已保留进度，请稍后继续" });
    return;
  }
  entry.count++;
  calls++;
  active++;
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  try {
    const config = activeConfig();
    const expected = req.get("x-model-fingerprint");
    if (expected && expected !== configFingerprint(config)) {
      res.status(409).json({ error: "模型配置已更改，请重新开始分析。" });
      return;
    }
    const result = await analyze(valid.data, controller.signal, config);
    if (configFingerprint(activeConfig()) !== configFingerprint(config)) {
      res.status(409).json({ error: "模型配置已更改，请重新开始分析。" });
      return;
    }
    res.json(result);
  } catch (error) {
    const code = Number((error as { status?: number }).status) || 502;
    if (!res.headersSent && !controller.signal.aborted)
      res.status(code >= 400 && code < 600 ? code : 502).json({
        error:
          error instanceof ConfigurationError || error instanceof ProviderError
            ? error.message
            : providerErrorMessage(error),
      });
  } finally {
    active--;
  }
});
const dist = join(dirname(fileURLToPath(import.meta.url)), "../dist");
app.use(express.static(dist));
app.get("/", (_req, res) => res.sendFile(join(dist, "index.html")));
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res
      .status(
        (err as { type?: string }).type === "entity.too.large" ? 413 : 400,
      )
      .json({ error: "输入格式或体积不受支持" });
  },
);
const port = Number(process.env.PORT || 3178);
app.listen(port, process.env.HOST || "127.0.0.1", () => {
  if (process.env.CRUSH_OPEN_BROWSER === "1") {
    const url = `http://127.0.0.1:${port}/`;
    const command =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "rundll32"
          : "xdg-open";
    execFile(
      command,
      process.platform === "win32"
        ? ["url.dll,FileProtocolHandler", url]
        : [url],
      () => {},
    );
  }
  const status = publicSettings();
  console.log(`Crush API: http://${process.env.HOST || "127.0.0.1"}:${port}`);
  console.log(
    status.configured
      ? `Model: ${status.preset} · ${status.model} · Key configured (not yet verified)`
      : "请在网页中设置模型和 API Key。",
  );
});
