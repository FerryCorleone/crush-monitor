import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkNetwork,
  classifyStatus,
  NETWORK_TARGETS,
} from "../scripts/check-network";
import {
  recommendProvider,
  type ProviderAvailability,
} from "../shared/provider-recommendation";

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
  assert.equal(calls, NETWORK_TARGETS.length * 2);
  assert.equal(max, 4);
  assert.equal(r.modelCallVerified, false);
  assert.equal(r.providers.find((p) => p.id === "typesafe")?.candidate, false);
  assert.equal(r.providers.find((p) => p.id === "vercel")?.candidate, false);
  assert.equal(
    r.providers.find((p) => p.id === "openrouter")?.candidate,
    false,
  );
  assert.equal(r.providers.find((p) => p.id === "deepseek")?.candidate, true);
  assert.equal(r.providers.find((p) => p.id === "startlux")?.group, "decision");
  assert.ok(!JSON.stringify(r).includes("private-"));
});

function availability(
  id: string,
  status: "ok" | "blocked" | "unknown" | "challenge" | "limited",
): ProviderAvailability {
  const target = NETWORK_TARGETS.find((p) => p.id === id)!;
  const good = { status: "reachable" as const, httpStatus: 200, elapsedMs: 10 };
  const bad =
    status === "blocked"
      ? { status: "restricted" as const, httpStatus: 451, elapsedMs: 20 }
      : status === "challenge"
        ? { status: "restricted" as const, httpStatus: 403, elapsedMs: 20 }
        : status === "limited"
          ? { status: "rate-limited" as const, httpStatus: 429, elapsedMs: 20 }
          : { status: "unknown" as const, elapsedMs: 8000 };
  return {
    id,
    name: target.name,
    appChoice: target.name,
    group: target.group,
    keyUrl: target.website,
    website: status === "ok" ? good : bad,
    api: status === "ok" ? good : bad,
    candidate: status === "ok",
  };
}

test("recommendations prefer any reachable Jev, then native decisions, and only then an LLM", () => {
  const ids = NETWORK_TARGETS.map((p) => p.id);
  const scenario = (available: string[]) =>
    ids.map((id) =>
      availability(id, available.includes(id) ? "ok" : "blocked"),
    );
  assert.equal(
    recommendProvider(scenario(ids).reverse()).primary?.id,
    "typesafe",
  );
  assert.equal(
    recommendProvider(
      scenario(["openrouter", "startlux", "liquid", "deepseek"]),
    ).primary?.id,
    "openrouter",
  );
  assert.equal(
    recommendProvider(scenario(["opencode", "startlux", "deepseek"])).primary
      ?.id,
    "opencode",
  );
  assert.equal(
    recommendProvider(scenario(["startlux", "deepseek", "qwen"])).primary?.id,
    "startlux",
  );
  assert.equal(
    recommendProvider(scenario(["liquid", "deepseek"])).primary?.id,
    "liquid",
  );
  assert.equal(
    recommendProvider(scenario(["deepseek", "qwen"])).primary?.id,
    "deepseek",
  );
  assert.equal(recommendProvider(scenario(["qwen"])).primary?.id, "qwen");
  assert.equal(recommendProvider(scenario([])).status, "unavailable");
});

test("ambiguous Jev failures require browser/proxy review before suggesting a lower tier", () => {
  for (const status of ["unknown", "challenge", "limited"] as const) {
    const providers = NETWORK_TARGETS.map((p) =>
      availability(
        p.id,
        p.id === "typesafe"
          ? status
          : ["startlux", "deepseek"].includes(p.id)
            ? "ok"
            : "blocked",
      ),
    );
    const r = recommendProvider(providers);
    assert.equal(r.status, "needs-verification");
    assert.equal(r.primary, null);
    assert.equal(r.requiresBrowserVerification, true);
    assert.deepEqual(r.pendingProviders, ["typesafe"]);
  }
  const providers = NETWORK_TARGETS.map((p) =>
    availability(
      p.id,
      p.id === "startlux" ? "unknown" : p.id === "deepseek" ? "ok" : "blocked",
    ),
  );
  assert.equal(recommendProvider(providers).status, "needs-verification");
  assert.deepEqual(recommendProvider(providers).pendingProviders, ["startlux"]);
});

test("a fallback also respects unresolved native candidates instead of jumping to an LLM", () => {
  const providers = NETWORK_TARGETS.map((p) =>
    availability(
      p.id,
      p.id === "startlux"
        ? "unknown"
        : ["typesafe", "deepseek"].includes(p.id)
          ? "ok"
          : "blocked",
    ),
  );
  const r = recommendProvider(providers);
  assert.equal(r.primary?.id, "typesafe");
  assert.equal(r.fallback, null);
});

test("model choices cover Jev, StartLux and a domestic model in priority order, regardless of probe order", () => {
  const providers = NETWORK_TARGETS.map((p) => availability(p.id, "ok"));
  const r = recommendProvider(providers.reverse());
  assert.deepEqual(
    r.choices.map((p) => p.id),
    ["typesafe", "startlux", "deepseek"],
  );
  assert.ok(r.choices.some((p) => p.domestic));
  assert.ok(r.choices.every((p) => p.availability === "candidate"));
  assert.equal(r.primary?.id, "typesafe");
});

test("choose a reachable Jev host and Qwen when DeepSeek is blocked without dropping StartLux", () => {
  const r = recommendProvider(
    NETWORK_TARGETS.map((p) =>
      availability(
        p.id,
        ["opencode", "startlux", "qwen"].includes(p.id) ? "ok" : "blocked",
      ),
    ),
  );
  assert.deepEqual(
    r.choices.map((p) => p.id),
    ["opencode", "startlux", "qwen"],
  );
  assert.equal(r.primary?.id, "opencode");
});

test("showing three options never presents failed or uncertain routes as verified alternatives", () => {
  const r = recommendProvider(
    NETWORK_TARGETS.map((p) =>
      availability(
        p.id,
        p.id === "startlux"
          ? "unknown"
          : p.id === "deepseek"
            ? "ok"
            : "blocked",
      ),
    ),
  );
  assert.equal(r.primary, null);
  assert.equal(r.status, "needs-verification");
  assert.deepEqual(
    r.choices.map((p) => p.availability),
    ["unavailable", "needs-verification", "candidate"],
  );
});

test("a Liquid primary is retained in addition to the three default model choices", () => {
  const r = recommendProvider(
    NETWORK_TARGETS.map((p) =>
      availability(p.id, p.id === "liquid" ? "ok" : "blocked"),
    ),
  );
  assert.equal(r.primary?.id, "liquid");
  assert.deepEqual(
    r.choices.map((p) => p.id),
    ["typesafe", "startlux", "liquid", "deepseek"],
  );
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
