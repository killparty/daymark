import { createApp } from "../src/server/app.ts";
import { loadConfig } from "../src/server/config.ts";
import { openDatabase } from "../src/server/db/client.ts";

/** A fresh app on an in-memory database. */
export function testApp(env: Record<string, string> = {}) {
  const config = loadConfig({ STATIC_DIR: "/nonexistent", ...env });
  const db = openDatabase(":memory:");
  const app = createApp(db, config);

  const call = async (method: string, path: string, body?: unknown, headers = {}) => {
    const res = await app.request(`/api/v1${path}`, {
      method,
      // Like the web client: always JSON, which also satisfies the CSRF check.
      headers: { "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };

  return { app, db, call };
}
