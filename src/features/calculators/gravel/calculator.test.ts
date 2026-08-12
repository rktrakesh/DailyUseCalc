import { describe, expect, it } from 'vitest';
import {
  calculateGravel,
  recommendGravel,
  recommendedOrderCubicYards,
  validateGravelInput,
} from '.';
import { convertLength } from '../../../lib/units/measurements';
import type { GravelInput } from './types';

const baseInput: GravelInput = {
  areaShape: 'rectangle',
  projectType: 'driveway',
  gravelType: 'crushed-stone',
  length: { value: 20, unit: 'ft' },
  width: { value: 12, unit: 'ft' },
  diameter: { value: Number.NaN, unit: 'ft' },
  depth: { value: 4, unit: 'in' },
  allowancePercent: 10,
  bagSizeCubicFeet: 0.5,
  truckCapacityCubicYards: 12,
};

describe('measurement conversion', () => {
  it('converts across imperial and metric units', () => {
    expect(convertLength(24, 'in', 'ft')).toBe(2);
    expect(convertLength(1, 'm', 'ft')).toBeCloseTo(3.28084, 4);
  });

  it('round-trips a fractional length within floating-point tolerance', () => {
    const originalFeet = 12.375;
    expect(convertLength(convertLength(originalFeet, 'ft', 'm'), 'm', 'ft')).toBeCloseTo(
      originalFeet,
      10,
    );
  });
});

describe('gravel calculation', () => {
  it('calculates volume, allowance, weight, bags, and truckloads', () => {
    const result = calculateGravel(baseInput);
    expect(result.surfaceAreaSquareFeet).toBe(240);
    expect(result.volumeCubicFeet).toBeCloseTo(80);
    expect(result.volumeCubicYards).toBeCloseTo(2.96296, 4);
    expect(result.adjustedVolumeCubicYards).toBeCloseTo(3.25926, 4);
    expect(result.recommendedOrderCubicYards).toBe(3.3);
    expect(result.estimatedWeightTons).toBeCloseTo(4.56296, 4);
    expect(result.bagCount).toBe(176);
    expect(result.truckLoads).toBe(1);
  });

  it('uses provided material pricing without inventing a price', () => {
    const result = calculateGravel({ ...baseInput, pricePerCubicYard: 45, deliveryFee: 55 });
    expect(result.estimatedCost).toBe(203.5);
  });

  it('keeps equivalent metric dimensions consistent', () => {
    const result = calculateGravel({
      ...baseInput,
      length: { value: 6.096, unit: 'm' },
      width: { value: 3.6576, unit: 'm' },
      depth: { value: 10.16, unit: 'cm' },
    });
    expect(result.volumeCubicYards).toBeCloseTo(2.96296, 3);
  });

  it('calculates an imperial circle through the shared gravel pipeline', () => {
    const result = calculateGravel({
      ...baseInput,
      areaShape: 'circle',
      diameter: { value: 20, unit: 'ft' },
      depth: { value: 4, unit: 'in' },
      allowancePercent: 10,
    });
    expect(result.surfaceAreaSquareFeet).toBeCloseTo(Math.PI * 100, 10);
    expect(result.volumeCubicFeet).toBeCloseTo((Math.PI * 100) / 3, 10);
    expect(result.volumeCubicYards).toBeCloseTo(3.87851, 5);
    expect(result.adjustedVolumeCubicYards).toBeCloseTo(4.26636, 5);
    expect(result.recommendedOrderCubicYards).toBe(4.3);
    expect(result.estimatedWeightTons).toBeCloseTo(5.9729, 4);
  });

  it('calculates an equivalent metric circle and supports decimal diameters', () => {
    const metric = calculateGravel({
      ...baseInput,
      areaShape: 'circle',
      diameter: { value: 6, unit: 'm' },
      depth: { value: 10, unit: 'cm' },
      allowancePercent: 0,
    });
    const decimal = calculateGravel({
      ...baseInput,
      areaShape: 'circle',
      diameter: { value: 12.5, unit: 'ft' },
      allowancePercent: 0,
    });
    expect(metric.volumeCubicMeters).toBeCloseTo(Math.PI * 3 ** 2 * 0.1, 8);
    expect(metric.recommendedOrderCubicYards).toBe(3.7);
    expect(decimal.surfaceAreaSquareFeet).toBeCloseTo(Math.PI * 6.25 ** 2, 10);
  });

  it('ignores inactive geometry fields', () => {
    const circle = calculateGravel({
      ...baseInput,
      areaShape: 'circle',
      length: { value: 999, unit: 'ft' },
      width: { value: 999, unit: 'ft' },
      diameter: { value: 20, unit: 'ft' },
    });
    const rectangle = calculateGravel({
      ...baseInput,
      areaShape: 'rectangle',
      diameter: { value: 999, unit: 'ft' },
    });
    expect(circle.surfaceAreaSquareFeet).toBeCloseTo(Math.PI * 100, 10);
    expect(rectangle.surfaceAreaSquareFeet).toBe(240);
  });

  it('uses bag pricing only when bulk pricing is absent', () => {
    const bagOnly = calculateGravel({ ...baseInput, bagPrice: 6 });
    const bothPrices = calculateGravel({ ...baseInput, bagPrice: 6, pricePerCubicYard: 45 });
    expect(bagOnly.estimatedCost).toBe(1_056);
    expect(bothPrices.estimatedCost).toBe(148.5);
  });

  it('rounds truck loads above an exact capacity', () => {
    expect(calculateGravel({ ...baseInput, truckCapacityCubicYards: 3 }).truckLoads).toBe(2);
  });

  it('uses one truck load when the recommended order exactly matches capacity', () => {
    expect(calculateGravel({ ...baseInput, truckCapacityCubicYards: 3.3 }).truckLoads).toBe(1);
  });

  it('supports fractional and very small valid dimensions', () => {
    const result = calculateGravel({
      ...baseInput,
      length: { value: 0.5, unit: 'ft' },
      width: { value: 0.25, unit: 'ft' },
      depth: { value: 0.125, unit: 'in' },
      allowancePercent: 0,
    });
    expect(
      validateGravelInput({
        ...baseInput,
        length: { value: 0.5, unit: 'ft' },
        width: { value: 0.25, unit: 'ft' },
        depth: { value: 0.125, unit: 'in' },
        allowancePercent: 0,
      }),
    ).toEqual([]);
    expect(result.recommendedOrderCubicYards).toBe(0.1);
  });
});

