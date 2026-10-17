import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";

test("Liquid local settings retain working config on failure/cancel, reuse only the same provider key, and expose no key", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "crush-liquid-settings-"));
  const oldConfigPath = process.env.CRUSH_CONFIG_PATH;
  process.env.CRUSH_CONFIG_PATH = join(dir, "model.json");
  const { saveSettings, publicSettings } =
    await import("../server/model-config");
  const { settingsRouter } = await import("../server/settings-api");
  const { ProviderError } = await import("../server/provider");
  const original = globalThis.fetch;
  let mode: "ok" | "fail" | "cancel" = "ok";
  let started: () => void = () => {};
  globalThis.fetch = async (url, options) => {
    if (String(url) !== "https://api.liquid.ai/decisions/v1/systemone")
      return original(url, options);
    if (mode === "fail")
      return new Response("secret-body test-only-liquid-key", { status: 401 });
    if (mode === "cancel") {
      started();
      return new Promise((_resolve, reject) => {
        const stop = () => reject(new ProviderError(499, "cancelled"));
        if (options?.signal?.aborted) stop();
        else options?.signal?.addEventListener("abort", stop, { once: true });
      });
    }
    const body = JSON.parse(String(options?.body));
    return Response.json({
      model: "d1-ultra",
      usage: { input_tokens: 10, output_tokens: 0 },
      answers: Object.fromEntries(
        Object.entries(body.questions).map(([id, q]: [string, any]) => [
          id,
          q.type === "noul"
            ? { type: "noul", noul: 0.9 }
            : {
                type: q.type,
                confidence: 1,
                probabilities: Object.fromEntries(
                  Object.keys(q.criteria).map((key, i) => [
                    key,
                    i === 0 ? 1 : 0,
                  ]),
                ),
                ...(q.type === "choice"
                  ? { choice: Object.keys(q.criteria)[0] }
                  : { score: 0 }),
              },
        ]),
      ),
    });
  };
  t.after(() => {
    globalThis.fetch = original;
    if (oldConfigPath === undefined) delete process.env.CRUSH_CONFIG_PATH;
    else process.env.CRUSH_CONFIG_PATH = oldConfigPath;
    rmSync(dir, { recursive: true, force: true });
  });
  const app = express();
  app.use(express.json());
  app.use("/settings", settingsRouter);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const base = `http://127.0.0.1:${(server.address() as any).port}/settings`;
  const view = await (await original(base)).json();
  const settings = {
    preset: "liquid",
    protocol: "systemone",
    baseUrl: "https://api.liquid.ai/decisions/v1",
    model: "d1-ultra",
    apiKey: "test-only-liquid-key",
    jsonMode: false,
  };
  const post = (action: string, body: unknown, signal?: AbortSignal) =>
    original(base + "/" + action, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-config-token": view.token,
      },
      body: JSON.stringify(body),
      signal,
    });
  const oldSettings = {
    ...settings,
    preset: "deepseek",
    protocol: "openai" as const,
    baseUrl: "https://api.deepseek.com/v1",
    model: "test-model",
    apiKey: "test-only-other-key",
  };
  saveSettings(oldSettings);
  const old = readFileSync(process.env.CRUSH_CONFIG_PATH!, "utf8");
  assert.equal((await post("save", { ...settings, apiKey: "" })).status, 400);
  mode = "fail";
  const failed = await post("save", settings);
  assert.equal(failed.status, 401);
  assert.ok(!/secret-body|test-only-liquid-key/.test(await failed.text()));
  assert.equal(readFileSync(process.env.CRUSH_CONFIG_PATH!, "utf8"), old);
  mode = "cancel";
  const begun = new Promise<void>((resolve) => (started = resolve));
  const controller = new AbortController();
  const cancelled = post("save", settings, controller.signal);
  await begun;
  controller.abort();
  await assert.rejects(cancelled);
  // Wait until the server observes the closed client connection.
  let available = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    mode = "fail";
    const response = await post("save", settings);
    if (response.status !== 429) {
      available = true;
      assert.equal(response.status, 401);
      break;
    }
  }
  assert.ok(available);
  assert.equal(readFileSync(process.env.CRUSH_CONFIG_PATH!, "utf8"), old);
  mode = "ok";
  assert.deepEqual((await (await post("models", settings)).json()).models, [
    "d1-ultra",
  ]);
  assert.equal((await post("save", settings)).status, 200);
  const current = await (await original(base)).json();
  assert.equal(current.protocol, "systemone");
  assert.equal(current.model, "d1-ultra");
  assert.notEqual(current.fingerprint, view.fingerprint);
  assert.ok(!JSON.stringify(current).includes("test-only-liquid-key"));
  assert.equal((await post("save", { ...settings, apiKey: "" })).status, 200);
  assert.equal(
    (await post("save", { ...oldSettings, apiKey: "" })).status,
    400,
  );
  assert.equal(publicSettings().preset, "liquid");
});
