import { expect, test, type Page } from "@playwright/test";

async function signUp(page: Page, email: string) {
  await page.goto("/parent/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("Bright-path-test-42!");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create parent account" }).click();
  await expect(page).toHaveURL(/\/parent\/dashboard/);
}

test("attempt replay is idempotent and parent APIs reject another account's child IDs", async ({ browser, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "authorization flow runs once on desktop Chromium");
  const ownerContext = await browser.newContext({ baseURL });
  const otherContext = await browser.newContext({ baseURL });
  const owner = await ownerContext.newPage();
  const other = await otherContext.newPage();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    await signUp(owner, `owner-${suffix}@example.test`);
    await owner.getByLabel("Nickname").fill("Comet");
    await owner.getByLabel("Grade").selectOption("2");
    await owner.getByRole("button", { name: "Save profile" }).click();
    const practiceHref = await owner.getByRole("link", { name: "Practice as Comet" }).getAttribute("href");
    const childId = new URL(practiceHref!, baseURL).searchParams.get("child");
    expect(childId).toBeTruthy();

    await signUp(other, `other-${suffix}@example.test`);
    await other.getByLabel("Nickname").fill("Orbit");
    await other.getByLabel("Grade").selectOption("2");
    await other.getByRole("button", { name: "Save profile" }).click();
    const ownHref = await other.getByRole("link", { name: "Practice as Orbit" }).getAttribute("href");
    const ownChildId = new URL(ownHref!, baseURL).searchParams.get("child");
    const replayPayload = {
      clientAttemptId: crypto.randomUUID(),
      childProfileId: ownChildId,
      assessmentSlug: "vocabulary",
      grade: "2",
      correct: 1,
      total: 1,
      durationSeconds: 1,
      kind: "accuracy",
      completedAt: new Date().toISOString(),
    };
    expect((await other.request.post("/api/attempts", { data: replayPayload })).status()).toBe(200);
    expect((await other.request.post("/api/attempts", { data: replayPayload })).status()).toBe(200);
    const ownExport = await other.request.get("/api/parent/export");
    expect((await ownExport.json()).attempts).toHaveLength(1);

    const foreignAttempt = await other.request.post("/api/attempts", { data: { ...replayPayload, clientAttemptId: crypto.randomUUID(), childProfileId: childId } });
    expect(foreignAttempt.status()).toBe(404);
    const foreignDelete = await other.request.delete(`/api/children?id=${encodeURIComponent(childId!)}`);
    expect(foreignDelete.status()).toBe(404);
    await expect(owner.getByRole("link", { name: "Practice as Comet" })).toBeVisible();
  } finally {
    await ownerContext.close();
    await otherContext.close();
  }
});
