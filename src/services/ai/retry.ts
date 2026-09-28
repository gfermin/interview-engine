// Plan Phase 30/AUDIT-015 — a transient failure (network blip, momentary
// 5xx/429) from either AI provider previously required a manual retry, with
// no automatic recovery. Shared between claude-provider.ts and
// gemini-provider.ts rather than duplicated per-provider, since both SDKs'
// HTTP-level error classes expose the same shape this needs: a `.status`
// (Anthropic's `APIError`/Google's `ApiError` both set it), undefined for a
// raw network-level failure (no HTTP response was ever received).

export interface RetryOptions {
  /** Total attempts, including the first — not "retries on top of" (default 3). */
  attempts?: number;
  /** Delay before the first retry; doubles on each subsequent attempt. */
  baseDelayMs?: number;
}

function hasStatus(error: unknown): error is { status: number | undefined } {
  return typeof error === "object" && error !== null && "status" in error;
}

/**
 * Retries only on what retrying can plausibly fix: a network-level failure
 * (no status at all — the request never got an HTTP response) or a 429/5xx
 * from the provider. Never retries a 4xx (bad request, auth, not-found,
 * content-policy, ...) — those need a code/config fix, not a second attempt,
 * and retrying would just make a real failure take longer to surface.
 */
export function isRetryableAIError(error: unknown): boolean {
  if (!hasStatus(error)) return false;
  const { status } = error;
  if (status === undefined) return true;
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps a single AI provider call with a small, bounded retry — this is a
 * human clicking a button and waiting, not a background job, so attempts
 * and backoff are kept short (default: 3 attempts, ~500ms/1000ms delays)
 * rather than a long retry chain that would just make a real failure feel
 * slower without adding value.
 */
export async function withAIRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === attempts || !isRetryableAIError(error)) throw error;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  // Unreachable — the loop above always either returns or throws.
  throw new Error("withAIRetry: exhausted attempts without a result.");
}
