import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { type AppEnv, authMiddleware } from "./auth.ts";
import type { Config } from "./config.ts";
import type { DbLike } from "./db/client.ts";
import { HttpError } from "./lib/errors.ts";
import { apiRoutes } from "./routes/api.ts";

export function createApp(db: DbLike, config: Config) {
  const app = new Hono<AppEnv>();

  app.use(
    secureHeaders({
      // HTTPS and HSTS are the reverse proxy's job.
      strictTransportSecurity: false,
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    }),
  );

  app.onError((err, c) => {
    if (err instanceof HTTPException) return err.getResponse();
    if (err instanceof HttpError) {
      return c.json({ error: { code: err.code, message: err.message } }, err.status);
    }
    console.error(err);
    return c.json({ error: { code: "internal", message: "Something went wrong" } }, 500);
  });

  // Unauthenticated liveness probe for Docker / Compose health checks.
  app.get("/healthz", (c) => c.json({ ok: true }));

  app.use("/api/*", csrf());
  app.use("/api/*", authMiddleware(db, config.auth));
  app.route("/api/v1", apiRoutes(db, config));
  app.all("/api/*", (c) =>
    c.json({ error: { code: "not_found", message: "No such endpoint" } }, 404),
  );

  // The built web app (single-page app with client-side routing).
  if (existsSync(config.staticDir)) {
    const root = relative(process.cwd(), config.staticDir) || ".";
    app.use(
      "/assets/*",
      serveStatic({
        root,
        onFound: (_path, c) => c.header("Cache-Control", "public, max-age=31536000, immutable"),
      }),
    );
    app.use("*", serveStatic({ root }));
    app.get("*", serveStatic({ path: join(root, "index.html") }));
  }

  return app;
}
