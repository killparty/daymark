import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { openDatabase } from "./db/client.ts";

const config = loadConfig();
const db = openDatabase(config.databasePath);
const app = createApp(db, config);

const server = Bun.serve({
  hostname: config.host,
  port: config.port,
  fetch: (req, server) => app.fetch(req, { server }),
});

console.log(
  `Daymark listening on http://${server.hostname}:${server.port} (auth: ${config.auth.mode}, db: ${config.databasePath})`,
);
if (config.auth.mode === "none") {
  console.log(
    "AUTH_MODE=none: anyone who can reach this server can use it. Keep it on a private network.",
  );
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.stop();
    db.$client.close();
    process.exit(0);
  });
}
