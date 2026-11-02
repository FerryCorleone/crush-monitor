import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { MODEL_PRESETS } from "../shared/model-presets";
import { PROVIDERS } from "../server/provider-config";

type Status =
  | "reachable"
  | "auth-required"
  | "restricted"
  | "rate-limited"
  | "unavailable"
  | "unknown";
type Probe = { status: Status; httpStatus?: number; elapsedMs: number };
type Target = {
  id: string;
  group: "jev" | "mainland" | "alternative";
  name: string;
  website: string;
  api: string;
  method: "GET" | "POST";
};
const native = (
  id: keyof typeof PROVIDERS,
  group: Target["group"],
): Target => ({
  id,
  group,
  name: PROVIDERS[id].name,
  website: PROVIDERS[id].keyUrl,
  api: PROVIDERS[id].endpoint,
  method: "POST",
});
const llm = (id: "deepseek" | "qwen"): Target => {
  const p = MODEL_PRESETS.find((p) => p.id === id)!;
  return {
    id,
    group: "mainland",
    name: p.name,
    website: p.keyUrl,
    api: p.baseUrl + "/models",
    method: "GET",
  };
};
export const NETWORK_TARGETS: Target[] = [
  native("typesafe", "jev"),
  native("opencode", "jev"),
  native("openrouter", "jev"),
  native("vercel", "jev"),
  llm("deepseek"),
  llm("qwen"),
  native("startlux", "alternative"),
];

export function classifyStatus(code: number, api: boolean): Status {
  if (code >= 200 && code < 300) return "reachable";
  if (code === 401) return "auth-required";
  if (code === 403 || code === 451) return "restricted";
  if (code === 429) return "rate-limited";
  if (api && [400, 405, 415, 422].includes(code)) return "reachable";
  if (code >= 500) return "unavailable";
  return "unknown";
}

// No dotenv, credentials, chat data, model inference, or proxy/DNS changes.
// A reachable endpoint is only a candidate until the user's own key passes.
export async function checkNetwork(fetchImpl: typeof fetch = fetch) {
  const deadline = AbortSignal.timeout(25000);
  const probes: Probe[] = [];
  const jobs = NETWORK_TARGETS.flatMap((target) => [
    { url: target.website, method: "GET", api: false },
    { url: target.api, method: target.method, api: true },
  ]);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const index = next++,
        job = jobs[index],
        started = Date.now();
      const signal = AbortSignal.any([deadline, AbortSignal.timeout(8000)]);
      try {
        let url = job.url;
        for (let redirects = 0; ; redirects++) {
          const response = await fetchImpl(url, {
            method: job.method,
            redirect: "manual",
            signal,
            ...(job.method === "POST"
              ? { headers: { "Content-Type": "application/json" }, body: "{}" }
              : {}),
          });
          // Never print or retain provider bodies, cookies or redirect URLs.
          await response.body?.cancel();
          if ([301, 302, 303, 307, 308].includes(response.status) && !job.api) {
            const location = response.headers.get("location");
            if (!location || redirects >= 3)
              throw new Error("Redirect not resolved");
            const destination = new URL(location, url);
            if (
              destination.protocol !== "https:" ||
              destination.username ||
              destination.password
            )
              throw new Error("Unsupported redirect");
            url = destination.href;
            continue;
          }
          probes[index] = {
            status: classifyStatus(response.status, job.api),
            httpStatus: response.status,
            elapsedMs: Date.now() - started,
          };
          break;
        }
      } catch {
        probes[index] = { status: "unknown", elapsedMs: Date.now() - started };
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  const accessible = (probe: Probe) =>
    ["reachable", "auth-required"].includes(probe.status);
  const providers = NETWORK_TARGETS.map((target, i) => ({
    id: target.id,
    name: target.name,
    group: target.group,
    keyUrl: target.website,
    website: probes[i * 2],
    api: probes[i * 2 + 1],
    candidate: accessible(probes[i * 2]) && accessible(probes[i * 2 + 1]),
  }));
  return {
    checkedAt: new Date().toISOString(),
    modelCallVerified: false,
    note: "仅检查当前命令行网络下的网站和无 Key 接口可达性；401 表示需要认证，不代表 Key、地区、额度或模型调用已验证。403 也可能是防爬限制，可用本机浏览器复核网站。",
    providers,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const report = await checkNetwork();
  if (process.argv.includes("--json"))
    console.log(JSON.stringify(report, null, 2));
  else {
    const labels: Record<Status, string> = {
      reachable: "可达",
      "auth-required": "可达，需 Key/登录",
      restricted: "访问受限",
      "rate-limited": "暂时限流",
      unavailable: "服务暂不可用",
      unknown: "未确认",
    };
    for (const p of report.providers)
      console.log(
        `${p.name}：网站 ${labels[p.website.status]}；接口 ${labels[p.api.status]} → ${p.keyUrl}`,
      );
    console.log(report.note);
  }
}
