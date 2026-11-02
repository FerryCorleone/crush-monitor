import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkNetwork,
  classifyStatus,
  NETWORK_TARGETS,
} from "../scripts/check-network";

test("network checks distinguish authentication, region restrictions and temporary failures from reachability", () => {
  for (const code of [200, 204])
    assert.equal(classifyStatus(code, false), "reachable");
  assert.equal(classifyStatus(401, true), "auth-required");
  for (const code of [403, 451])
    assert.equal(classifyStatus(code, true), "restricted");
  assert.equal(classifyStatus(429, true), "rate-limited");
  assert.equal(classifyStatus(503, true), "unavailable");
  assert.equal(classifyStatus(404, true), "unknown");
  assert.equal(classifyStatus(302, true), "unknown");
  assert.equal(classifyStatus(422, true), "reachable");
  assert.equal(classifyStatus(422, false), "unknown");
});

test("network checks send no keys or chats, bound concurrency and require both site and API for a candidate", async () => {
  let active = 0,
    max = 0,
    calls = 0;
  const mock: typeof fetch = async (url, options) => {
    calls++;
    active++;
    max = Math.max(max, active);
    assert.ok(options?.signal);
    assert.equal(options?.redirect, "manual");
    assert.equal(new Headers(options?.headers).get("authorization"), null);
    assert.equal(new Headers(options?.headers).get("cookie"), null);
    if (options?.method === "POST") assert.equal(options.body, "{}");
    else assert.equal(options?.body, undefined);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active--;
    const target = NETWORK_TARGETS.find(
      (t) => t.website === url || t.api === url,
    )!;
    if (target.id === "typesafe" && url === target.api)
      return new Response("private-response", { status: 451 });
    if (target.id === "vercel" && url === target.website)
      return new Response("private-response", { status: 403 });
    if (target.id === "openrouter") throw new Error("private-network-detail");
    return new Response("private-response", {
      status: url === target.website ? 200 : 401,
    });
  };
  const r = await checkNetwork(mock);
  assert.equal(calls, 14);
  assert.equal(max, 4);
  assert.equal(r.modelCallVerified, false);
  assert.equal(r.providers.find((p) => p.id === "typesafe")?.candidate, false);
  assert.equal(r.providers.find((p) => p.id === "vercel")?.candidate, false);
  assert.equal(
    r.providers.find((p) => p.id === "openrouter")?.candidate,
    false,
  );
  assert.equal(r.providers.find((p) => p.id === "deepseek")?.candidate, true);
  assert.equal(
    r.providers.find((p) => p.id === "startlux")?.group,
    "alternative",
  );
  assert.ok(!JSON.stringify(r).includes("private-"));
});

test("network checks follow bounded HTTPS website redirects without treating API redirects or loops as success", async () => {
  const calls = new Map<string, number>();
  const redirected = new Set<string>();
  const mock: typeof fetch = async (input) => {
    const url = String(input);
    calls.set(url, (calls.get(url) ?? 0) + 1);
    if (url === NETWORK_TARGETS[0].website) {
      const to = "https://example.test/login";
      redirected.add(to);
      return new Response(null, { status: 302, headers: { location: to } });
    }
    if (redirected.has(url)) return new Response(null, { status: 200 });
    if (url === NETWORK_TARGETS[1].website)
      return new Response(null, { status: 302, headers: { location: url } });
    if (url === NETWORK_TARGETS[2].website)
      return new Response(null, {
        status: 302,
        headers: { location: "http://example.test/" },
      });
    if (url === NETWORK_TARGETS[0].api)
      return new Response(null, {
        status: 307,
        headers: { location: "https://example.test/api" },
      });
    return new Response(null, { status: 401 });
  };
  const r = await checkNetwork(mock);
  assert.equal(r.providers[0].website.status, "reachable");
  assert.equal(r.providers[0].api.status, "unknown");
  assert.equal(r.providers[1].website.status, "unknown");
  assert.equal(calls.get(NETWORK_TARGETS[1].website), 4);
  assert.equal(r.providers[2].website.status, "unknown");
  assert.equal(calls.get("http://example.test/"), undefined);
  assert.equal(calls.get("https://example.test/api"), undefined);
});
