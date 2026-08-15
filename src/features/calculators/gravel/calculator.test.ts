import { describe, expect, it } from 'vitest';
import {
  adjustedVolumeConversions,
  calculateGravel,
  recommendGravel,
  recommendedOrderCubicYards,
  requiredWholeBags,
  validateGravelInput,
} from '.';
import { createClearedGravelInput, createDefaultGravelInput } from './formDefaults';
import { convertLength } from '../../../lib/units/measurements';
import type { GravelInput } from './types';

it('rejects purchasing configurations above the supported quotient', () => {
  const input = createDefaultGravelInput();
  input.bagSizeCubicFeet = 1e-9;
  expect(validateGravelInput(input)).toContainEqual(
    expect.objectContaining({ field: 'bagSizeCubicFeet' }),
  );
});

it('keeps Gravel validation aligned with shared rounding at the truck-load ceiling', () => {
  const input = createDefaultGravelInput();
  input.inputMode = 'volume';
  input.knownVolume = { value: 1 + 0.1 + 0.1, unit: 'yd³' };
  input.allowancePercent = 0;
  input.bagSizeCubicFeet = undefined;
  input.truckCapacityCubicYards = 1.2 / 10_000_000;
  expect(validateGravelInput(input)).toEqual([]);
  expect(() => calculateGravel(input)).not.toThrow();
  expect(calculateGravel(input).truckLoads).toBe(10_000_000);

  input.truckCapacityCubicYards = 1.2 / 10_000_001;
  expect(validateGravelInput(input)).toContainEqual(
    expect.objectContaining({ field: 'truckCapacityCubicYards' }),
  );
});

