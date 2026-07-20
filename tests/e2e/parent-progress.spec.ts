import { expect, test } from "@playwright/test";

test("parent creates a child and sees saved practice progress", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "account flow runs once on desktop Chromium");
  const email = `parent-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
  const password = "Bright-path-test-42!";

  await page.goto("/parent/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create parent account" }).click();
  await expect(page).toHaveURL(/\/parent\/dashboard/);

  await page.getByLabel("Nickname").fill("Sunny");
  await page.getByLabel("Grade").selectOption("2");
  await page.getByRole("button", { name: "Save profile" }).click();
  const childCard = page.getByRole("article").filter({ hasText: "Sunny" });
  await expect(childCard).toBeVisible();
  await childCard.getByRole("link", { name: "Practice as Sunny" }).click();

  const vocabularyCard = page.getByRole("article").filter({ hasText: "Vocabulary" });
  await vocabularyCard.getByRole("link", { name: /Start practice/ }).click();
  await page.getByRole("button", { name: /Let's go/ }).click();
  const progress = await page.locator(".practice-progress").innerText();
  const total = Number(progress.match(/of (\d+)/i)?.[1]);
  for (let index = 0; index < total; index += 1) {
    await page.getByRole("group", { name: "Answer choices" }).getByRole("button").first().click();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByRole("status")).toBeVisible();
    await expect(page.getByRole("status")).toBeHidden();
  }
  await expect(page.getByText("Progress saved to this child profile.")).toBeVisible();

  await page.goto("/parent/dashboard");
  await expect(page.getByRole("article").filter({ hasText: "Sunny" }).getByText("1", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent practice" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Vocabulary" })).toBeVisible();

  const download = await page.request.get("/api/parent/export");
  expect(download.ok()).toBe(true);
  const exported = await download.json();
  expect(exported.parent.email).toBe(email);
  expect(exported.children).toHaveLength(1);
  expect(exported.attempts).toHaveLength(1);

  await page.getByRole("button", { name: "Delete account…" }).click();
  await page.getByLabel("Current password").fill(password);
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Permanently delete" }).click();
  await expect(page).toHaveURL("/");
});
