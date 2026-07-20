import { describe, expect, it } from "vitest";
import { attemptInput, childProfileInput } from "./validation";

describe("account data validation", () => {
  it("accepts privacy-minimal child profiles", () => {
    expect(childProfileInput.parse({ nickname: "Sunny", grade: "2", avatar: "fox" })).toEqual({ nickname: "Sunny", grade: "2", avatar: "fox" });
  });

  it("rejects oversized names and unknown grades", () => {
    expect(childProfileInput.safeParse({ nickname: "x".repeat(31), grade: "college", avatar: "fox" }).success).toBe(false);
  });

  it("accepts written-expression word counts", () => {
    expect(attemptInput.safeParse({ clientAttemptId: "attempt-write", childProfileId: "child-123", assessmentSlug: "written-expression", grade: "2", correct: 12, total: 12, durationSeconds: 180, kind: "word-count", completedAt: new Date().toISOString() }).success).toBe(true);
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
