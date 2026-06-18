import { test } from "@playwright/test";

test("capture Day 50 Transfer Fee extension", async ({ page }) => {
  const mintAddress = process.env.DAY_50_MINT_ADDRESS;

  if (!mintAddress) {
    throw new Error("Set DAY_50_MINT_ADDRESS before running this capture.");
  }

  await page.goto(
    `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`,
    { waitUntil: "networkidle" }
  );
  await page.getByRole("tab", { name: "Extensions" }).click();
  await page.waitForTimeout(5000);
  await page.screenshot({
    path: "day-50-transfer-fee-extensions.png",
    fullPage: true,
  });
});
