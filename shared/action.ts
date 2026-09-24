import type { Message, Overview } from "./types";

// This marks which conversation was analyzed, not which message advice must cite.
export function currentAction(
  overview: Overview | null,
  messages: Message[],
  fresh: boolean,
): Overview | null {
  const last = messages.at(-1);
  return fresh && last && overview?.actionAnchorId === last.id
    ? overview
    : null;
}
