import type { MiddlewareHandler } from "hono";
import { getConnInfo } from "hono/bun";
import type { Config } from "./config.ts";
import type { DbLike } from "./db/client.ts";
import { ipInCidrs } from "./lib/ip.ts";
import { findOrCreateUser, type User } from "./services/users.ts";

export type AppEnv = { Variables: { user: User } };

export const LOCAL_USER = "local";

function remoteAddress(c: Parameters<MiddlewareHandler>[0]): string | undefined {
  try {
    return getConnInfo(c).remote.address;
  } catch {
    return undefined;
  }
}

/**
 * Resolves the current user (see docs/adr/0003-auth-modes.md).
 *
 * - `none`: everyone is the single local user. Only for private networks / VPN.
 * - `proxy`: a reverse proxy (e.g. Caddy `forward_auth`) authenticates the
 *   person and passes the username in a header. The header is only trusted
 *   when the request comes from a trusted proxy address.
 */
export function authMiddleware(db: DbLike, auth: Config["auth"]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (auth.mode === "none") {
      c.set("user", findOrCreateUser(db, LOCAL_USER, "Me"));
      return next();
    }

    const address = remoteAddress(c);
    if (!address || !ipInCidrs(address, auth.trustedProxies)) {
      return c.json(
        {
          error: {
            code: "untrusted_proxy",
            message: "Request did not come through the auth proxy",
          },
        },
        403,
      );
    }
    const username = c.req.header(auth.userHeader)?.trim();
    if (!username) {
      return c.json({ error: { code: "unauthenticated", message: "No authenticated user" } }, 401);
    }
    const name = c.req.header(auth.nameHeader)?.trim() || username;
    c.set("user", findOrCreateUser(db, username.slice(0, 200), name.slice(0, 200)));
    return next();
  };
}
