import { describe, expect, it } from 'vitest';
import { calculateMulch } from './calculator';
import { createDefaultMulchInput } from './formDefaults';
import { convertMulchMeasurementSystem } from './formUnits';
import { validateMulchInput } from './validation';

describe('mulch calculation', () => {
  it('matches the reference rectangle, allowance, bags, bulk, and pricing case', () => {
    const input = { ...createDefaultMulchInput(), pricePerBag: 4.5, bulkPricePerCubicYard: 45 };
    const result = calculateMulch(input);
    expect(result.areaSquareFeet).toBeCloseTo(200);
    expect(result.baseCubicFeet).toBeCloseTo(50);
    expect(result.requiredCubicFeet).toBeCloseTo(52.5);
    expect(result.requiredCubicYards).toBeCloseTo(1.944444444);
    expect(result.bagsRequired).toBe(27);
    expect(result.purchasedBagCubicFeet).toBe(54);
    expect(result.bagLeftoverCubicFeet).toBeCloseTo(1.5);
    expect(result.bulkOrderCubicYards).toBe(2);
    expect(result.bulkLeftoverCubicYards).toBeCloseTo(0.05555556);
    expect(result.bagCost).toBe(121.5);
    expect(result.bulkCost).toBe(90);
  });

  for (const [shape, expected] of [
    ['square', 100],
    ['circle', Math.PI * 25],
    ['triangle', 100],
    ['trapezoid', 150],
    ['ring', Math.PI * 32],
  ] as const)
    it(`calculates ${shape} area`, () => {
      const input = createDefaultMulchInput();
      input.shape = shape;
      expect(calculateMulch(input).areaSquareFeet).toBeCloseTo(expected);
    });

  it('uses known area and zero allowance without inventing bulk rounding', () => {
    const input = createDefaultMulchInput();
    input.measureMode = 'area';
    input.knownArea = 100;
    input.allowancePercent = 0;
    input.bulkIncrementCubicYards = undefined;
    const result = calculateMulch(input);
    expect(result.areaSquareFeet).toBe(100);
    expect(result.allowanceCubicFeet).toBe(0);
    expect(result.bulkOrderCubicYards).toBeCloseTo(result.requiredCubicYards);
  });

  it('preserves physical results through metric conversion', () => {
    const input = createDefaultMulchInput();
    const expected = calculateMulch(input);
    const metric = calculateMulch(convertMulchMeasurementSystem(input, 'metric'));
    expect(metric.areaSquareFeet).toBeCloseTo(expected.areaSquareFeet, 3);
    expect(metric.requiredCubicFeet).toBeCloseTo(expected.requiredCubicFeet, 3);
  });

  it('validates empty, negative, invalid ring, bag, bulk, pricing, and allowance inputs', () => {
    const input = createDefaultMulchInput();
    input.shape = 'ring';
    input.outerDiameter.value = 2;
    input.innerDiameter.value = 4;
    input.depth.value = 0;
    input.bagVolume = -1;
    input.bulkIncrementCubicYards = 0;
    input.pricePerBag = -1;
    input.allowancePercent = 7;
    const fields = validateMulchInput(input).map((x) => x.field);
    expect(fields).toEqual(
      expect.arrayContaining([
        'geometry',
        'depth',
        'bagVolume',
        'bulkIncrementCubicYards',
        'pricePerBag',
        'allowancePercent',
      ]),
    );
  });

  it('matches the approved ring scenario', () => {
    const input = createDefaultMulchInput();
    input.shape = 'ring';
    input.pricePerBag = 30;
    const result = calculateMulch(input);
    expect(result.areaSquareFeet).toBeCloseTo(100.5309649);
    expect(result.baseCubicFeet).toBeCloseTo(25.1327412);
    expect(result.requiredCubicFeet).toBeCloseTo(26.3893783);
    expect(result.requiredCubicYards).toBeCloseTo(0.9773844);
    expect(result.bagsRequired).toBe(14);
    expect(result.purchasedBagCubicFeet).toBe(28);
    expect(result.bagLeftoverCubicFeet).toBeCloseTo(1.6106217);
    expect(result.bulkOrderCubicYards).toBe(1);
    expect(result.bulkLeftoverCubicYards).toBeCloseTo(0.0226156);
    expect(result.bagCost).toBe(420);
  });

  it.each([0, 5, 10, 15])('applies %i percent allowance exactly', (allowancePercent) => {
    const input = createDefaultMulchInput();
    input.allowancePercent = allowancePercent;
    const result = calculateMulch(input);
    expect(result.requiredCubicFeet).toBeCloseTo(
      result.baseCubicFeet * (1 + allowancePercent / 100),
    );
  });

  it('rounds bag and bulk boundary quantities upward without over-rounding exact boundaries', () => {
    const input = createDefaultMulchInput();
    input.allowancePercent = 0;
    input.length.value = 8;
    input.width.value = 8;
    input.depth.value = 3;
    input.bagVolume = 2;
    input.bulkIncrementCubicYards = 0.25;
    const exact = calculateMulch(input);
    expect(exact.requiredCubicFeet).toBe(16);
    expect(exact.bagsRequired).toBe(8);
    input.length.value = 8.001;
    const above = calculateMulch(input);
    expect(above.bagsRequired).toBe(9);
    input.length.value = 27;
    input.width.value = 1;
    input.depth.value = 3;
    expect(calculateMulch(input).bulkOrderCubicYards).toBe(0.25);
    input.length.value = 27.001;
    expect(calculateMulch(input).bulkOrderCubicYards).toBe(0.5);
  });

  it('distinguishes bag and bulk floating noise from genuine excess', () => {
    const input = createDefaultMulchInput();
    input.measureMode = 'area';
    input.knownArea = 1;
    input.depth.value = 12;
    input.allowancePercent = 0;
    input.bagVolume = 1;
    input.bulkIncrementCubicYards = 0.1;
    expect(calculateMulch(input).bagsRequired).toBe(1);
    input.knownArea = 1.0001;
    expect(calculateMulch(input).bagsRequired).toBe(2);
    input.knownArea = 27 * (0.3 + Number.EPSILON);
    expect(calculateMulch(input).bulkOrderCubicYards).toBe(0.3);
    input.knownArea = 27 * 0.3001;
    expect(calculateMulch(input).bulkOrderCubicYards).toBe(0.4);
  });

  it('supports custom bag sizes and all pricing-presence combinations including zero', () => {
    const input = createDefaultMulchInput();
    input.bagVolume = 1.5;
    input.bulkIncrementCubicYards = undefined;
    let result = calculateMulch(input);
    expect(result.bagsRequired).toBe(35);
    expect(result.bagCost).toBeUndefined();
    expect(result.bulkCost).toBeUndefined();
    input.pricePerBag = 0;
    result = calculateMulch(input);
    expect(result.bagCost).toBe(0);
    expect(result.bulkCost).toBeUndefined();
    input.pricePerBag = undefined;
    input.bulkPricePerCubicYard = 45;
    result = calculateMulch(input);
    expect(result.bagCost).toBeUndefined();
    expect(result.bulkCost).toBeCloseTo(result.requiredCubicYards * 45);
    input.pricePerBag = 4;
    result = calculateMulch(input);
    expect(result.bagCost).toBe(140);
    expect(result.bulkCost).toBeCloseTo(result.requiredCubicYards * 45);
  });

  it('round-trips Imperial to Metric to Imperial and preserves known-area equivalence', () => {
    const original = createDefaultMulchInput();
    const roundTrip = convertMulchMeasurementSystem(
      convertMulchMeasurementSystem(original, 'metric'),
      'imperial',
    );
    expect(calculateMulch(roundTrip).requiredCubicFeet).toBeCloseTo(
      calculateMulch(original).requiredCubicFeet,
      3,
    );
    const area = createDefaultMulchInput();
    area.measureMode = 'area';
    area.knownArea = 200;
    area.areaUnit = 'sq-ft';
    expect(calculateMulch(area).requiredCubicFeet).toBeCloseTo(
      calculateMulch(original).requiredCubicFeet,
    );
  });

  it('handles very small and reasonably large valid projects with finite positive results', () => {
    const small = createDefaultMulchInput();
    small.length.value = 0.01;
    small.width.value = 0.01;
    small.depth.value = 0.01;
    const large = createDefaultMulchInput();
    large.length.value = 10_000;
    large.width.value = 10_000;
    large.depth.value = 12;
    for (const result of [calculateMulch(small), calculateMulch(large)]) {
      expect(result.requiredCubicFeet).toBeGreaterThan(0);
      expect(Number.isFinite(result.requiredCubicFeet)).toBe(true);
    }
  });

  it('keeps project and mulch types out of the calculation', () => {
    const base = createDefaultMulchInput();
    const expected = calculateMulch(base);
    for (const projectType of [
      'garden-bed',
      'trees-shrubs',
      'walkway',
      'play-area',
      'landscaping',
      'other',
    ] as const)
      for (const mulchType of [
        'hardwood',
        'bark',
        'wood-chips',
        'cedar',
        'pine-bark',
        'rubber',
        'compost',
        'other',
      ] as const)
        expect(calculateMulch({ ...base, projectType, mulchType })).toEqual(expected);
  });

  it('rejects zero, negative, malformed, and excessive active geometry without leaking invalid results', () => {
    const input = createDefaultMulchInput();
    input.shape = 'trapezoid';
    input.sideA.value = 0;
    input.sideB.value = -1;
    input.perpendicularHeight.value = Number.NaN;
    input.depth.value = -1;
    input.bulkPricePerCubicYard = -1;
    expect(validateMulchInput(input).map((x) => x.field)).toEqual(
      expect.arrayContaining([
        'sideA',
        'sideB',
        'perpendicularHeight',
        'depth',
        'bulkPricePerCubicYard',
      ]),
    );
    input.shape = 'rectangle';
    input.length.value = 100_001;
    expect(validateMulchInput(input).some((x) => x.field === 'length')).toBe(true);
  });
});
