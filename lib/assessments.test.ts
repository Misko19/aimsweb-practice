import { describe, expect, it } from "vitest";
import { ASSESSMENTS, GRADES, assessmentsForGrade, gradeLabel } from "./assessments";

describe("assessment catalog", () => {
  it("has unique slugs and usable metadata", () => {
    expect(new Set(ASSESSMENTS.map(({ slug }) => slug)).size).toBe(ASSESSMENTS.length);
    expect(ASSESSMENTS).toHaveLength(27);
    for (const assessment of ASSESSMENTS) {
      expect(assessment.name).toBeTruthy();
      expect(assessment.description.length).toBeGreaterThan(20);
      expect(assessment.grades.length).toBeGreaterThan(0);
    }
  });

  it.each(GRADES)("offers reading and math practice for %s", (grade) => {
    const available = assessmentsForGrade(grade);
    expect(available.some(({ domain }) => domain === "Reading")).toBe(true);
    expect(available.some(({ domain }) => domain === "Math")).toBe(true);
  });

  it("maps core and classic second-grade activities", () => {
    const slugs = assessmentsForGrade("2").map(({ slug }) => slug);
    expect(slugs).toEqual(expect.arrayContaining([
      "oral-reading-fluency",
      "vocabulary",
      "reading-comprehension",
      "reading-comprehension-progress",
      "reading-maze",
      "written-expression",
      "number-comparison-triads",
      "mental-computation",
      "concepts-applications",
      "math-cap",
    ]));
  });

  it("formats grade labels", () => {
    expect(gradeLabel("pre-k")).toBe("Pre-K");
    expect(gradeLabel("k")).toBe("Kindergarten");
    expect(gradeLabel("2")).toBe("2nd grade");
    expect(gradeLabel("11")).toBe("11th grade");
  });
});
