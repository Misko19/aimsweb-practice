import { expect, test } from "@playwright/test";

test("a listening activity loads generated Erinome audio", async ({ page }) => {
  await page.goto("/practice/spelling?grade=2");
  await page.getByRole("button", { name: /Let's go/ }).click();

  const audioResponse = page.waitForResponse((response) =>
    response.url().includes("/audio/erinome/spelling/early/") && response.request().resourceType() === "media",
  );
  await page.getByRole("button", { name: "Listen to the question" }).click();

  const response = await audioResponse;
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("audio/wav");
});
