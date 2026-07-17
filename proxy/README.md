# PlotArmor proxy

Backend for the PlotArmor browser extension, deployed to Vercel
(`plot-armor-sigma.vercel.app`).

- `callback.html` — AniList OAuth redirect target. The extension opens the
  AniList consent screen in a tab, AniList redirects here with the access token
  in the URL fragment, and the extension reads it and closes the tab. Register
  `https://plot-armor-sigma.vercel.app/callback.html` as the redirect URL in the
  AniList developer app settings.
- `index.html` — placeholder landing page.

Planned (Phase 3): `api/classify` serverless function that calls Claude Haiku
with the batched zero-shot spoiler prompt, reading `CLAUDE_API_KEY` from the
Vercel project environment.
