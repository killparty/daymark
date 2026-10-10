# 0003 — No built-in passwords: `none` or reverse-proxy auth

**Status:** accepted

## Context

The app is reached over a home network or VPN. A login screen with passwords means hashing, rate
limiting, sessions, resets — attack surface that is hard to maintain well in a spare-time project.
Multi-user (family members) should still be possible, and an SSO setup may come later.

## Decision

`AUTH_MODE` selects one of:

- **`none`** (default): every request is the single local user. For private networks only; the
  server logs a warning at startup.
- **`proxy`**: a reverse proxy (e.g. Caddy `forward_auth` with Pocket ID, Tinyauth, Authelia or
  Authentik) authenticates the person and sets `Remote-User` (and optionally `Remote-Name`). Daymark
  creates the user on first sight. The header is trusted **only** from `AUTH_TRUSTED_PROXIES`
  (private networks by default), and the app's port should not be published outside the Docker
  network.

Daymark never sees or stores a password. A future native `oidc` mode can map to the same
`users.external_id`.

Devices (the physical companion) will authenticate with per-device API tokens on their own route
prefix, which the proxy lets through without SSO.

## Consequences

- Multi-user requires an auth proxy. That is a deliberate nudge towards one good login for all
  self-hosted apps instead of one per app.
- CSRF: state-changing API calls must be JSON; Hono's CSRF middleware rejects form-like cross-site
  requests. This matters most in `none` mode.
