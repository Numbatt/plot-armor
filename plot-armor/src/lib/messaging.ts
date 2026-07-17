// Typed message contract between the content script, popup/options, and the
// background service worker. All cross-context calls go through sendMessage.

import type {
  CommentCandidate,
  PageContext,
  TrackedShow,
  Verdict,
} from "./types";

export type Message =
  | { type: "CLASSIFY"; candidates: CommentCandidate[]; context: PageContext }
  | { type: "GET_TRACKED_SHOWS" }
  | { type: "ANILIST_CONNECT" }
  | { type: "ANILIST_DISCONNECT" }
  | { type: "SET_SHOW_ENABLED"; showId: number; enabled: boolean }
  | { type: "SET_GLOBAL_ENABLED"; enabled: boolean }
  | { type: "REPORT_BLOCKED"; count: number }
  | { type: "GET_STATUS" };

export type Response =
  | { type: "VERDICTS"; verdicts: Verdict[] }
  | { type: "TRACKED_SHOWS"; shows: TrackedShow[] }
  | {
      type: "STATUS";
      connected: boolean;
      globalEnabled: boolean;
      showCount: number;
      totalBlocked: number;
    }
  | { type: "OK" }
  | { type: "ERROR"; error: string };

/** Send a message to the background service worker and await its response. */
export function sendMessage<R = Response>(msg: Message): Promise<R> {
  return chrome.runtime.sendMessage(msg) as Promise<R>;
}
