// AniList OAuth via the implicit grant, opened in an ordinary browser tab.
//
// A browser extension can't safely hold a client secret, so we use the implicit
// flow: the access token comes back in the redirect URL fragment. Instead of
// chrome.identity.launchWebAuthFlow (which spawns a separate auth *window*), we
// open the consent screen as a tab in the user's normal profile — so they're
// already logged in — and watch for AniList to redirect to our hosted callback
// page, then read the token from the tab URL and close the tab.
//
// AniList redirects to the URL registered in the developer app settings, which
// must exactly match VITE_ANILIST_REDIRECT_URI. Register the app at
// https://anilist.co/settings/developer.

// Public client id from the AniList developer app registration (safe to ship).
const ANILIST_CLIENT_ID = import.meta.env.VITE_ANILIST_CLIENT_ID ?? "";
// Hosted callback page AniList redirects to; must exactly match the redirect
// URL registered in the AniList app settings.
const REDIRECT_URI = import.meta.env.VITE_ANILIST_REDIRECT_URI ?? "";

export interface AniListToken {
  token: string;
  /** Epoch ms when the token expires (implicit tokens last ~1 year). */
  expiry: number;
}

/** Reads the token from a redirect URL fragment, or null if absent. */
function parseToken(url: string): AniListToken | null {
  // Implicit grant returns the token in the URL fragment:
  //   <redirect_uri>#access_token=...&expires_in=...&token_type=Bearer
  const params = new URLSearchParams(new URL(url).hash.slice(1));
  const token = params.get("access_token");
  if (!token) return null;
  const expiresIn = Number(params.get("expires_in") ?? "0");
  return { token, expiry: Date.now() + expiresIn * 1000 };
}

/**
 * Opens the AniList consent screen in a tab and resolves with the access token.
 * Must be called from the background service worker or an extension page.
 */
export async function connectAniList(): Promise<AniListToken> {
  if (!REDIRECT_URI) {
    throw new Error("VITE_ANILIST_REDIRECT_URI is not configured.");
  }

  // AniList's implicit grant takes only client_id + response_type; it redirects
  // to the URL registered in the app settings. Passing redirect_uri here is
  // rejected with "unsupported_grant_type".
  const authUrl =
    `https://anilist.co/api/v2/oauth/authorize` +
    `?client_id=${encodeURIComponent(ANILIST_CLIENT_ID)}` +
    `&response_type=token`;

  const tab = await chrome.tabs.create({ url: authUrl, active: true });
  const authTabId = tab.id;
  if (authTabId == null) throw new Error("Could not open the sign-in tab.");

  return new Promise<AniListToken>((resolve, reject) => {
    function cleanup(): void {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
    }

    // Reading tab.url for the callback origin relies on the host permission for
    // REDIRECT_URI declared in the manifest.
    function onUpdated(id: number, _info: object, t: chrome.tabs.Tab): void {
      if (id !== authTabId) return;
      const url = t.url ?? "";
      if (!url.startsWith(REDIRECT_URI)) return;
      const parsed = parseToken(url);
      cleanup();
      void chrome.tabs.remove(authTabId).catch(() => {});
      if (parsed) resolve(parsed);
      else reject(new Error("AniList did not return an access token."));
    }

    function onRemoved(id: number): void {
      if (id !== authTabId) return;
      cleanup();
      reject(new Error("AniList sign-in was cancelled."));
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
  });
}
