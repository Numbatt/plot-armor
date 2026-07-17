/** @jsxImportSource preact */
import { useEffect, useState } from "preact/hooks";
import { sendMessage } from "../lib/messaging";
import type { TrackedShow } from "../lib/types";

export function Options() {
  const [connected, setConnected] = useState(false);
  const [shows, setShows] = useState<TrackedShow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const status = await sendMessage({ type: "GET_STATUS" });
    if (status.type === "STATUS") setConnected(status.connected);
    const list = await sendMessage({ type: "GET_TRACKED_SHOWS" });
    if (list.type === "TRACKED_SHOWS") setShows(list.shows);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function connect() {
    setBusy(true);
    setError(null);
    const res = await sendMessage({ type: "ANILIST_CONNECT" });
    setBusy(false);
    if (res.type === "ERROR") setError(res.error);
    else await refresh();
  }

  async function disconnect() {
    await sendMessage({ type: "ANILIST_DISCONNECT" });
    await refresh();
  }

  async function toggleShow(show: TrackedShow) {
    await sendMessage({
      type: "SET_SHOW_ENABLED",
      showId: show.id,
      enabled: !show.enabled,
    });
    await refresh();
  }

  return (
    <div class="pa-options">
      <h1>
        <span>🛡</span>
        <span>
          <span class="accent">Plot</span>Armor Settings
        </span>
      </h1>

      <div class="pa-card">
        <h2>AniList</h2>
        {connected ? (
          <>
            <p class="pa-muted">
              Connected. Your currently-watching list is synced every hour.
            </p>
            <button class="pa-btn secondary" onClick={disconnect}>
              Disconnect
            </button>
          </>
        ) : (
          <>
            <p class="pa-muted">
              Connect AniList so PlotArmor knows which episode you're on for
              each show.
            </p>
            <button class="pa-btn" onClick={connect} disabled={busy}>
              {busy ? "Connecting…" : "Connect AniList"}
            </button>
            {error && <p style="color:#ff6b6b">{error}</p>}
          </>
        )}
      </div>

      {connected && (
        <div class="pa-card">
          <h2>Tracked shows</h2>
          {shows.length === 0 ? (
            <p class="pa-muted">
              No shows in your "Watching" list yet. Add some on AniList and
              re-sync.
            </p>
          ) : (
            shows.map((show) => (
              <div class="pa-show" key={show.id}>
                <div>
                  <div>{show.title}</div>
                  <div class="meta">
                    Episode {show.progress}
                    {show.totalEpisodes ? ` / ${show.totalEpisodes}` : ""}
                  </div>
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={show.enabled}
                    onChange={() => toggleShow(show)}
                  />
                </label>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
