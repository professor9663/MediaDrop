// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, clearRateLimitsForTests } from "../lib/security/rate-limit";

describe("in-memory request limits", () => {
  beforeEach(() => clearRateLimitsForTests());

  it("limits requests per key and resets after its window", () => {
    expect(checkRateLimit("analyze:test", 2, 1000, 10).allowed).toBe(true);
    expect(checkRateLimit("analyze:test", 2, 1000, 20).allowed).toBe(true);
    const blocked = checkRateLimit("analyze:test", 2, 1000, 30);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(checkRateLimit("analyze:test", 2, 1000, 1011).allowed).toBe(true);
  });
});
