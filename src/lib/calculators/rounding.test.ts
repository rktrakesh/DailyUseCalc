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
    [100, 1, 100],
    [(0.1 + 0.2) / 0.003, 1, 100],
    [100.0001, 1, 101],
    [1e12, 1, 1e12],
    [1e12 + 0.0001, 1, 1e12 + 1],
    [1e12 + 0.01, 1, 1e12 + 1],
    [1e9 + 0.000001, 1, 1e9 + 1],
    [250_000_000_000, 0.25, 1e12],
    [250_000_000_000.00003, 0.25, 1e12 + 1],
    [100_000_000_000.00002, 0.1, 1e12 + 1],
  ])(
    'keeps large and noisy whole-unit count %s / %s safe as %s',
    (required, unitYield, expected) => {
      const units = requiredWholeUnits(required, unitYield);
      expect(units).toBe(expected);
      expect(units * unitYield).toBeGreaterThanOrEqual(
        required - Number.EPSILON * Math.max(1, required),
      );
    },
  );

  it.each([
    [1.2, 0.1, 1.2],
    [1 + 0.1 + 0.1, 0.1, 1.2],
    [1.2001, 0.1, 1.3],
    [2.5, 0.25, 2.5],
    [2.50001, 0.25, 2.75],
    [0.1 + 0.2, 0.001, 0.3],
    [1_000_000, 0.25, 1_000_000],
    [1_000_000.01, 0.25, 1_000_000.25],
    [1e-6, 1e-7, 1e-6],
    [1e-9, 1e-12, 1e-9],
    [1e-12, 1e-15, 1e-12],
  ])('rounds %s upward to the %s increment as %s', (required, increment, expected) => {
    expect(roundUpToIncrement(required, increment)).toBe(expected);
  });

  it.each([
    [1.2, 0.1],
    [1 + 0.1 + 0.1, 0.1],
    [2.5, 0.25],
    [2.5000000000000004, 0.25],
    [0.001, 0.001],
    [1e-6, 1e-7],
    [1e-9, 1e-12],
    [1e-12, 1e-15],
  ])('keeps exact and noise-level boundaries aligned for %s at %s', (required, increment) => {
    const rounded = roundUpToIncrement(required, increment);
    expect(rounded).toBeGreaterThanOrEqual(required - Number.EPSILON * Math.max(1, required));
    expect(rounded / increment).toBeCloseTo(Math.round(rounded / increment), 10);
  });

  it.each([
    [1.2001, 0.1, 1.3],
    [1.2 + 1e-12, 0.1, 1.3],
    [2.50001, 0.25, 2.75],
    [1e-6 + 1e-12, 1e-7, 0.0000011],
    [1e-9 + 1e-15, 1e-12, 1.001e-9],
  ])('rounds a genuine excess %s upward at %s', (required, increment, expected) => {
    expect(roundUpToIncrement(required, increment)).toBe(expected);
  });

  it.each([
    [1e12 + 0.0001, 0.001],
    [1e12 + 0.01, 0.001],
    [1e9 + 0.000001, 1e-7],
  ])('never under-orders a large-magnitude requirement %s at %s', (required, increment) => {
    const rounded = roundUpToIncrement(required, increment);
    expect(rounded).toBeGreaterThanOrEqual(required);
    expect(rounded / increment).toBeCloseTo(Math.round(rounded / increment), 10);
  });

  it('normalizes only numerical-noise-level negative leftovers', () => {
    expect(normalizeNumericalLeftover(1.2, 1.2000000000000002)).toBe(0);
    expect(normalizeNumericalLeftover(1.2, 1.2001)).toBeCloseTo(-0.0001);
    expect(normalizeNumericalLeftover(1.3, 1.2001)).toBeCloseTo(0.0999);
  });
});
