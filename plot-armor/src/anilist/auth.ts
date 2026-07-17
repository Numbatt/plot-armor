// AniList OAuth via the implicit grant. A browser extension cannot safely hold
// a client secret, so we use the implicit flow: the access token is returned in
// the redirect URL fragment. Register the app at
// https://anilist.co/settings/developer and set the redirect URL to the value
// of chrome.identity.getRedirectURL() (https://<extension-id>.chromiumapp.org/).

// Public client id from the AniList developer app registration (safe to ship).
const ANILIST_CLIENT_ID = import.meta.env.VITE_ANILIST_CLIENT_ID ?? "";

export interface AniListToken {
  token: string;
  /** Epoch ms when the token expires (implicit tokens last ~1 year). */
  expiry: number;
}

/**
 * Launches the AniList consent screen and resolves with the access token.
 * Must be called from the background service worker or an extension page.
 */
export async function connectAniList(): Promise<AniListToken> {
  // AniList's implicit grant takes only client_id + response_type; it redirects
  // to the URL registered in the app settings (our chromiumapp.org address),
  // which launchWebAuthFlow intercepts. Passing redirect_uri here is rejected
  // with "unsupported_grant_type".
  const authUrl =
    `https://anilist.co/api/v2/oauth/authorize` +
    `?client_id=${encodeURIComponent(ANILIST_CLIENT_ID)}` +
    `&response_type=token`;

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true,
  });
  if (!responseUrl) throw new Error("AniList sign-in was cancelled.");

  // Implicit grant returns the token in the URL fragment:
  //   https://<id>.chromiumapp.org/#access_token=...&expires_in=...&token_type=Bearer
  const fragment = new URL(responseUrl).hash.slice(1);
  const params = new URLSearchParams(fragment);
  const token = params.get("access_token");
  const expiresIn = Number(params.get("expires_in") ?? "0");
  if (!token) throw new Error("AniList did not return an access token.");

  return { token, expiry: Date.now() + expiresIn * 1000 };
}
