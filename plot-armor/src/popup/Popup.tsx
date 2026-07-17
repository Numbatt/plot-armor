/** @jsxImportSource preact */
import { useEffect, useState } from "preact/hooks";
import { sendMessage } from "../lib/messaging";

interface Status {
  connected: boolean;
  globalEnabled: boolean;
  showCount: number;
  totalBlocked: number;
}

export function Popup() {
  const [status, setStatus] = useState<Status | null>(null);

  async function refresh() {
    const res = await sendMessage({ type: "GET_STATUS" });
    if (res.type === "STATUS") setStatus(res);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function toggleGlobal() {
    if (!status) return;
    await sendMessage({
      type: "SET_GLOBAL_ENABLED",
      enabled: !status.globalEnabled,
    });
    void refresh();
  }

  return (
    <div class="pa-popup">
      <div class="pa-header">
        <span style="font-size:18px">🛡</span>
        <h1>
          <span class="accent">Plot</span>Armor
        </h1>
      </div>

      {!status ? (
        <p class="pa-stat">Loading…</p>
      ) : !status.connected ? (
        <>
          <p class="pa-stat">
            Connect your AniList account to start blocking spoilers for the
            shows you're watching.
          </p>
          <button
            class="pa-btn"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            Connect AniList
          </button>
        </>
      ) : (
        <>
          <p class="pa-stat">
            Tracking <b>{status.showCount}</b> shows.
          </p>
          <p class="pa-stat">
            <b>{status.totalBlocked}</b> spoilers blocked so far.
          </p>
          <button
            class={`pa-btn ${status.globalEnabled ? "secondary" : ""}`}
            onClick={toggleGlobal}
          >
            {status.globalEnabled ? "⏸ Pause protection" : "▶ Resume protection"}
          </button>
          <button
            class="pa-link"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            Manage shows & settings →
          </button>
        </>
      )}
    </div>
  );
}
