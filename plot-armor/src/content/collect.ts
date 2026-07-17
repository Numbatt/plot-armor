// Extracts comment nodes from a Reddit thread (both new and old layouts),
// assigns each a stable id, and builds classifier candidates via the pre-filter.

import { hashText } from "../lib/hash";
import type { CommentCandidate, PageContext, TrackedShow } from "../lib/types";
import { matchShows } from "./prefilter";

const ID_ATTR = "data-plotarmor-id";
const DONE_ATTR = "data-plotarmor-done";

/** The element we blur, plus the text we classify, for one comment. */
interface CommentNode {
  el: HTMLElement;
  text: string;
}

/** Finds comment body elements across new (shreddit) and old Reddit layouts. */
function findCommentNodes(): CommentNode[] {
  const nodes: CommentNode[] = [];

  // New Reddit: <shreddit-comment> web components with a comment body slot.
  document.querySelectorAll<HTMLElement>("shreddit-comment").forEach((c) => {
    const body = c.querySelector<HTMLElement>('[slot="comment"]') ?? c;
    const text = body.innerText?.trim();
    if (text) nodes.push({ el: body, text });
  });

  // Old Reddit: .comment .usertext-body .md
  document
    .querySelectorAll<HTMLElement>(".comment .usertext-body .md")
    .forEach((el) => {
      const text = el.innerText?.trim();
      if (text) nodes.push({ el, text });
    });

  return nodes;
}

/** Reads subreddit + thread title from the URL and page for show attribution. */
export function getPageContext(): PageContext {
  const match = location.pathname.match(/\/r\/([^/]+)\//);
  const subreddit = match ? match[1] : "";
  const title =
    document.querySelector<HTMLElement>("h1")?.innerText?.trim() ??
    document.title;
  return { subreddit, threadTitle: title };
}

/**
 * Collects new (not-yet-processed) comments, pre-filters them against tracked
 * shows, and returns candidates plus a lookup from candidate id to its element.
 *
 * `threadShowIds` are shows the thread as a whole is about (from the title); in
 * a discussion thread every comment inherits them, since the show is set by
 * context rather than repeated in each comment. Per-comment name mentions are
 * unioned on top for general threads.
 */
export function collectCandidates(
  shows: TrackedShow[],
  threadShowIds: number[] = [],
): {
  candidates: CommentCandidate[];
  nodeById: Map<string, HTMLElement>;
} {
  const candidates: CommentCandidate[] = [];
  const nodeById = new Map<string, HTMLElement>();

  for (const { el, text } of findCommentNodes()) {
    if (el.hasAttribute(DONE_ATTR)) continue;
    el.setAttribute(DONE_ATTR, "1");

    const matchedShowIds = Array.from(
      new Set([...threadShowIds, ...matchShows(text, shows)]),
    );
    if (matchedShowIds.length === 0) continue;

    const id = `${nodeById.size}-${hashText(text)}`;
    el.setAttribute(ID_ATTR, id);
    nodeById.set(id, el);
    candidates.push({ id, text, hash: hashText(text), matchedShowIds });
  }

  return { candidates, nodeById };
}
