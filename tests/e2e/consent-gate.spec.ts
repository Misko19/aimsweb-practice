import { expect, test } from "@playwright/test";

test("direct signup cannot create child data before current privacy acceptance", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "consent flow runs once on desktop Chromium");
  const email = `consent-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
  const password = "Bright-path-test-42!";
  await page.goto("/");
  const signupStatus = await page.evaluate(async ({ email, password }) => {
    const response = await fetch("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Parent", email, password }),
    });
    return response.status;
  }, { email, password });
  expect(signupStatus).toBe(200);

  const blocked = await page.request.post("/api/children", { data: { nickname: "Nova", grade: "2", avatar: "fox" } });
  expect(blocked.status()).toBe(403);
  await page.goto("/parent/dashboard");
  await expect(page).toHaveURL(/\/parent\/consent/);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept and continue" }).click();
  await expect(page).toHaveURL(/\/parent\/dashboard/);
  await page.getByLabel("Nickname").fill("Nova");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("link", { name: "Practice as Nova" })).toBeVisible();
});
