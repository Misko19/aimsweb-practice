import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("major guest routes have no detectable WCAG A/AA violations", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "axe audit runs once on desktop Chromium");
  for (const route of ["/", "/about", "/privacy", "/parent/login", "/parent/signup", "/practice/vocabulary?grade=2", "/practice/written-expression?grade=2"]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations, route).toEqual([]);
  }
});
