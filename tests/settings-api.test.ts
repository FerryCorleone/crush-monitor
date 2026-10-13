import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, get } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";

test("local HTTP settings: CSRF/host guards, successful verification, no secret readback, failed save preserves config", async () => {
  const mock = createServer(async (req, res) => {
    if (req.url === "/v1/models") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ data: [{ id: "test-model" }] }));
      return;
    }
    if (req.headers.authorization !== "Bearer local-test-key") {
      res.writeHead(401);
      res.end("secret-upstream-body");
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw),
      input = JSON.parse(body.messages.at(-1).content);
    const answers = Object.fromEntries(
      Object.entries(input.questions).map(([id, q]: [string, any]) => [
        id,
        q.type === "noul"
          ? 0.8
          : Object.keys(input.definitions[q.criteria]).map((_, i) =>
              i === 0 ? 1 : 0,
            ),
      ]),
    );
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            message: { content: JSON.stringify({ answers }) },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }),
    );
  });
  mock.listen(0, "127.0.0.1");
  await once(mock, "listening");
  const mockPort = (mock.address() as { port: number }).port;
  const reserve = createServer();
  reserve.listen(0, "127.0.0.1");
  await once(reserve, "listening");
  const port = (reserve.address() as { port: number }).port;
  await new Promise<void>((r) => reserve.close(() => r()));
  const dir = mkdtempSync(join(tmpdir(), "crush-settings-")),
    file = join(dir, "model.json");
  const child = spawn(
    process.execPath,
    [resolve("node_modules/tsx/dist/cli.mjs"), resolve("server/index.ts")],
    {
      cwd: dir,
      env: {
        ...process.env,
        PORT: String(port),
        HOST: "127.0.0.1",
        CRUSH_CONFIG_PATH: file,
        CRUSH_OPEN_BROWSER: "0",
        JEV_API_KEY: "",
        TYPESAFE_API_KEY: "",
        AI_GATEWAY_API_KEY: "",
        OPENROUTER_API_KEY: "",
      },
      stdio: "ignore",
    },
  );
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try {
        if ((await fetch(base + "/api/health")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await delay(50);
    }
    assert.ok(ready, "server started");
    const view = await (await fetch(base + "/api/settings")).json();
    assert.equal(view.configured, false);
    assert.ok(view.token);
    assert.equal(
      await new Promise<number | undefined>((resolve, reject) => {
        get(base + "/api/settings", { headers: { host: "evil.test" } }, (r) => {
          r.resume();
          resolve(r.statusCode);
        }).on("error", reject);
      }),
      403,
    );
    assert.equal(
      (
        await fetch(base + "/api/settings", {
          headers: { Origin: "https://evil.test" },
        })
      ).status,
      403,
    );
    const body = {
      preset: "custom",
      protocol: "openai",
      baseUrl: `http://127.0.0.1:${mockPort}/v1`,
      model: "test-model",
      apiKey: "local-test-key",
      jsonMode: true,
    };
    const post = (path: string, value: unknown, token = view.token) =>
      fetch(base + "/api/settings/" + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-config-token": token,
        },
        body: JSON.stringify(value),
      });
    assert.equal((await post("save", body, "bad-token")).status, 403);
    assert.equal(existsSync(file), false);
    assert.deepEqual(
      (
        await (
          await post("models", { ...body, model: "wrong model id with spaces" })
        ).json()
      ).models,
      ["test-model"],
    );
    assert.deepEqual(
      (
        await (
          await post("models", {
            preset: "openai-decisions",
            protocol: "decisions",
            baseUrl: "https://api.openai.com/v1",
            model: "wrong model id",
            apiKey: "test-only-key",
            jsonMode: false,
          })
        ).json()
      ).models,
      ["gpt-6-luna"],
    );
    assert.equal(existsSync(file), false);
    const saved = await post("save", body);
    assert.equal(saved.status, 200);
    const data = await saved.json();
    assert.equal(data.configured, true);
    assert.ok(!JSON.stringify(data).includes("local-test-key"));
    assert.equal(existsSync(file), true);
    assert.equal(
      (await post("save", { ...body, apiKey: "bad-key" })).status,
      401,
    );
    const after = await (await fetch(base + "/api/settings")).json();
    assert.equal(after.fingerprint, data.fingerprint);
    assert.ok(!JSON.stringify(after).includes("local-test-key"));
    assert.equal((await post("save", { ...body, apiKey: "" })).status, 200);
    assert.equal(
      (
        await post("save", {
          ...body,
          apiKey: "",
          baseUrl: body.baseUrl + "/other",
        })
      ).status,
      400,
    );
  } finally {
    child.kill();
    await once(child, "exit");
    await new Promise<void>((r) => mock.close(() => r()));
    rmSync(dir, { recursive: true, force: true });
  }
});