const baseInput: GravelInput = {
  inputMode: 'dimensions',
  areaShape: 'rectangle',
  projectType: 'driveway',
  gravelType: 'crushed-stone',
  length: { value: 20, unit: 'ft' },
  width: { value: 12, unit: 'ft' },
  diameter: { value: Number.NaN, unit: 'ft' },
  depth: { value: 4, unit: 'in' },
  knownArea: { value: Number.NaN, unit: 'ft²' },
  knownVolume: { value: Number.NaN, unit: 'yd³' },
  currency: 'USD',
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
  it.each([
    [110, 0.5, 220],
    [110, 0.4, 275],
    [100, 0.4, 250],
    [110, 0.6, 184],
    [0.3, 0.1, 3],
  ])('rounds %s ft³ into %s ft³ bags as %s whole bags', (required, bagSize, expected) => {
    expect(requiredWholeBags(required, bagSize)).toBe(expected);
  });

  it('uses the corrected whole-bag count for bag-priced cost', () => {
    const result = calculateGravel({
      ...baseInput,
      length: { value: 20, unit: 'ft' },
      width: { value: 15, unit: 'ft' },
      depth: { value: 4, unit: 'in' },
      allowancePercent: 10,
      bagSizeCubicFeet: 0.5,
      bagPrice: 20,
      deliveryFee: 20,
      pricePerCubicYard: undefined,
    });

    expect(result.bagCount).toBe(220);
    expect(result.estimatedCost).toBe(4_420);
  });

  it('keeps measured volume unchanged while adjusted display volume matches estimated weight', () => {
    const result = calculateGravel(baseInput);
    const adjusted = adjustedVolumeConversions(result.adjustedVolumeCubicYards);

    expect(result.volumeCubicYards).toBeCloseTo(2.96296, 4);
    expect(result.adjustedVolumeCubicYards).toBeCloseTo(3.25926, 4);
    expect(adjusted.cubicYards).toBe(result.adjustedVolumeCubicYards);
    expect(adjusted.cubicFeet).toBeCloseTo(result.adjustedVolumeCubicYards * 27, 10);
    expect(adjusted.liters).toBeCloseTo(adjusted.cubicMeters * 1_000, 10);
    expect(result.estimatedWeightTons).toBeCloseTo(
      adjusted.cubicYards * result.densityTonsPerYard,
      10,
    );
  });

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

  it('normalizes known area units through the shared pipeline', () => {
    const equivalents = [
      { value: 1_000, unit: 'ft²' as const },
      { value: 1_000 / 9, unit: 'yd²' as const },
      { value: 92.90304, unit: 'm²' as const },
      { value: 929_030.4, unit: 'cm²' as const },
    ].map((knownArea) =>
      calculateGravel({
        ...baseInput,
        inputMode: 'area',
        knownArea,
        depth: { value: 3, unit: 'in' },
      }),
    );
    for (const result of equivalents) expect(result.volumeCubicFeet).toBeCloseTo(250, 5);
    expect(equivalents[0].recommendedOrderCubicYards).toBe(10.2);
  });

  it('normalizes known volume units without using area or depth', () => {
    const equivalents = [
      { value: 121.5, unit: 'ft³' as const },
      { value: 4.5, unit: 'yd³' as const },
      { value: 3.440496861, unit: 'm³' as const },
    ].map((knownVolume) =>
      calculateGravel({
        ...baseInput,
        inputMode: 'volume',
        knownVolume,
        depth: { value: Number.NaN, unit: 'in' },
      }),
    );
    for (const result of equivalents) expect(result.volumeCubicYards).toBeCloseTo(4.5, 5);
  });

  it('ignores inactive dimension and volume values in area mode', () => {
    const result = calculateGravel({
      ...baseInput,
      inputMode: 'area',
      knownArea: { value: 900, unit: 'ft²' },
      knownVolume: { value: 999, unit: 'yd³' },
      length: { value: 999, unit: 'ft' },
      width: { value: 999, unit: 'ft' },
      depth: { value: 3, unit: 'in' },
      allowancePercent: 0,
    });
    expect(result.volumeCubicYards).toBeCloseTo(8.333333, 5);
  });

  it('keeps numerical results independent of the selected display currency', () => {
    const usd = calculateGravel({ ...baseInput, currency: 'USD' });
    const inr = calculateGravel({ ...baseInput, currency: 'INR' });
    expect(inr).toEqual(usd);
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

  it('distinguishes truck-capacity floating noise from genuine excess', () => {
    expect(
      calculateGravel({
        ...baseInput,
        truckCapacityCubicYards: 3.3 / (1 + Number.EPSILON),
      }).truckLoads,
    ).toBe(1);
    expect(calculateGravel({ ...baseInput, truckCapacityCubicYards: 3.299 }).truckLoads).toBe(2);
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
  it('uses consistent defaults and clears every optional purchasing input', () => {
    const defaults = createDefaultGravelInput();
    const cleared = createClearedGravelInput('EUR');

    for (const input of [defaults, cleared]) {
      expect(input.projectType).toBe('driveway');
      expect(input.gravelType).toBe('crushed-stone');
      expect(input.allowancePercent).toBe(0);
      expect(input.pricePerCubicYard).toBeUndefined();
      expect(input.deliveryFee).toBeUndefined();
      expect(input.bagSizeCubicFeet).toBeUndefined();
      expect(input.bagPrice).toBeUndefined();
      expect(input.truckCapacityCubicYards).toBeUndefined();
    }
    expect(cleared.currency).toBe('EUR');
    expect(cleared.length.value).toBeNaN();
  });

  it('normalizes known-area maximum validation across units', () => {
    const realistic = validateGravelInput({
      ...baseInput,
      inputMode: 'area',
      knownArea: { value: 5_000_000, unit: 'ft²' },
    });
    const excessiveFeet = validateGravelInput({
      ...baseInput,
      inputMode: 'area',
      knownArea: { value: 100_000_001, unit: 'ft²' },
    });
    const excessiveMeters = validateGravelInput({
      ...baseInput,
      inputMode: 'area',
      knownArea: { value: 100_000_001 / 10.763910417, unit: 'm²' },
    });

    expect(realistic).toEqual([]);
    expect(excessiveFeet.map((issue) => issue.field)).toContain('knownArea');
    expect(excessiveMeters.map((issue) => issue.field)).toContain('knownArea');
  });

  it('normalizes known-volume maximum validation across units', () => {
    const realistic = validateGravelInput({
      ...baseInput,
      inputMode: 'volume',
      knownVolume: { value: 1_000_000, unit: 'ft³' },
    });
    const excessiveYards = validateGravelInput({
      ...baseInput,
      inputMode: 'volume',
      knownVolume: { value: 100_000_001 / 27, unit: 'yd³' },
    });
    const excessiveMeters = validateGravelInput({
      ...baseInput,
      inputMode: 'volume',
      knownVolume: { value: 100_000_001 / 35.3146667215, unit: 'm³' },
    });

    expect(realistic).toEqual([]);
    expect(excessiveYards.map((issue) => issue.field)).toContain('knownVolume');
    expect(excessiveMeters.map((issue) => issue.field)).toContain('knownVolume');
  });

  it('does not infer a shallow-depth warning in volume mode', () => {
    const volumeInput: GravelInput = {
      ...baseInput,
      inputMode: 'volume',
      knownVolume: { value: 5, unit: 'yd³' },
      depth: { value: Number.NaN, unit: 'in' },
    };
    const recommendation = recommendGravel(volumeInput, calculateGravel(volumeInput));

    expect(recommendation.warnings).not.toEqual(
      expect.arrayContaining([expect.stringContaining('shallow for a driveway')]),
    );
  });

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
