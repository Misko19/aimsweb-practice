import { describe, expect, it } from "vitest";
import { attemptInput, childProfileInput } from "./validation";

describe("account data validation", () => {
  it("accepts privacy-minimal child profiles", () => {
    expect(childProfileInput.parse({ nickname: "Sunny", grade: "2", avatar: "fox" })).toEqual({ nickname: "Sunny", grade: "2", avatar: "fox" });
  });

  it("rejects oversized names and unknown grades", () => {
    expect(childProfileInput.safeParse({ nickname: "x".repeat(31), grade: "college", avatar: "fox" }).success).toBe(false);
  });

  it("rejects impossible and malformed practice results", () => {
    const base = {
      clientAttemptId: "attempt-123",
      childProfileId: "child-123",
      assessmentSlug: "vocabulary",
      grade: "2",
      correct: 5,
      total: 4,
      durationSeconds: 30,
      kind: "accuracy",
      completedAt: new Date().toISOString(),
    };
    expect(attemptInput.safeParse(base).success).toBe(false);
    expect(attemptInput.safeParse({ ...base, correct: 4, durationSeconds: 0 }).success).toBe(false);
    expect(attemptInput.safeParse({ ...base, correct: 4, assessmentSlug: "" }).success).toBe(false);
  });
});
