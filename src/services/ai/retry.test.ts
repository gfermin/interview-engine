import { describe, expect, it, vi } from "vitest";
import { isRetryableAIError, withAIRetry } from "./retry";

function withStatus(status: number | undefined) {
  return Object.assign(new Error(`status ${status}`), { status });
}

describe("isRetryableAIError", () => {
  it("retries a network-level failure (status undefined, but present)", () => {
    expect(isRetryableAIError(withStatus(undefined))).toBe(true);
  });

  it("retries 429 and 5xx", () => {
    expect(isRetryableAIError(withStatus(429))).toBe(true);
    expect(isRetryableAIError(withStatus(500))).toBe(true);
    expect(isRetryableAIError(withStatus(503))).toBe(true);
  });

  it("never retries a 4xx other than 429", () => {
    expect(isRetryableAIError(withStatus(400))).toBe(false);
    expect(isRetryableAIError(withStatus(401))).toBe(false);
    expect(isRetryableAIError(withStatus(404))).toBe(false);
  });

  it("does not retry an error with no status property at all", () => {
    expect(isRetryableAIError(new Error("unrelated bug"))).toBe(false);
  });
});

describe("withAIRetry", () => {
  it("returns the result on the first success without retrying", async () => {
    const fn = vi.fn(async () => "ok");
    await expect(withAIRetry(fn, { baseDelayMs: 1 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable failure up to the attempt limit, then throws", async () => {
    const fn = vi.fn(async () => {
      throw withStatus(500);
    });
    await expect(withAIRetry(fn, { attempts: 3, baseDelayMs: 1 })).rejects.toThrow(/status 500/);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry a non-retryable failure — fails on the first attempt", async () => {
    const fn = vi.fn(async () => {
      throw withStatus(401);
    });
    await expect(withAIRetry(fn, { attempts: 3, baseDelayMs: 1 })).rejects.toThrow(/status 401/);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
