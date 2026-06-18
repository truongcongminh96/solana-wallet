import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";

const htmlUrl = new URL("./day-53-terminal-proof.html", import.meta.url);
const outputFile = new URL("./day-53-terminal-proof.png", import.meta.url);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1500, height: 1800 },
  deviceScaleFactor: 1.5,
});

await page.goto(htmlUrl.href, { waitUntil: "load" });
await page.locator(".shell").screenshot({
  path: fileURLToPath(outputFile),
});

await browser.close();
