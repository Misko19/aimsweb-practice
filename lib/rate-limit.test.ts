import { beforeEach, describe, expect, it } from "vitest";
import { clearRateLimitsForTests, takeRateLimit } from "./rate-limit";

describe("takeRateLimit", () => {
  beforeEach(clearRateLimitsForTests);

  it("allows requests up to the limit and reports a retry window", () => {
    expect(takeRateLimit("parent:attempt", 2, 60_000, 1_000).allowed).toBe(true);
    expect(takeRateLimit("parent:attempt", 2, 60_000, 2_000).allowed).toBe(true);
    expect(takeRateLimit("parent:attempt", 2, 60_000, 3_000)).toEqual({ allowed: false, retryAfterSeconds: 58 });
  });

  it("starts a fresh bucket after the window", () => {
    takeRateLimit("parent:attempt", 1, 1_000, 1_000);
    expect(takeRateLimit("parent:attempt", 1, 1_000, 2_000).allowed).toBe(true);
  });
});
