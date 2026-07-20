import { expect, test } from "@playwright/test";

for (const example of [
  { name: "word cue", url: "/practice/spelling?grade=2", path: "/audio/erinome/spelling/early/" },
  { name: "story cue", url: "/practice/listening-comprehension?grade=2", path: "/audio/erinome/listening-comprehension/the-window-garden.wav" },
]) {
  test(`a listening activity loads its generated Erinome ${example.name}`, async ({ page }) => {
    await page.goto(example.url);
    await page.getByRole("button", { name: /Let's go/ }).click();

    const audioResponse = page.waitForResponse((response) =>
      response.url().includes(example.path) && response.request().resourceType() === "media",
    );
    await page.getByRole("button", { name: "Listen" }).click();

    const response = await audioResponse;
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("audio/wav");
  });
}
