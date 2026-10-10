import { join, resolve } from "node:path";
import type { AuthMode } from "../shared/api.ts";
import { type Cidr, parseCidrList } from "./lib/ip.ts";

export interface Config {
  host: string;
  port: number;
  databasePath: string;
  staticDir: string;
  auth: {
    mode: AuthMode;
    /** Header carrying the username set by the reverse proxy (AUTH_MODE=proxy). */
    userHeader: string;
    /** Optional header carrying a display name. */
    nameHeader: string;
    /** Only requests from these networks may set the identity headers. */
    trustedProxies: Cidr[];
  };
}

const PRIVATE_NETWORKS = "127.0.0.0/8,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,fc00::/7";

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const mode = env.AUTH_MODE ?? "none";
  if (mode !== "none" && mode !== "proxy") {
    throw new Error(`AUTH_MODE must be "none" or "proxy", got "${mode}"`);
  }
  const port = Number(env.PORT ?? 8080);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT must be a valid port number, got "${env.PORT}"`);
  }
  const dataDir = resolve(env.DATA_DIR ?? "./data");

  return {
    host: env.HOST ?? "0.0.0.0",
    port,
    databasePath: env.DATABASE_PATH ?? join(dataDir, "daymark.db"),
    staticDir: resolve(env.STATIC_DIR ?? "./dist/web"),
    auth: {
      mode,
      userHeader: (env.AUTH_PROXY_USER_HEADER ?? "Remote-User").toLowerCase(),
      nameHeader: (env.AUTH_PROXY_NAME_HEADER ?? "Remote-Name").toLowerCase(),
      trustedProxies: parseCidrList(env.AUTH_TRUSTED_PROXIES ?? PRIVATE_NETWORKS),
    },
  };
}
