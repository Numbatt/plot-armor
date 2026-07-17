// Title tokenizing for the "content ahead of you" heuristic. A continuation
// season/arc that AniList tracks as its own entry often carries a subtitle
// ("Hashira Training Arc", "Thousand-Year Blood War", "Ultra Romantic") and
// restarts episode numbering — so the episode-delta gate in tier.ts can't see
// that it's ahead of the user. The distinctive words the sequel introduces are
// a reliable signal instead: if a thread mentions one, it's past where you are.

// Structural / franchise-generic words that don't distinguish a continuation.
// "final" is here on purpose: r/anime marks every season's last episode as
// "(Final)", so it would otherwise collide with the user's own-season finale.
const STOPWORDS = new Set([
  "the", "and", "of", "to", "in", "no", "wa", "ga", "wo", "ni", "for", "with",
  "season", "seasons", "part", "cour", "arc", "saga", "chapter", "series",
  "final", "finale", "movie", "film", "ova", "ona", "special", "specials",
  "tv", "short", "episode", "episodes", "discussion",
  "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th",
  "first", "second", "third", "fourth", "fifth",
  "ii", "iii", "iv", "vi", "vii", "viii",
]);

/** Lowercased, de-punctuated, stopword-filtered word tokens (length >= 3). */
export function tokenize(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/**
 * Tokens present in a sequel's titles but absent from the base show's own
 * titles — the words that only appear once you're past where `base` sits.
 */
export function distinctiveTokens(
  baseTitles: string[],
  sequelTitles: string[],
): string[] {
  const baseTokens = new Set(baseTitles.flatMap(tokenize));
  const out = new Set<string>();
  for (const token of sequelTitles.flatMap(tokenize)) {
    if (!baseTokens.has(token)) out.add(token);
  }
  return [...out];
}
