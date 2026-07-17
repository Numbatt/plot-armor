// Classifier abstraction. Phase 2 uses the keyword stub; Phase 3 swaps in the
// real serverless proxy call behind the same interface, so callers don't change.

import type { CommentCandidate, PageContext, TrackedShow, Verdict } from "./types";

export interface Classifier {
  classify(
    candidates: CommentCandidate[],
    shows: TrackedShow[],
    context: PageContext,
  ): Promise<Verdict[]>;
}

/**
 * Phase 2 stub: flags a comment as a spoiler if it contains obvious spoiler
 * vocabulary. Intentionally crude — it exists only to build and test the UI
 * pipeline before the LLM proxy lands in Phase 3.
 */
const SPOILER_HINTS = [
  "dies",
  "death",
  "killed",
  "kills",
  "betray",
  "traitor",
  "ending",
  "final episode",
  "reveal",
  "turns out",
  "plot twist",
];

export const stubClassifier: Classifier = {
  async classify(candidates, _shows, _context) {
    return candidates.map((c) => {
      const lower = c.text.toLowerCase();
      const spoiler = SPOILER_HINTS.some((h) => lower.includes(h));
      return {
        hash: c.hash,
        spoiler,
        showId: c.matchedShowIds[0] ?? null,
      };
    });
  },
};
