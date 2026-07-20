import { describe, expect, it } from "vitest";
import { ASSESSMENTS } from "./assessments";
import { generatePracticeItems } from "./practice";

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16_807) % 2_147_483_647;
    return (value - 1) / 2_147_483_646;
  };
}

describe("practice across every supported grade", () => {
  it("generates valid, unique items for every assessment/grade pairing", () => {
    for (const assessment of ASSESSMENTS) {
      for (const grade of assessment.grades) {
        const questions = generatePracticeItems(assessment, grade, 4, seeded(91));
        expect(questions.length, `${assessment.slug} ${grade}`).toBeGreaterThan(0);
        expect(questions.length).toBeLessThanOrEqual(4);
        const keys = questions.map(({ prompt, context, answer }) => `${prompt}\u0000${context ?? ""}\u0000${answer}`);
        expect(new Set(keys).size).toBe(keys.length);
        for (const question of questions) {
          if (question.choices) expect(question.choices).toContain(question.answer);
        }
      }
    }
  });

  it("keeps Grade 1 one-digit facts to one-digit operands", () => {
    const assessment = ASSESSMENTS.find(({ slug }) => slug === "math-facts-one-digit")!;
    const questions = generatePracticeItems(assessment, "1", 8, seeded(15));
    for (const question of questions) {
      const operands = question.prompt.match(/\d+/g)?.map(Number) ?? [];
      expect(operands.every((number) => number <= 9)).toBe(true);
    }
  });
});
