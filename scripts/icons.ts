/**
 * Renders src/web/public/icon.svg to the PNG that iOS uses for "Add to Home Screen" (iOS does
 * not accept SVG there). The PNG is full-bleed and light: iOS rounds the corners itself and has
 * no dark variant for web app icons.
 *
 *   bun run icons
 *
 * Needs a Chromium for Playwright (once: bunx playwright install chromium).
 */
import { chromium } from "playwright";

const SIZE = 180;
const publicDir = new URL("../src/web/public/", import.meta.url);

const svg = (await Bun.file(new URL("icon.svg", publicDir)).text()).replace(
  /(<rect class="tile"[^>]*?) rx="\d+"/,
  "$1",
);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: SIZE, height: SIZE },
    colorScheme: "light",
  });
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  await page.setContent(
    `<body style="margin:0"><img src="${src}" width="${SIZE}" height="${SIZE}" style="display:block"></body>`,
  );
  await page.locator("img").evaluate((img: HTMLImageElement) => img.decode());
  const out = new URL("apple-touch-icon.png", publicDir);
  await page.screenshot({ path: out.pathname, omitBackground: false });
  console.log(`Wrote ${out.pathname}`);
} finally {
  await browser.close();
}
