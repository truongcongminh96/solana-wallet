import { test } from "@playwright/test";

test("capture Day 45 collection Extensions tab", async ({ page }) => {
  await page.goto(
    "https://explorer.solana.com/address/At9uNgcT1zcmHXrAfsSXr9hCSLHeGsuN6KHSbz5Mr2eW?cluster=devnet",
    { waitUntil: "networkidle" }
  );
  await page.getByRole("tab", { name: "Extensions" }).click();
  await page.getByText("Token Group", { exact: true }).click();
  await page.waitForTimeout(5000);
  await page.screenshot({
    path: "day-45-collection-extensions.png",
    fullPage: true,
  });
});
