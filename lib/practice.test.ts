import { describe, expect, it } from "vitest";
import { ASSESSMENTS } from "./assessments";
import { generatePracticeItems, isCorrectAnswer, oralPassageForGrade, writingPromptForGrade } from "./practice";

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16_807) % 2_147_483_647;
    return (value - 1) / 2_147_483_646;
  };
}

describe("practice item generation", () => {
  it("generates a full, unique set for every question activity and supported grade", () => {
    for (const assessment of ASSESSMENTS.filter(({ mode }) => mode === "questions")) {
      for (const [gradeIndex, grade] of assessment.grades.entries()) {
        const questions = generatePracticeItems(assessment, grade, 8, seeded(42 + gradeIndex));
        const label = `${assessment.slug}:${grade}`;
        expect(questions.length, label).toBeGreaterThanOrEqual(5);
        expect(questions.length, label).toBeLessThanOrEqual(8);
        expect(new Set(questions.map((question) => question.prompt + question.context + question.answer)).size, label).toBe(questions.length);
        for (const question of questions) {
          expect(question.prompt).toBeTruthy();
          expect(question.answer).toBeTruthy();
          if (question.choices) expect(question.choices).toContain(question.answer);
        }
      }
    }
  });

  it("is deterministic with an injected random source", () => {
    const assessment = ASSESSMENTS.find(({ slug }) => slug === "mental-computation")!;
    expect(generatePracticeItems(assessment, "5", 8, seeded(7))).toEqual(generatePracticeItems(assessment, "5", 8, seeded(7)));
  });

  it("varies the greater-number answer position", () => {
    const assessment = ASSESSMENTS.find(({ slug }) => slug === "number-comparison-pairs")!;
    const questions = generatePracticeItems(assessment, "1", 8, seeded(17));
    const positions = new Set(questions.map((question) => question.choices?.indexOf(question.answer)));
    expect(positions).toEqual(new Set([0, 1]));
  });

  it("normalizes harmless answer differences", () => {
    expect(isCorrectAnswer("  HAPPY! ", "happy")).toBe(true);
    expect(isCorrectAnswer("7", "8")).toBe(false);
  });

  it("provides original passages and writing prompts across developmental bands", () => {
    expect(oralPassageForGrade("2").wordCount).toBeGreaterThan(40);
    expect(oralPassageForGrade("7").text).not.toBe(oralPassageForGrade("2").text);
    expect(oralPassageForGrade("10").text).not.toBe(oralPassageForGrade("7").text);
    expect(writingPromptForGrade("1", () => 0)).toBe("Describe a place where you like to learn.");
    expect(writingPromptForGrade("1", () => 0.99)).toBe("Explain how to care for a plant.");
    expect(writingPromptForGrade("2", () => 0)).not.toBe(writingPromptForGrade("7", () => 0));
  });
});
