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
  it("generates a full, unique set for every question activity", () => {
    for (const assessment of ASSESSMENTS.filter(({ mode }) => mode === "questions")) {
      const questions = generatePracticeItems(assessment, assessment.grades[0], 8, seeded(42));
      expect(questions.length, assessment.slug).toBeGreaterThanOrEqual(5);
      expect(questions.length, assessment.slug).toBeLessThanOrEqual(8);
      expect(new Set(questions.map((question) => question.prompt + question.context + question.answer)).size).toBe(questions.length);
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
    expect(writingPromptForGrade("2")).not.toBe(writingPromptForGrade("7"));
    expect(writingPromptForGrade("7")).not.toBe(writingPromptForGrade("10"));
  });
});
