// Shapes returned by the AniList GraphQL API (subset we consume).

export interface AniListMediaTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

export interface AniListRelationNode {
  id: number;
  title: AniListMediaTitle;
  synonyms: string[];
  /** AniList media format (TV, MOVIE, OVA, MANGA, …). */
  format: string | null;
}

export interface AniListRelationEdge {
  /** SEQUEL, PREQUEL, SIDE_STORY, … (relationType version 2). */
  relationType: string;
  node: AniListRelationNode;
}

export interface AniListMedia {
  id: number;
  title: AniListMediaTitle;
  synonyms: string[];
  episodes: number | null;
  relations?: { edges: AniListRelationEdge[] };
}

export interface AniListListEntry {
  progress: number;
  media: AniListMedia;
}

export interface AniListListGroup {
  name: string;
  entries: AniListListEntry[];
}
