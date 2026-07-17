// Tier-1 progress-delta gate (no LLM). Decides whether a whole thread is so far
// ahead of the user's watch progress that we blur everything, or close enough
// that we defer to per-comment classification (Tier 2). Threshold agreed with
// the product: a later season, or more than 3 episodes ahead → blur all.

import { tokenize } from "../lib/titles";
import type { TrackedShow } from "../lib/types";

export type Tier = "blur-all" | "per-comment";

interface SeasonEpisode {
  season: number;
  episode: number | null;
}

const SEASON_RE =
  /\bseason\s*(\d+)\b|\bs(\d+)\b|\b(\d+)(?:st|nd|rd|th)\s+season\b/i;
const ROMAN: Record<string, number> = { ii: 2, iii: 3, iv: 4, v: 5 };
const ROMAN_RE = /\b(ii|iii|iv|v)\b/i;
const EPISODE_RE = /\b(?:episode|ep)\b\.?\s*(\d+)\b|\be(\d+)\b/i;

/** Best-effort season/episode extraction from a title or Reddit thread name. */
export function parseSeasonEpisode(title: string): SeasonEpisode {
  let season = 1;
  const s = SEASON_RE.exec(title);
  if (s) {
    season = Number(s[1] ?? s[2] ?? s[3]);
  } else {
    const r = ROMAN_RE.exec(title);
    if (r) season = ROMAN[r[1].toLowerCase()] ?? 1;
  }
  const e = EPISODE_RE.exec(title);
  const episode = e ? Number(e[1] ?? e[2]) : null;
  return { season, episode };
}

/**
 * Decide the tier for a thread about `show`. AniList tracks each season as its
 * own entry, so the user's progress lives on the season named in `show.title`;
 * we compare that season/episode against the thread's.
 */
export function decideTier(threadTitle: string, show: TrackedShow): Tier {
  // Highest-confidence signal: the thread names a later season/arc of this show
  // (a word only its sequels introduce). Ground truth from AniList relations —
  // catches continuations that restart episode numbering, which the delta gate
  // below would otherwise read as "behind you" and wave through.
  const ahead = show.aheadTokens ?? [];
  if (ahead.length > 0) {
    const threadTokens = new Set(tokenize(threadTitle));
    if (ahead.some((t) => threadTokens.has(t))) return "blur-all";
  }

  const thread = parseSeasonEpisode(threadTitle);
  const userSeason = parseSeasonEpisode(show.title).season;

  if (thread.season > userSeason) return "blur-all";
  if (thread.season === userSeason && thread.episode != null) {
    if (thread.episode - show.progress > 3) return "blur-all";
  }
  return "per-comment";
}
