import { expect, test } from "@playwright/test";

test("guest completes an original written-expression activity", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "writing flow runs once on desktop Chromium");
  await page.goto("/practice/written-expression?grade=2");
  await page.getByRole("button", { name: /Let's go/ }).click();
  await page.getByLabel("Your response").fill("I helped our garden by carrying water and checking each new leaf.");
  await expect(page.getByText("12 words written")).toBeVisible();
  await page.getByRole("button", { name: "Finish writing" }).click();
  await expect(page.getByText("words written in an original response")).toBeVisible();
  const attempts = await page.evaluate(() => JSON.parse(localStorage.getItem("brightpath-attempts") ?? "[]"));
  expect(attempts[0].kind).toBe("word-count");
});
