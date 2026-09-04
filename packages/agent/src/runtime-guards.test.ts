import { describe, expect, it, vi } from 'vitest';

import { ProviderError } from './errors';
import {
  CircuitBreaker,
  InProcessConcurrencyLimiter,
  SlidingWindowRateLimiter,
  withRetry,
} from './runtime-guards';

describe('provider runtime guards', () => {
  it('retries only bounded retryable failures', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(
        new ProviderError({ message: 'retry', code: 'RETRY', retryable: true }),
      )
      .mockResolvedValue('ok');

    await expect(withRetry(operation, { attempts: 2, baseDelayMs: 0 })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('uses capped exponential backoff with jitter for retryable failures', async () => {
    const failure = new ProviderError({ message: 'retry', code: 'RETRY', retryable: true });
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(failure)
      .mockRejectedValueOnce(failure)
      .mockResolvedValue('ok');
    const delays: number[] = [];

    await expect(
      withRetry(operation, {
        attempts: 4,
        baseDelayMs: 100,
        maximumDelayMs: 250,
        random: () => 0.5,
        sleep: async (delayMs) => {
          delays.push(delayMs);
        },
      }),
    ).resolves.toBe('ok');

    // Retry attempts are capped at three, so the fourth configured attempt is never admitted.
    expect(operation).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([75, 150]);
  });

  it('does not retry non-retryable provider failures', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(
        new ProviderError({ message: 'invalid request', code: 'INVALID', retryable: false }),
      );
    const sleep = vi.fn(async () => undefined);

    await expect(withRetry(operation, { attempts: 3, sleep })).rejects.toMatchObject({
      code: 'INVALID',
    });
    expect(operation).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('opens the circuit and recovers only after cooldown', async () => {
    let now = 1_000;
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      cooldownMs: 500,
      clock: () => now,
    });
    const failure = async () => {
      throw new Error('provider down');
    };

    await expect(breaker.run(failure)).rejects.toThrow('provider down');
    await expect(breaker.run(failure)).rejects.toThrow('provider down');
    await expect(breaker.run(async () => 'blocked')).rejects.toMatchObject({
      code: 'PROVIDER_CIRCUIT_OPEN',
    });
    now += 501;
    await expect(breaker.run(async () => 'recovered')).resolves.toBe('recovered');
  });

  it('rate limits opaque keys without retaining request content', () => {
    let now = 0;
    const limiter = new SlidingWindowRateLimiter({ limit: 2, windowMs: 1_000, clock: () => now });

    expect(limiter.take('opaque').allowed).toBe(true);
    expect(limiter.take('opaque').allowed).toBe(true);
    expect(limiter.take('opaque').allowed).toBe(false);
    now = 1_001;
    expect(limiter.take('opaque').allowed).toBe(true);
  });

  it('prunes expired one-off keys and fails closed at the active-key cap', () => {
    let now = 0;
    const limiter = new SlidingWindowRateLimiter({
      limit: 2,
      windowMs: 1_000,
      maxKeys: 2,
      clock: () => now,
    });

    expect(limiter.take('opaque-a').allowed).toBe(true);
    expect(limiter.take('opaque-b').allowed).toBe(true);
    expect(limiter.trackedKeyCount).toBe(2);
    expect(limiter.take('opaque-c').allowed).toBe(false);
    expect(limiter.trackedKeyCount).toBe(2);

    now = 1_001;
    expect(limiter.take('opaque-c').allowed).toBe(true);
    expect(limiter.trackedKeyCount).toBe(1);
  });

  it('admits only the configured number of concurrent workflows and releases idempotently', () => {
    const limiter = new InProcessConcurrencyLimiter({ limit: 2 });
    const releaseFirst = limiter.tryAcquire();
    const releaseSecond = limiter.tryAcquire();

    expect(releaseFirst).toBeTypeOf('function');
    expect(releaseSecond).toBeTypeOf('function');
    expect(limiter.activeCount).toBe(2);
    expect(limiter.tryAcquire()).toBeUndefined();

    releaseFirst?.();
    releaseFirst?.();
    expect(limiter.activeCount).toBe(1);
    expect(limiter.tryAcquire()).toBeTypeOf('function');
  });

  it('rejects an invalid concurrency budget instead of silently disabling the guard', () => {
    expect(() => new InProcessConcurrencyLimiter({ limit: 0 })).toThrow(RangeError);
    expect(() => new InProcessConcurrencyLimiter({ limit: 1.5 })).toThrow(RangeError);
  });
});
