// AniList GraphQL client. Reading a user's own lists requires their OAuth token;
// the endpoint and query are otherwise standard.

import { distinctiveTokens } from "../lib/titles";
import type { TrackedShow } from "../lib/types";
import type { AniListListGroup, AniListMedia } from "./types";

const ENDPOINT = "https://graphql.anilist.co";

const WATCHING_QUERY = `
query {
  Viewer { id }
}
`;

const LIST_QUERY = `
query ($userId: Int) {
  MediaListCollection(userId: $userId, type: ANIME, status: CURRENT) {
    lists {
      name
      entries {
        progress
        media {
          id
          title { romaji english native }
          synonyms
          episodes
          relations {
            edges {
              relationType(version: 2)
              node {
                id
                title { romaji english native }
                synonyms
                format
              }
            }
          }
        }
      }
    }
  }
}
`;

async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string,
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "AniList error");
  return json.data as T;
}

/** Every title/synonym for a media, for tokenizing. */
function mediaTitles(media: {
  title: { romaji: string | null; english: string | null; native: string | null };
  synonyms: string[];
}): string[] {
  return [
    media.title.english,
    media.title.romaji,
    media.title.native,
    ...media.synonyms,
  ].filter((s): s is string => !!s);
}

// Formats whose sequels are actual watch-order continuations (not manga/music).
const CONTINUATION_FORMATS = new Set([
  "TV",
  "TV_SHORT",
  "MOVIE",
  "SPECIAL",
  "OVA",
  "ONA",
]);

/**
 * Words a later season/arc of this show introduces, from its direct SEQUEL
 * relations. A thread mentioning one is ahead of the user even when episode
 * numbering restarts (see lib/titles.ts). Limited to direct sequels — the
 * immediately-next season, which is the overwhelmingly common spoiler thread.
 */
function aheadTokensFor(media: AniListMedia): string[] {
  const edges = media.relations?.edges ?? [];
  const sequelTitles = edges
    .filter(
      (e) =>
        e.relationType === "SEQUEL" &&
        CONTINUATION_FORMATS.has(e.node.format ?? ""),
    )
    .flatMap((e) => mediaTitles(e.node));
  if (sequelTitles.length === 0) return [];
  return distinctiveTokens(mediaTitles(media), sequelTitles);
}

/** Fetches the authenticated user's currently-watching list as TrackedShows. */
export async function fetchWatchingList(token: string): Promise<TrackedShow[]> {
  const viewer = await gql<{ Viewer: { id: number } }>(
    WATCHING_QUERY,
    {},
    token,
  );
  const data = await gql<{
    MediaListCollection: { lists: AniListListGroup[] };
  }>(LIST_QUERY, { userId: viewer.Viewer.id }, token);

  const shows: TrackedShow[] = [];
  for (const list of data.MediaListCollection.lists) {
    for (const entry of list.entries) {
      const { media } = entry;
      const title =
        media.title.english ?? media.title.romaji ?? media.title.native ?? "";
      const aliases = mediaTitles(media).map((s) => s.toLowerCase());
      shows.push({
        id: media.id,
        title,
        aliases: Array.from(new Set(aliases)),
        progress: entry.progress,
        totalEpisodes: media.episodes,
        aheadTokens: aheadTokensFor(media),
        enabled: true,
      });
    }
  }
  return shows;
}
