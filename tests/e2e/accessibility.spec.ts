import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  { route: "/", enterActivity: false },
  { route: "/about", enterActivity: false },
  { route: "/privacy", enterActivity: false },
  { route: "/parent/login", enterActivity: false },
  { route: "/parent/signup", enterActivity: false },
  { route: "/practice/vocabulary?grade=2", enterActivity: true },
  { route: "/practice/written-expression?grade=2", enterActivity: true },
];

for (const { route, enterActivity } of routes) {
  test(`${route} has no detectable WCAG A/AA violations`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "axe audit runs once on desktop Chromium");
    await page.goto(route);
    if (enterActivity) await page.getByRole("button", { name: /Let's go/ }).click();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
}
