import { ProviderError } from './errors';

export class CircuitBreaker {
  readonly #failureThreshold: number;
  readonly #cooldownMs: number;
  readonly #clock: () => number;
  #failures = 0;
  #openedAt: number | undefined;

  constructor(
    options: { failureThreshold?: number; cooldownMs?: number; clock?: () => number } = {},
  ) {
    this.#failureThreshold = options.failureThreshold ?? 3;
    this.#cooldownMs = options.cooldownMs ?? 30_000;
    this.#clock = options.clock ?? Date.now;
  }

  async run<Value>(operation: () => Promise<Value>): Promise<Value> {
    if (this.#openedAt !== undefined) {
      if (this.#clock() - this.#openedAt < this.#cooldownMs) {
        throw new ProviderError({
          message: 'Research provider circuit is open; deterministic fallback is active.',
          code: 'PROVIDER_CIRCUIT_OPEN',
          retryable: true,
        });
      }
      this.#openedAt = undefined;
      this.#failures = 0;
    }
    try {
      const value = await operation();
      this.#failures = 0;
      return value;
    } catch (error) {
      this.#failures += 1;
      if (this.#failures >= this.#failureThreshold) this.#openedAt = this.#clock();
      throw error;
    }
  }
}

export async function withRetry<Value>(
  operation: () => Promise<Value>,
  options: {
    attempts?: number;
    baseDelayMs?: number;
    maximumDelayMs?: number;
    random?: () => number;
    shouldRetry?: (error: unknown) => boolean;
    sleep?: (delayMs: number) => Promise<void>;
  } = {},
): Promise<Value> {
  const attempts = Math.max(1, Math.min(options.attempts ?? 2, 3));
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 100);
  const maximumDelayMs = Math.max(baseDelayMs, options.maximumDelayMs ?? 5_000);
  const random = options.random ?? Math.random;
  const sleep =
    options.sleep ?? ((delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  const shouldRetry =
    options.shouldRetry ??
    ((error: unknown) => error instanceof ProviderError && error.retryable === true);
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetry(error)) throw error;
      const exponentialDelay = Math.min(maximumDelayMs, baseDelayMs * 2 ** (attempt - 1));
      // Equal jitter keeps half of the exponential delay and randomizes the other half. It avoids
      // synchronized provider retries while retaining a deterministic upper bound.
      const jitteredDelay = exponentialDelay * (0.5 + Math.min(1, Math.max(0, random())) * 0.5);
      await sleep(jitteredDelay);
    }
  }
  throw lastError;
}

export class SlidingWindowRateLimiter {
  readonly #limit: number;
  readonly #windowMs: number;
  readonly #maxKeys: number;
  readonly #clock: () => number;
  readonly #events = new Map<string, number[]>();
  #lastPrunedAt: number;

  constructor(options: {
    limit: number;
    windowMs: number;
    maxKeys?: number;
    clock?: () => number;
  }) {
    this.#limit = options.limit;
    this.#windowMs = options.windowMs;
    this.#maxKeys = Math.max(1, options.maxKeys ?? 10_000);
    this.#clock = options.clock ?? Date.now;
    this.#lastPrunedAt = this.#clock();
  }

  take(opaqueKey: string): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
    const now = this.#clock();
    const cutoff = now - this.#windowMs;
    if (now - this.#lastPrunedAt >= this.#windowMs) this.#pruneExpired(cutoff, now);

    if (!this.#events.has(opaqueKey) && this.#events.size >= this.#maxKeys) {
      this.#pruneExpired(cutoff, now);
      if (this.#events.size >= this.#maxKeys) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil(this.#windowMs / 1_000)),
          remaining: 0,
        };
      }
    }

    const recent = (this.#events.get(opaqueKey) ?? []).filter((timestamp) => timestamp > cutoff);
    if (recent.length >= this.#limit) {
      this.#events.set(opaqueKey, recent);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + this.#windowMs - now) / 1_000)),
        remaining: 0,
      };
    }
    recent.push(now);
    this.#events.set(opaqueKey, recent);
    return { allowed: true, retryAfterSeconds: 0, remaining: this.#limit - recent.length };
  }

  get trackedKeyCount(): number {
    return this.#events.size;
  }

  #pruneExpired(cutoff: number, now: number): void {
    for (const [key, events] of this.#events) {
      const recent = events.filter((timestamp) => timestamp > cutoff);
      if (recent.length === 0) this.#events.delete(key);
      else if (recent.length !== events.length) this.#events.set(key, recent);
    }
    this.#lastPrunedAt = now;
  }
}

/**
 * A process-local admission guard for expensive Research workflows. Distributed deployments still
 * need an edge or shared-store concurrency policy, but each process refuses work beyond this bound
 * instead of building an unbounded provider/retrieval queue.
 */
export class InProcessConcurrencyLimiter {
  readonly #limit: number;
  #active = 0;

  constructor(options: { limit: number }) {
    if (!Number.isInteger(options.limit) || options.limit < 1) {
      throw new RangeError('Concurrency limit must be a positive integer.');
    }
    this.#limit = options.limit;
  }

  tryAcquire(): (() => void) | undefined {
    if (this.#active >= this.#limit) return undefined;
    this.#active += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.#active -= 1;
    };
  }

  get activeCount(): number {
    return this.#active;
  }
}
