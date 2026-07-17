// Cheap, local first pass: does a comment plausibly reference a tracked show?
// This runs on every comment so it must be fast — pure string matching, no
// network. Only survivors are sent to the (expensive) classifier.

import type { TrackedShow } from "../lib/types";

/** Returns the ids of tracked shows whose alias appears in the text. */
export function matchShows(text: string, shows: TrackedShow[]): number[] {
  const lower = text.toLowerCase();
  const matched: number[] = [];
  for (const show of shows) {
    if (show.aliases.some((alias) => alias.length >= 3 && lower.includes(alias))) {
      matched.push(show.id);
    }
  }
  return matched;
}
