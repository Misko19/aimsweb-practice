import { describe, expect, it } from "vitest";
import { ASSESSMENTS } from "./assessments";
import { generatePracticeItems, isCorrectAnswer, oralPassageForGrade } from "./practice";

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16_807) % 2_147_483_647;
    return (value - 1) / 2_147_483_646;
  };
}

describe("practice item generation", () => {
  it("generates answerable items for every catalog entry and grade", () => {
    for (const assessment of ASSESSMENTS) {
      const questions = generatePracticeItems(assessment, assessment.grades[0], 4, seeded(42));
      expect(questions).toHaveLength(4);
      for (const question of questions) {
        expect(question.prompt).toBeTruthy();
        expect(question.answer).toBeTruthy();
        if (question.choices) expect(question.choices).toContain(question.answer);
      }
    }
  });

  it("is deterministic with an injected random source", () => {
    const assessment = ASSESSMENTS.find(({ slug }) => slug === "mental-computation")!;
    expect(generatePracticeItems(assessment, "5", 8, seeded(7))).toEqual(generatePracticeItems(assessment, "5", 8, seeded(7)));
  });

  it("normalizes harmless answer differences", () => {
    expect(isCorrectAnswer("  HAPPY! ", "happy")).toBe(true);
    expect(isCorrectAnswer("7", "8")).toBe(false);
  });

  it("provides original passages across developmental bands", () => {
    expect(oralPassageForGrade("2").wordCount).toBeGreaterThan(40);
    expect(oralPassageForGrade("7").text).not.toBe(oralPassageForGrade("2").text);
    expect(oralPassageForGrade("10").text).not.toBe(oralPassageForGrade("7").text);
  });
});
