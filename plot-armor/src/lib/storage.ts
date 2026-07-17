// Thin typed wrapper over chrome.storage.local with defaults.

import type { TrackedShow } from "./types";

export interface StoredState {
  /** AniList access token (implicit grant) and its expiry epoch ms. */
  anilistToken: string | null;
  anilistTokenExpiry: number | null;
  /** Snapshot of the user's tracked shows, refreshed periodically. */
  trackedShows: TrackedShow[];
  /** Master on/off switch. */
  globalEnabled: boolean;
  /** Lifetime count of spoilers blocked, for the popup stat. */
  totalBlocked: number;
}

const DEFAULTS: StoredState = {
  anilistToken: null,
  anilistTokenExpiry: null,
  trackedShows: [],
  globalEnabled: true,
  totalBlocked: 0,
};

export async function getState(): Promise<StoredState> {
  const stored = await chrome.storage.local.get(DEFAULTS);
  return stored as StoredState;
}

export async function patchState(patch: Partial<StoredState>): Promise<void> {
  await chrome.storage.local.set(patch);
}

/** True if we hold a non-expired AniList token. */
export function isConnected(state: StoredState): boolean {
  return (
    state.anilistToken != null &&
    (state.anilistTokenExpiry == null || state.anilistTokenExpiry > Date.now())
  );
}
