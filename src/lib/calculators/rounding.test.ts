import { describe, expect, it } from 'vitest';
import { normalizeNumericalLeftover, requiredWholeUnits, roundUpToIncrement } from './rounding';

describe('purchasing rounding policy', () => {
  it.each([
    [100, 1, 100],
    [100.00000000000001, 1, 100],
    [100.0001, 1, 101],
    [99.9999, 1, 100],
    [1_000_000_000_000, 1, 1_000_000_000_000],
    [1_000_000_000_000.01, 1, 1_000_000_000_001],
  ])('rounds %s required with %s yield to %s units', (required, unitYield, expected) => {
    expect(requiredWholeUnits(required, unitYield)).toBe(expected);
  });

  it.each([
    [1.2, 0.1, 1.2],
    [1 + 0.1 + 0.1, 0.1, 1.2],
    [1.2001, 0.1, 1.3],
    [2.5, 0.25, 2.5],
    [2.50001, 0.25, 2.75],
    [0.1 + 0.2, 0.001, 0.3],
    [1_000_000, 0.25, 1_000_000],
    [1_000_000.01, 0.25, 1_000_000.25],
  ])('rounds %s upward to the %s increment as %s', (required, increment, expected) => {
    expect(roundUpToIncrement(required, increment)).toBe(expected);
  });

  it('normalizes only numerical-noise-level negative leftovers', () => {
    expect(normalizeNumericalLeftover(1.2, 1.2000000000000002)).toBe(0);
    expect(normalizeNumericalLeftover(1.2, 1.2001)).toBeCloseTo(-0.0001);
    expect(normalizeNumericalLeftover(1.3, 1.2001)).toBeCloseTo(0.0999);
  });
});
