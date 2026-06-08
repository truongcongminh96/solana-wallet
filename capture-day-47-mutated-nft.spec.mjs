import { test } from "@playwright/test";

test("capture Day 47 mutated NFT metadata", async ({ page }) => {
  await page.goto(
    "https://explorer.solana.com/address/6S4Z6Bhd71NUskriThsvhHwRpKekMotNk8HTf9tDUPiV?cluster=devnet",
    { waitUntil: "networkidle" }
  );
  await page.getByRole("tab", { name: "Metadata" }).click();
  await page.waitForTimeout(5000);
  await page.screenshot({
    path: "day-47-mutated-nft-metadata.png",
    fullPage: true,
  });
});
