import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const terminalText = await readFile(new URL("./day-63-test-proof.txt", import.meta.url), "utf8");
const codeText = await readFile(
  new URL("./day-63-wrong-authority-test.rs.txt", import.meta.url),
  "utf8",
);

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function screenshotTerminal(page) {
  await page.setViewportSize({ width: 1460, height: 980 });
  await page.setContent(
    `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <style>
          :root { color-scheme: dark; }
          body {
            margin: 0;
            min-height: 100vh;
            background: linear-gradient(135deg, #071018 0%, #14191c 58%, #0f1512 100%);
            font-family: Consolas, "Courier New", monospace;
            color: #eef7f4;
          }
          .frame {
            width: 1260px;
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
            line-height: 1.42;
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
            <span class="title">day-63 counter test proof</span>
          </div>
          <pre>${escapeHtml(terminalText)}</pre>
        </div>
      </body>
    </html>`,
    { waitUntil: "load" },
  );
  await page.locator(".frame").screenshot({
    path: fileURLToPath(new URL("./day-63-test-proof.png", import.meta.url)),
  });
}

async function screenshotCode(page) {
  await page.setViewportSize({ width: 1460, height: 1100 });
  await page.setContent(
    `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <style>
          :root { color-scheme: dark; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle at 20% 12%, rgba(89, 155, 141, 0.3), transparent 28%),
              linear-gradient(135deg, #081016 0%, #171715 100%);
            font-family: "Cascadia Code", Consolas, "Courier New", monospace;
          }
          .card {
            width: 1180px;
            border-radius: 18px;
            overflow: hidden;
            border: 1px solid rgba(176, 219, 207, 0.26);
            box-shadow: 0 32px 110px rgba(0, 0, 0, 0.54);
            background: #0b1117;
          }
          .bar {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 16px 20px;
            background: #151c22;
            color: #accac4;
            font-size: 15px;
          }
          .dot {
            width: 12px;
            height: 12px;
            border-radius: 999px;
          }
          .dot.red { background: #ff5f57; }
          .dot.yellow { background: #febc2e; }
          .dot.green { background: #28c840; }
          .title { margin-left: 10px; }
          pre {
            margin: 0;
            padding: 30px 34px 34px;
            color: #e8f2ef;
            font-size: 23px;
            line-height: 1.48;
            white-space: pre-wrap;
          }
          .kw { color: #7dd3fc; }
          .fn { color: #c4b5fd; }
          .str { color: #a7f3d0; }
          .num { color: #fcd34d; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="bar">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
            <span class="title">programs/counter/tests/counter.rs</span>
          </div>
          <pre>${escapeHtml(codeText)
            .replaceAll("fn ", '<span class="kw">fn</span> ')
            .replaceAll("#[test]", '<span class="kw">#[test]</span>')
            .replaceAll("let ", '<span class="kw">let</span> ')
            .replaceAll("assert!", '<span class="fn">assert!</span>')
            .replaceAll("1_000_000_000", '<span class="num">1_000_000_000</span>')
            .replaceAll('"initialize should succeed"', '<span class="str">"initialize should succeed"</span>')
            .replaceAll(
              '"increment should fail when signed by the wrong authority"',
              '<span class="str">"increment should fail when signed by the wrong authority"</span>',
            )}</pre>
        </div>
      </body>
    </html>`,
    { waitUntil: "load" },
  );
  await page.locator(".card").screenshot({
    path: fileURLToPath(new URL("./day-63-wrong-authority-test.png", import.meta.url)),
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1.5 });
await screenshotTerminal(page);
await screenshotCode(page);
await browser.close();
