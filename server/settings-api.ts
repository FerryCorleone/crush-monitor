import { isTextAnalysisModel } from "../shared/model-selection";
import { Router } from "express";
import { randomBytes } from "node:crypto";
import {
  publicSettings,
  saveSettings,
  settingsConfig,
  submittedSettings,
} from "./model-config";
import {
  checkProvider,
  httpError,
  providerErrorMessage,
  ProviderError,
} from "./provider";
import { ConfigurationError } from "./provider-config";
export const settingsRouter = Router();
const token = randomBytes(32).toString("hex");
let active = false;
settingsRouter.use((req, res, next) => {
  const remote = req.socket.remoteAddress;
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote || "")) {
    res.status(403).json({ error: "模型配置只能在本机访问。" });
    return;
  }
  if (
    req.method !== "GET" &&
    (!req.is("application/json") || req.get("x-config-token") !== token)
  ) {
    res.status(403).json({ error: "请刷新页面后重新配置。" });
    return;
  }
  next();
});
settingsRouter.get("/", (_req, res) =>
  res.json({ ...publicSettings(), token }),
);
settingsRouter.post("/:action", async (req, res) => {
  if (!["save", "models"].includes(req.params.action)) {
    res.sendStatus(404);
    return;
  }
  const saving = req.params.action === "save";
  if (saving && active) {
    res.status(429).json({ error: "正在检测连接，请稍候。" });
    return;
  }
  if (saving) active = true;
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  try {
    const settings = submittedSettings(
      req.params.action === "models"
        ? { ...req.body, model: "list-models" }
        : req.body,
    );
    const config = settingsConfig(settings);
    if (req.params.action === "models") {
      if (!("engine" in config) || config.engine !== "llm") {
        res.json({ models: [config.model] });
        return;
      }
      const response = await fetch(settings.baseUrl + "/models", {
        redirect: "error",
        headers:
          config.protocol === "anthropic"
            ? { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" }
            : { Authorization: `Bearer ${config.apiKey}` },
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(15000),
        ]),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw httpError(response.status, config.name);
      }
      const data = await response.json();
      const models = (Array.isArray(data.data) ? data.data : [])
        .map((m: { id?: unknown }) => m.id)
        .filter(
          (id: unknown): id is string =>
            typeof id === "string" && id.length < 200,
        )
        .filter(isTextAnalysisModel)
        .slice(0, 1000)
        .sort();
      res.json({ models });
      return;
    }
    // A failed test never replaces a working configuration.
    await checkProvider(
      config,
      AbortSignal.any([controller.signal, AbortSignal.timeout(40000)]),
    ).catch((error) => {
      if (error?.name === "TimeoutError")
        throw new ProviderError(
          504,
          "这个型号的连接检测超过 40 秒，请换一个快速文本型号或稍后重试。",
        );
      throw error;
    });
    controller.signal.throwIfAborted();
    saveSettings(settings);
    res.json({ ...publicSettings(), token });
  } catch (error) {
    if (!controller.signal.aborted)
      res
        .status(
          error instanceof ConfigurationError
            ? 400
            : error instanceof ProviderError
              ? error.status
              : 502,
        )
        .json({
          error:
            error instanceof ConfigurationError ||
            error instanceof ProviderError
              ? error.message
              : providerErrorMessage(error),
        });
  } finally {
    if (saving) active = false;
  }
});
