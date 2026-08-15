import { describe, expect, it, vi } from 'vitest';
import { invalidateSubmittedResultOnValidationFailure } from './calculationSubmission';

describe('submitted calculation result invalidation', () => {
  it('clears the successful submission after a failed calculation attempt', () => {
    const clear = vi.fn();

    expect(invalidateSubmittedResultOnValidationFailure([{}], clear)).toBe(true);
    expect(clear).toHaveBeenCalledOnce();
  });

  it('retains the successful submission when the calculation attempt is valid', () => {
    const clear = vi.fn();

    expect(invalidateSubmittedResultOnValidationFailure([], clear)).toBe(false);
    expect(clear).not.toHaveBeenCalled();
  });

  it('allows a fresh successful submission after invalidation', () => {
    let submitted: { value: number } | undefined = { value: 10 };
    invalidateSubmittedResultOnValidationFailure([{}], () => {
      submitted = undefined;
    });
    expect(submitted).toBeUndefined();

    submitted = { value: 20 };
    expect(submitted).toEqual({ value: 20 });
  });
});
