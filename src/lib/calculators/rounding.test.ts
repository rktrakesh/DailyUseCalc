import { describe, expect, it } from 'vitest';
import {
  MAX_PURCHASE_DECIMAL_PLACES,
  MAX_PURCHASE_QUOTIENT,
  isSupportedPurchaseUnit,
  normalizeNumericalLeftover,
  requiredWholeUnits,
  roundUpToIncrement,
} from './rounding';

describe('purchasing rounding policy', () => {
  it.each([
    [100, 1, 100],
    [100.00000000000001, 1, 100],
    [100.0001, 1, 101],
    [99.9999, 1, 100],
  ])('rounds %s required with %s yield to %s units', (required, unitYield, expected) => {
    expect(requiredWholeUnits(required, unitYield)).toBe(expected);
  });

  it.each([
    [100, 1, 100],
    [(0.1 + 0.2) / 0.003, 1, 100],
    [100.0001, 1, 101],
    [9_999_999, 1, 9_999_999],
    [10_000_000, 1, 10_000_000],
    [2_500_000, 0.25, 10_000_000],
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

  it('normalizes only numerical-noise-level negative leftovers', () => {
    expect(normalizeNumericalLeftover(1.2, 1.2000000000000002)).toBe(0);
    expect(normalizeNumericalLeftover(1.2, 1.2001)).toBeCloseTo(-0.0001);
    expect(normalizeNumericalLeftover(1.3, 1.2001)).toBeCloseTo(0.0999);
  });

  it.each([
    [9_999_999, 1, 9_999_999],
    [10_000_000, 1, 10_000_000],
    [2_500_000, 0.25, 10_000_000],
  ])('accepts supported whole-unit quotient %s / %s', (required, yieldAmount, expected) => {
    expect(requiredWholeUnits(required, yieldAmount)).toBe(expected);
  });

  it.each([
    [10_000_000.0001, 1],
    [2_500_000.0001, 0.25],
    [1e12 + 0.0001, 1],
  ])('rejects unsupported whole-unit quotient %s / %s', (required, yieldAmount) => {
    expect(() => requiredWholeUnits(required, yieldAmount)).toThrow(RangeError);
  });

  it.each([
    [9_999_999, 1, 9_999_999],
    [10_000_000, 1, 10_000_000],
    [2_500_000, 0.25, 2_500_000],
  ])('accepts supported increment quotient %s / %s', (required, increment, expected) => {
    expect(roundUpToIncrement(required, increment)).toBe(expected);
  });

  it.each([
    [10_000_000.0001, 1],
    [2_500_000.0001, 0.25],
    [1e-3, 1e-15],
    [1e12 + 0.0001, 0.001],
  ])('rejects unsupported increment quotient %s / %s', (required, increment) => {
    expect(() => roundUpToIncrement(required, increment)).toThrow(RangeError);
  });

  it.each([
    [Number.NaN, 1],
    [Infinity, 1],
    [-1, 1],
    [1, 0],
    [1, -1],
    [1, Infinity],
  ])('rejects invalid purchasing contract values %s / %s', (required, unit) => {
    expect(() => requiredWholeUnits(required, unit)).toThrow(RangeError);
    expect(() => roundUpToIncrement(required, unit)).toThrow(RangeError);
  });

  it('caps leftover normalization to the purchasing resolution', () => {
    expect(normalizeNumericalLeftover(1.2, 1.2000000000000002, 0.1)).toBe(0);
    expect(normalizeNumericalLeftover(1e15, 1e15 + 1, 1)).toBe(-1);
    expect(MAX_PURCHASE_QUOTIENT).toBe(10_000_000);
  });

  it('enforces the shared purchasing-unit representability boundary', () => {
    for (const increment of [1, 0.5, 0.25, 0.1, 0.01, 0.001, 1e-100]) {
      expect(isSupportedPurchaseUnit(increment)).toBe(true);
      expect(roundUpToIncrement(increment, increment)).toBe(increment);
    }
    expect(MAX_PURCHASE_DECIMAL_PLACES).toBe(100);
    expect(isSupportedPurchaseUnit(1e-101)).toBe(false);
    expect(() => roundUpToIncrement(1e-101, 1e-101)).toThrow('exceeds supported decimal precision');
    expect(() => requiredWholeUnits(1e-101, 1e-101)).toThrow('exceeds supported decimal precision');
  });
});
