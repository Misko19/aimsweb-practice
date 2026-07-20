import { expect, test } from "@playwright/test";

test("guest can choose grade 2 and complete a reading activity", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Build brave reading and math skills");
  await page.getByLabel("Grade level").selectOption("2");
  const vocabularyCard = page.getByRole("article").filter({ hasText: "Vocabulary" });
  await vocabularyCard.getByRole("link", { name: /Start practice/ }).click();
  await expect(page).toHaveURL(/practice\/vocabulary\?grade=2/);
  await page.getByRole("button", { name: /Let's go/ }).click();

  for (let index = 0; index < 8; index += 1) {
    await page.getByRole("group", { name: "Answer choices" }).getByRole("button").first().click();
    await page.getByRole("button", { name: "Check answer" }).click();
  }

  await expect(page.getByRole("heading", { name: "Nice, steady work!" })).toBeVisible();
  await expect(page.getByText(/practice accuracy/)).toBeVisible();
  const attempts = await page.evaluate(() => JSON.parse(localStorage.getItem("brightpath-attempts") ?? "[]"));
  expect(attempts).toHaveLength(1);
  expect(attempts[0].assessment).toBe("vocabulary");
});

test("mobile grade picker exposes math activities", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only layout check");
  await page.goto("/");
  await page.getByRole("button", { name: "Math", exact: true }).click();
  await expect(page.getByRole("article").filter({ hasText: "Mental Computation Fluency" })).toBeVisible();
});
