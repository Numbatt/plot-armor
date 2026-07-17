// Core domain types shared across the extension.

/** A show the user is tracking, sourced from their AniList "Watching" list. */
export interface TrackedShow {
  /** AniList media id. */
  id: number;
  /** Canonical display title (English preferred, else Romaji). */
  title: string;
  /** All known titles/synonyms, lowercased, used for attribution matching. */
  aliases: string[];
  /** Episodes the user has watched (AniList `progress`). */
  progress: number;
  /** Total episodes if known; null for still-airing shows. */
  totalEpisodes: number | null;
  /**
   * Distinctive title tokens introduced by later seasons/arcs of this show
   * (from AniList sequel relations). A thread mentioning one is about content
   * ahead of the user's progress, so it blurs wholesale even when episode
   * numbering restarts and hides the delta. See lib/titles.ts.
   */
  aheadTokens: string[];
  /** Per-show protection toggle (defaults on). */
  enabled: boolean;
}

/** A comment extracted from the page that survived the local pre-filter. */
export interface CommentCandidate {
  /** Id we assign to the DOM node (data attribute) so verdicts map back. */
  id: string;
  /** Plain text of the comment. */
  text: string;
  /** Stable hash of the text, used as the verdict cache key. */
  hash: string;
  /** Tracked show ids this comment plausibly references. */
  matchedShowIds: number[];
}

/** Classifier verdict for a single comment. */
export interface Verdict {
  /** Matches CommentCandidate.hash. */
  hash: string;
  /** True if the comment spoils content past the user's progress. */
  spoiler: boolean;
  /** The tracked show it spoils, if determinable. */
  showId: number | null;
}

/** Context passed to the classifier for show attribution. */
export interface PageContext {
  subreddit: string;
  threadTitle: string;
}
