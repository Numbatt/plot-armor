// Content script entry (Reddit comment threads). Collects comments, asks the
// background worker to classify the ones that mention a tracked show, blurs the
// spoilers, and reacts live to pause / per-show toggles (no reload needed).

import { sendMessage } from "../lib/messaging";
import type { TrackedShow } from "../lib/types";
import { collectCandidates, getPageContext } from "./collect";
import { matchShows } from "./prefilter";
import { decideTier } from "./tier";
import { applyBlur } from "./overlay";
import { onRevealAll, updateRevealAllBar } from "./controls";
import "./overlay.css";

const context = getPageContext();

let allShows: TrackedShow[] = [];
let enabledShows: TrackedShow[] = [];
let threadShowIds: number[] = [];
// Tier-1 outcome for this thread: a show we blur wholesale (user is well behind),
// and the shows close enough to defer to per-comment classification.
let blurAllShow: TrackedShow | null = null;
let perCommentShowIds: number[] = [];
let globalEnabled = true;

interface BlurredEntry {
  el: HTMLElement;
  showId: number | null;
}
const blurred: BlurredEntry[] = [];

function recomputeShows(): void {
  enabledShows = allShows.filter((s) => s.enabled);
  threadShowIds = matchShows(context.threadTitle, enabledShows);

  // Tier-1 gate: for each show this thread is about, decide blur-all vs defer.
  blurAllShow = null;
  perCommentShowIds = [];
  for (const s of enabledShows) {
    if (!threadShowIds.includes(s.id)) continue;
    if (decideTier(context.threadTitle, s) === "blur-all") {
      blurAllShow ??= s;
    } else {
      perCommentShowIds.push(s.id);
    }
  }
}

/** Comments currently hidden (not revealed, show not disabled, not paused). */
function activeBlurCount(): number {
  if (!globalEnabled) return 0;
  const disabled = new Set(
    allShows.filter((s) => !s.enabled).map((s) => s.id),
  );
  return blurred.filter(
    (b) =>
      !b.el.classList.contains("plotarmor-revealed") &&
      !(b.showId != null && disabled.has(b.showId)),
  ).length;
}

function refreshBar(): void {
  updateRevealAllBar(activeBlurCount());
}

async function loadState(): Promise<void> {
  const shows = await sendMessage({ type: "GET_TRACKED_SHOWS" });
  if (shows.type === "TRACKED_SHOWS") allShows = shows.shows;
  const status = await sendMessage({ type: "GET_STATUS" });
  if (status.type === "STATUS") globalEnabled = status.globalEnabled;
  recomputeShows();
}

async function scan(): Promise<void> {
  if (!globalEnabled || enabledShows.length === 0) return;
  if (blurAllShow) {
    scanBlurAll(blurAllShow);
    return;
  }
  await scanClassify();
}

/** Tier-1: the user is well behind on this show — blur every comment, no LLM. */
function scanBlurAll(show: TrackedShow): void {
  const { candidates, nodeById } = collectCandidates(enabledShows, [show.id]);
  if (candidates.length === 0) return;
  console.info(
    `[PlotArmor] blur-all: hiding ${candidates.length} comment(s) for "${show.title}" (you're behind)`,
  );
  for (const c of candidates) {
    const el = nodeById.get(c.id);
    if (!el) continue;
    applyBlur(el, show.title, refreshBar);
    blurred.push({ el, showId: show.id });
  }
  void sendMessage({ type: "REPORT_BLOCKED", count: candidates.length });
  refreshBar();
}

/** Tier-2: within range — classify individual comments. */
async function scanClassify(): Promise<void> {
  const { candidates, nodeById } = collectCandidates(
    enabledShows,
    perCommentShowIds,
  );
  if (candidates.length === 0) return;
  console.info(
    `[PlotArmor] ${candidates.length} candidate comment(s) to classify`,
  );

  const res = await sendMessage({ type: "CLASSIFY", candidates, context });
  if (res.type !== "VERDICTS") return;

  const titleById = new Map(enabledShows.map((s) => [s.id, s.title]));
  let blocked = 0;
  for (const verdict of res.verdicts) {
    if (!verdict.spoiler) continue;
    const candidate = candidates.find((c) => c.hash === verdict.hash);
    if (!candidate) continue;
    const el = nodeById.get(candidate.id);
    if (!el) continue;
    applyBlur(
      el,
      verdict.showId ? titleById.get(verdict.showId) ?? null : null,
      refreshBar,
    );
    blurred.push({ el, showId: verdict.showId });
    blocked++;
  }

  if (blocked > 0) {
    void sendMessage({ type: "REPORT_BLOCKED", count: blocked });
    refreshBar();
  }
}

/** Toggle per-show suppression on already-blurred comments (live, no reload). */
function applyShowToggles(): void {
  const disabled = new Set(
    allShows.filter((s) => !s.enabled).map((s) => s.id),
  );
  for (const b of blurred) {
    const off = b.showId != null && disabled.has(b.showId);
    b.el.classList.toggle("plotarmor-off", off);
  }
}

/** Reveal every hidden comment on this thread ("I'm caught up"). */
function revealAll(): void {
  for (const b of blurred) b.el.classList.add("plotarmor-revealed");
  refreshBar();
}

function applyPause(): void {
  document.documentElement.classList.toggle("plotarmor-paused", !globalEnabled);
  refreshBar();
}

async function init(): Promise<void> {
  await loadState();
  console.info(
    `[PlotArmor] active on "${context.threadTitle}" | ${enabledShows.length} enabled show(s) | thread matches ${threadShowIds.length} show(s)`,
  );

  onRevealAll(revealAll);
  applyPause();
  await scan();

  // React live to popup/options changes without a page reload.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.globalEnabled) {
      globalEnabled = changes.globalEnabled.newValue;
      applyPause();
      if (globalEnabled) void scan();
    }
    if (changes.trackedShows) {
      allShows = changes.trackedShows.newValue ?? [];
      recomputeShows();
      applyShowToggles();
      refreshBar();
      void scan();
    }
  });

  // Re-scan for lazy-loaded comments.
  const rescan = debounce(() => void scan(), 400);
  new MutationObserver(rescan).observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/** Debounced trailing-edge helper. */
function debounce(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

void init();
