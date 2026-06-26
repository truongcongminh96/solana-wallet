import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const outputFile = new URL("./day-66-terminal-proof.png", import.meta.url);
const proofFile = new URL("./day-66-terminal-proof.txt", import.meta.url);
const proofText = await readFile(proofFile, "utf8");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1480, height: 1100 },
  deviceScaleFactor: 1.5,
});

await page.setContent(
  `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Day 66 Terminal Proof</title>
      <style>
        :root { color-scheme: dark; }
        body {
          margin: 0;
          min-height: 100vh;
          background: linear-gradient(135deg, #071018 0%, #171918 56%, #101611 100%);
          font-family: Consolas, "Courier New", monospace;
          color: #eef7f4;
        }
        .frame {
          width: min(1280px, calc(100vw - 40px));
          margin: 20px auto;
          border: 1px solid rgba(149, 204, 190, 0.28);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.5);
          background: rgba(7, 12, 18, 0.96);
        }
        .bar {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 14px 18px;
          background: rgba(18, 25, 31, 0.98);
          border-bottom: 1px solid rgba(149, 204, 190, 0.18);
        }
        .dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
        }
        .dot.red { background: #ff5f57; }
        .dot.yellow { background: #febc2e; }
        .dot.green { background: #28c840; }
        .title {
          margin-left: 10px;
          color: #a9c8c4;
          font-size: 14px;
        }
        pre {
          margin: 0;
          padding: 22px;
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.44;
          font-size: 18px;
        }
      </style>
    </head>
    <body>
      <div class="frame">
        <div class="bar">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
          <span class="title">day-66 config PDA constraints proof</span>
        </div>
        <pre></pre>
      </div>
    </body>
  </html>`,
  { waitUntil: "load" },
);
await page.locator("pre").evaluate((node, text) => {
  node.textContent = text;
}, proofText);
await page.locator(".frame").screenshot({
  path: fileURLToPath(outputFile),
});

await browser.close();
