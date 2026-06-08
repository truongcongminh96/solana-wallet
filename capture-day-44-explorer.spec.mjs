import { test } from "@playwright/test";

test("capture Day 44 Explorer metadata tab", async ({ page }) => {
  await page.goto(
    "https://explorer.solana.com/address/Hk1E4nVjSdzz8hDPWyywbhFav1wenpqUSvsbJbnDoekD?cluster=devnet",
    { waitUntil: "networkidle" }
  );
  await page.getByText("Metadata", { exact: true }).click();
  await page.waitForTimeout(5000);
  await page.screenshot({
    path: "day-44-explorer-metadata.png",
    fullPage: true,
  });
});
