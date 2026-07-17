// Background service worker: owns the AniList token + tracked-show snapshot,
// answers messages from the content script / popup / options, and runs the
// classifier. All privileged work (OAuth, network) happens here.

import { connectAniList } from "../anilist/auth";
import { fetchWatchingList } from "../anilist/client";
import { stubClassifier } from "../lib/classifier";
import type { Message, Response } from "../lib/messaging";
import { getState, isConnected, patchState } from "../lib/storage";
import type { TrackedShow } from "../lib/types";

// The active classifier. Phase 3 replaces stubClassifier with the proxy client.
const classifier = stubClassifier;

/** Pull the latest Watching list, preserving existing per-show enabled toggles. */
async function refreshTrackedShows(): Promise<TrackedShow[]> {
  const state = await getState();
  if (!isConnected(state) || !state.anilistToken) return state.trackedShows;

  const fresh = await fetchWatchingList(state.anilistToken);
  const prevEnabled = new Map(state.trackedShows.map((s) => [s.id, s.enabled]));
  const merged = fresh.map((s) => ({
    ...s,
    enabled: prevEnabled.get(s.id) ?? true,
  }));
  await patchState({ trackedShows: merged });
  return merged;
}

async function handle(msg: Message): Promise<Response> {
  switch (msg.type) {
    case "ANILIST_CONNECT": {
      const { token, expiry } = await connectAniList();
      await patchState({ anilistToken: token, anilistTokenExpiry: expiry });
      await refreshTrackedShows();
      return { type: "OK" };
    }

    case "ANILIST_DISCONNECT": {
      await patchState({
        anilistToken: null,
        anilistTokenExpiry: null,
        trackedShows: [],
      });
      return { type: "OK" };
    }

    case "GET_TRACKED_SHOWS": {
      const state = await getState();
      return { type: "TRACKED_SHOWS", shows: state.trackedShows };
    }

    case "SET_SHOW_ENABLED": {
      const state = await getState();
      const shows = state.trackedShows.map((s) =>
        s.id === msg.showId ? { ...s, enabled: msg.enabled } : s,
      );
      await patchState({ trackedShows: shows });
      return { type: "OK" };
    }

    case "SET_GLOBAL_ENABLED": {
      await patchState({ globalEnabled: msg.enabled });
      return { type: "OK" };
    }

    case "REPORT_BLOCKED": {
      const state = await getState();
      await patchState({ totalBlocked: state.totalBlocked + msg.count });
      return { type: "OK" };
    }

    case "CLASSIFY": {
      const state = await getState();
      if (!state.globalEnabled) return { type: "VERDICTS", verdicts: [] };
      const activeShows = state.trackedShows.filter((s) => s.enabled);
      const verdicts = await classifier.classify(
        msg.candidates,
        activeShows,
        msg.context,
      );
      return { type: "VERDICTS", verdicts };
    }

    case "GET_STATUS": {
      const state = await getState();
      return {
        type: "STATUS",
        connected: isConnected(state),
        globalEnabled: state.globalEnabled,
        showCount: state.trackedShows.length,
        totalBlocked: state.totalBlocked,
      };
    }
  }
}

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  handle(msg)
    .then(sendResponse)
    .catch((err) =>
      sendResponse({ type: "ERROR", error: String(err?.message ?? err) }),
    );
  // Return true to keep the message channel open for the async response.
  return true;
});

// Refresh tracked shows periodically so progress stays current.
chrome.alarms?.create("refresh-shows", { periodInMinutes: 60 });
chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === "refresh-shows") void refreshTrackedShows();
});
