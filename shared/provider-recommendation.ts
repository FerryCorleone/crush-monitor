export type NetworkStatus =
  | "reachable"
  | "auth-required"
  | "restricted"
  | "rate-limited"
  | "unavailable"
  | "unknown";
export type Probe = {
  status: NetworkStatus;
  httpStatus?: number;
  elapsedMs: number;
};
export type ProviderTier = "jev" | "decision" | "llm";
export type ProviderAvailability = {
  id: string;
  name: string;
  appChoice: string;
  group: ProviderTier;
  keyUrl: string;
  website: Probe;
  api: Probe;
  candidate: boolean;
};

// Connectivity chooses candidates, not model quality or the user's identity/location.
// A lower-tier provider being faster/reachable cannot override an available Jev.
export const PROVIDER_ORDER = [
  "typesafe",
  "opencode",
  "openrouter",
  "vercel",
  "startlux",
  "liquid",
  "deepseek",
  "qwen",
] as const;
export const TIER_ORDER: ProviderTier[] = ["jev", "decision", "llm"];
const order = (id: string) => {
  const index = PROVIDER_ORDER.indexOf(id as (typeof PROVIDER_ORDER)[number]);
  return index < 0 ? Infinity : index;
};
const summary = (p: ProviderAvailability) => ({
  id: p.id,
  tier: p.group,
  appChoice: p.appChoice,
  keyUrl: p.keyUrl,
});

function selectCandidate(ranked: ProviderAvailability[]): {
  provider: ProviderAvailability | null;
  pending: string[];
} {
  for (const tier of TIER_ORDER) {
    const current = ranked.filter((p) => p.group === tier);
    const candidate = current.find((p) => p.candidate);
    if (candidate) return { provider: candidate, pending: [] };
    // An unauthenticated 403/timeout can be a browser challenge, proxy mismatch
    // or transient failure. Do not turn that uncertainty into "domestic only".
    const pending = current.filter(
      (p) =>
        ![p.website, p.api].some(
          (probe) =>
            probe.httpStatus === 451 ||
            probe.httpStatus === 404 ||
            probe.status === "unavailable",
        ),
    );
    if (pending.length)
      return { provider: null, pending: pending.map((p) => p.id) };
  }
  return { provider: null, pending: [] };
}

export function recommendProvider(providers: ProviderAvailability[]) {
  const ranked = [...providers]
    .filter((p) => Number.isFinite(order(p.id)))
    .sort(
      (a, b) =>
        TIER_ORDER.indexOf(a.group) - TIER_ORDER.indexOf(b.group) ||
        order(a.id) - order(b.id),
    );
  const { provider: primary, pending } = selectCandidate(ranked);
  // Apply the same tier rule to a backup; an uncertain native route must not
  // silently become a recommendation to use an LLM instead.
  const fallback = primary
    ? selectCandidate(ranked.filter((p) => p.id !== primary.id)).provider
    : null;
  return {
    status: primary
      ? ("candidate" as const)
      : pending.length
        ? ("needs-verification" as const)
        : ("unavailable" as const),
    priority: TIER_ORDER,
    primary: primary ? summary(primary) : null,
    fallback: fallback ? summary(fallback) : null,
    requiresBrowserVerification: pending.length > 0,
    pendingProviders: pending,
  };
}