describe('recommended order rounding', () => {
  it.each([
    [4, 4],
    [4.01, 4.1],
    [4.07, 4.1],
    [4.09, 4.1],
    [4.1, 4.1],
    [4.11, 4.2],
    [4.25, 4.3],
    [4.56, 4.6],
    [4.88, 4.9],
    [4.99, 5],
    [5, 5],
    [5.01, 5.1],
    [5.09, 5.1],
    [5.1, 5.1],
    [5.11, 5.2],
  ])('rounds %s yd³ upward to %s yd³', (afterAllowance, expected) => {
    expect(recommendedOrderCubicYards(afterAllowance)).toBe(expected);
  });

  it('does not over-round a floating-point representation of an exact tenth', () => {
    expect(recommendedOrderCubicYards(4.1000000000000005)).toBe(4.1);
  });

  it('keeps allowance, bag, and truck-load semantics distinct', () => {
    const zeroAllowance = calculateGravel({ ...baseInput, allowancePercent: 0 });
    const maximumAllowance = calculateGravel({ ...baseInput, allowancePercent: 50 });
    const bagAndTruckInput = calculateGravel({
      ...baseInput,
      allowancePercent: 10,
      truckCapacityCubicYards: 3,
    });

    expect(zeroAllowance.recommendedOrderCubicYards).toBe(3);
    expect(maximumAllowance.recommendedOrderCubicYards).toBe(4.5);
    expect(bagAndTruckInput.bagCount).toBe(176);
    expect(bagAndTruckInput.truckLoads).toBe(2);
  });
});

describe('validation and recommendations', () => {
  it('validates only the active shape dimensions', () => {
    const validCircle = validateGravelInput({
      ...baseInput,
      areaShape: 'circle',
      length: { value: Number.NaN, unit: 'ft' },
      width: { value: -1, unit: 'ft' },
      diameter: { value: 20, unit: 'ft' },
    });
    expect(validCircle).toEqual([]);
    for (const diameter of [0, -1, Number.NaN]) {
      expect(
        validateGravelInput({
          ...baseInput,
          areaShape: 'circle',
          diameter: { value: diameter, unit: 'ft' },
        }).map((issue) => issue.field),
      ).toContain('diameter');
    }
  });
  it('rejects incomplete numeric input', () => {
    const issues = validateGravelInput({
      ...baseInput,
      length: { value: 0, unit: 'ft' },
      allowancePercent: -1,
    });
    expect(issues.map((issue) => issue.field)).toContain('length');
    expect(issues.map((issue) => issue.field)).toContain('allowancePercent');
  });

  it('rejects missing, non-finite, and accidental extreme values', () => {
    const issues = validateGravelInput({
      ...baseInput,
      length: { value: Number.NaN, unit: 'ft' },
      width: { value: Number.POSITIVE_INFINITY, unit: 'ft' },
      customDensityTonsPerYard: 11,
      gravelType: 'custom',
      deliveryFee: 2_000_000,
    });
    expect(issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(['length', 'width', 'customDensityTonsPerYard', 'deliveryFee']),
    );
  });

  it('requires a custom density and accepts a valid one at the allowance limit', () => {
    const missingDensity = validateGravelInput({
      ...baseInput,
      gravelType: 'custom',
      customDensityTonsPerYard: undefined,
      allowancePercent: 50,
    });
    const validCustomInput = {
      ...baseInput,
      gravelType: 'custom' as const,
      customDensityTonsPerYard: 1.6,
      allowancePercent: 50,
    };

    expect(missingDensity.map((issue) => issue.field)).toContain('customDensityTonsPerYard');
    expect(validateGravelInput(validCustomInput)).toEqual([]);
    expect(calculateGravel(validCustomInput).densityTonsPerYard).toBe(1.6);
  });

  it('explains practical rounding and flags shallow driveways', () => {
    const shallowInput = { ...baseInput, depth: { value: 3, unit: 'in' as const } };
    const calculation = calculateGravel(shallowInput);
    const recommendation = recommendGravel(shallowInput, calculation);
    expect(recommendation.explanation).toContain('round up to 2.5 yd³');
    expect(recommendation.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('shallow for a driveway')]),
    );
  });
});
