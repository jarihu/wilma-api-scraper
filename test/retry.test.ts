import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../src/retry';

describe('withRetry', () => {
  it('should return the result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after max attempts exhausted', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValue(new Error('fail 3'));

    await expect(
      withRetry(fn, { maxAttempts: 2, baseDelayMs: 0 })
    ).rejects.toThrow('fail 2');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should use default maxAttempts of 3', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { baseDelayMs: 0 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use default baseDelayMs of 1000', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should apply exponential backoff', async () => {
    const delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout.bind(globalThis);
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
      .mockImplementation((fn: any, ms?: number) => {
        if (ms !== undefined) delays.push(ms);
        return originalSetTimeout(fn, 0) as any;
      });

    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxAttempts: 4, baseDelayMs: 100 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(4);
    expect(delays).toEqual([100, 200, 400]);

    setTimeoutSpy.mockRestore();
  });

  it('should succeed on first attempt with no options', async () => {
    const fn = vi.fn().mockResolvedValue(42);

    const result = await withRetry(fn);
    expect(result).toBe(42);
  });
});
