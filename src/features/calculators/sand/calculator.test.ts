import { describe, expect, it } from 'vitest';
import { calculateSand } from './calculator';
import { createClearedSandInput, createDefaultSandInput } from './formDefaults';
import { convertSandMeasurementSystem } from './formUnits';
import { validateSandInput } from './validation';

it('rejects sand purchasing counts above the supported quotient', () => {
  const input = createDefaultSandInput();
  input.bagSize = 1e-9;
  expect(validateSandInput(input)).toContainEqual(expect.objectContaining({ field: 'bagSize' }));

  const tinyIncrement = createDefaultSandInput();
  tinyIncrement.measureMode = 'area';
  tinyIncrement.knownArea = 1e-99;
  tinyIncrement.depth = { value: 12, unit: 'in' };
  tinyIncrement.allowancePercent = 0;
  tinyIncrement.compactionPercent = 0;
  tinyIncrement.bulkIncrement = 1e-101;
  expect(validateSandInput(tinyIncrement)).toContainEqual(
    expect.objectContaining({ field: 'bulkIncrement' }),
  );

  const valid = createDefaultSandInput();
  expect(validateSandInput(valid)).toEqual([]);
  expect(() => calculateSand(valid)).not.toThrow();
});

describe('sand calculator', () => {
  it('matches truth case A', () => {
    const input = createDefaultSandInput();
    input.allowancePercent = 0;
    const r = calculateSand(input);
    expect(r.totalAreaSquareFeet).toBeCloseTo(200);
    expect(r.baseCubicFeet).toBeCloseTo(50);
    expect(r.requiredCubicYards).toBeCloseTo(1.85185185);
    expect(r.requiredCubicMeters).toBeCloseTo(1.41584233);
    expect(r.requiredLiters).toBeCloseTo(1415.84233);
    expect(r.requiredWeight.pounds).toBeCloseTo(5000);
    expect(r.requiredWeight.usTons).toBeCloseTo(2.5);
  });
  it('adds allowance and compaction without compounding', () => {
    const input = createDefaultSandInput();
    input.allowancePercent = 5;
    input.compactionPercent = 10;
    const r = calculateSand(input);
    expect(r.baseCubicFeet).toBeCloseTo(50);
    expect(r.allowanceCubicFeet).toBeCloseTo(2.5);
    expect(r.compactionCubicFeet).toBeCloseTo(5);
    expect(r.requiredCubicFeet).toBeCloseTo(57.5);
    expect(r.requiredWeight.pounds).toBeCloseTo(5750);
  });
  it('rounds weight bags upward', () => {
    const input = createDefaultSandInput();
    input.allowancePercent = 0;
    input.bagSize = 50;
    let r = calculateSand(input);
    expect(r.bagsRequired).toBe(100);
    expect(r.bagLeftoverAmount).toBeCloseTo(0);
    input.bagSize = 60;
    r = calculateSand(input);
    expect(r.bagsRequired).toBe(84);
    expect(r.bagPurchasedAmount).toBe(5040);
    expect(r.bagLeftoverAmount).toBeCloseTo(40);
  });
  it('distinguishes bag-count floating noise from genuine excess', () => {
    const input = createDefaultSandInput();
    input.length.value = 4;
    input.width.value = 1;
    input.depth.value = 3;
    input.allowancePercent = 10;
    input.compactionPercent = 10;
    input.bagBasis = 'weight';
    input.bagUnit = 'lb';
    input.bagSize = 60;
    expect(calculateSand(input).bagsRequired).toBe(2);
    input.length.value = 4.0004;
    expect(calculateSand(input).bagsRequired).toBe(3);
  });
  it('rounds volume bulk and preserves required versus ordered weight', () => {
    const input = createDefaultSandInput();
    input.allowancePercent = 0;
    input.bulkIncrement = 0.25;
    const r = calculateSand(input);
    expect(r.bulkOrderAmount).toBeCloseTo(2);
    expect(r.bulkLeftoverAmount).toBeCloseTo(0.14814815);
    expect(r.requiredWeight.pounds).toBeCloseTo(5000);
    expect(r.orderedWeight?.pounds).toBeCloseTo(5400);
  });
  it('does not over-order a realistic noisy increment and rounds genuine excess upward', () => {
    const input = createDefaultSandInput();
    input.length.value = 4;
    input.width.value = 1;
    input.depth.value = 3;
    input.allowancePercent = 10;
    input.compactionPercent = 10;
    input.bulkBasis = 'volume';
    input.bulkUnit = 'cu-ft';
    input.bulkIncrement = 0.1;
    const noiseBoundary = calculateSand(input);
    expect(noiseBoundary.requiredCubicFeet).toBe(1.2000000000000002);
    expect(noiseBoundary.bulkOrderAmount).toBe(1.2);
    input.length.value = 4.0004;
    expect(calculateSand(input).bulkOrderAmount).toBe(1.3);
  });
  it('rounds weight bulk', () => {
    const input = createDefaultSandInput();
    input.compactionPercent = 10;
    input.bulkBasis = 'weight';
    input.bulkUnit = 'us-ton';
    input.bulkIncrement = 0.5;
    const r = calculateSand(input);
    expect(r.bulkRequiredAmount).toBeCloseTo(2.875);
    expect(r.bulkOrderAmount).toBeCloseTo(3);
    expect(r.bulkLeftoverAmount).toBeCloseTo(0.125);
  });
  it('supports metric weight bags and bulk ordering', () => {
    const input = createDefaultSandInput();
    input.allowancePercent = 0;
    input.bagBasis = 'weight';
    input.bagUnit = 'kg';
    input.bagSize = 25;
    input.bulkBasis = 'weight';
    input.bulkUnit = 'metric-tonne';
    input.bulkIncrement = 0.5;
    const r = calculateSand(input);
    expect(r.bagsRequired).toBe(91);
    expect(r.bulkRequiredAmount).toBeCloseTo(2.26796185);
    expect(r.bulkOrderAmount).toBeCloseTo(2.5);
    expect(r.orderedWeight?.kilograms).toBeCloseTo(2500);
  });
  it('supplier density changes weight only', () => {
    const input = createDefaultSandInput();
    input.allowancePercent = 0;
    const estimated = calculateSand(input);
    input.supplierDensity = 3000;
    const supplied = calculateSand(input);
    expect(supplied.requiredWeight.pounds).toBeCloseTo(5555.5556);
    expect(supplied.requiredCubicFeet).toBe(estimated.requiredCubicFeet);
    expect(supplied.totalAreaSquareFeet).toBe(estimated.totalAreaSquareFeet);
  });
  it('keeps project and sand type guidance-only for physical calculations', () => {
    const base = createDefaultSandInput();
    const expected = calculateSand(base);
    for (const projectType of [
      'paver-bedding',
      'sandbox',
      'landscaping',
      'topdressing',
      'pool-base',
      'backfill',
      'concrete-mortar',
      'other',
    ] as const)
      for (const sandType of [
        'all-purpose',
        'concrete-sharp',
        'masonry',
        'play',
        'fill',
        'paver-bedding',
        'other',
      ] as const)
        expect(calculateSand({ ...base, projectType, sandType })).toEqual(expected);
  });
  it('matches metric truth case and coverage', () => {
    const input = convertSandMeasurementSystem(createDefaultSandInput(), 'metric');
    input.length = { value: 5, unit: 'm' };
    input.width = { value: 4, unit: 'm' };
    input.depth = { value: 50, unit: 'mm' };
    input.allowancePercent = 0;
    input.supplierDensity = 1600;
    input.densityUnit = 'kg-cu-m';
    const r = calculateSand(input);
    expect(r.totalAreaSquareFeet / 10.7639104167).toBeCloseTo(20);
    expect(r.requiredCubicMeters).toBeCloseTo(1);
    expect(r.requiredWeight.kilograms).toBeCloseTo(1600);
    expect(r.coveragePerCubicMeterSquareMeters).toBeCloseTo(20);
  });
  it.each([
    ['square', 100],
    ['circle', Math.PI * 25],
    ['triangle', 100],
    ['trapezoid', 150],
    ['ring', Math.PI * 32],
  ] as const)('calculates %s geometry', (shape, area) => {
    const input = createDefaultSandInput();
    input.shape = shape;
    expect(calculateSand(input).areaPerItemSquareFeet).toBeCloseTo(area);
  });
  it('keeps known area, quantity and unit switching physically equivalent', () => {
    const input = createDefaultSandInput();
    const expected = calculateSand(input);
    input.measureMode = 'area';
    expect(calculateSand(input).requiredCubicFeet).toBeCloseTo(expected.requiredCubicFeet);
    input.quantity = 3;
    expect(calculateSand(input).totalAreaSquareFeet).toBeCloseTo(600);
    const metric = convertSandMeasurementSystem(input, 'metric');
    expect(calculateSand(metric).requiredCubicFeet).toBeCloseTo(
      calculateSand(input).requiredCubicFeet,
      4,
    );
  });
  it('preserves bulk pricing across Imperial and Metric switching', () => {
    const input = createDefaultSandInput();
    input.bulkIncrement = 0.25;
    input.bulkUnitPrice = 42;
    const expected = calculateSand(input).bulkCost;
    const metric = convertSandMeasurementSystem(input, 'metric');
    expect(calculateSand(metric).bulkCost).toBeCloseTo(expected!, 5);
    expect(calculateSand(convertSandMeasurementSystem(metric, 'imperial')).bulkCost).toBeCloseTo(
      expected!,
      5,
    );
  });
  it('supports volume bags, pricing and exact bulk', () => {
    const input = createDefaultSandInput();
    input.allowancePercent = 0;
    input.bagBasis = 'volume';
    input.bagUnit = 'cu-ft';
    input.bagSize = 2;
    input.pricePerBag = 4;
    input.bulkUnitPrice = 42;
    const r = calculateSand(input);
    expect(r.bagsRequired).toBe(25);
    expect(r.bagCost).toBe(100);
    expect(r.bulkOrderAmount).toBeCloseTo(r.bulkRequiredAmount);
    expect(r.bulkCost).toBeCloseTo(r.bulkOrderAmount * 42);
  });
  it('handles a large Known Area without precision or non-compounding drift', () => {
    const input = createDefaultSandInput();
    input.measureMode = 'area';
    input.knownArea = 1_000_000;
    input.depth = { value: 12, unit: 'in' };
    input.allowancePercent = 15;
    input.compactionPercent = 20;
    const r = calculateSand(input);
    expect(r.baseCubicFeet).toBe(1_000_000);
    expect(r.allowanceCubicFeet).toBe(150_000);
    expect(r.compactionCubicFeet).toBe(200_000);
    expect(r.requiredCubicFeet).toBe(1_350_000);
    expect(r.requiredCubicYards).toBe(50_000);
    expect(r.requiredWeight.pounds).toBe(135_000_000);
  });

  it('supports zero prices and rejects negative prices and percentages', () => {
    const input = createDefaultSandInput();
    input.bagSize = 50;
    input.pricePerBag = 0;
    input.bulkUnitPrice = 0;
    const result = calculateSand(input);
    expect(result.bagCost).toBe(0);
    expect(result.bulkCost).toBe(0);
    input.pricePerBag = -1;
    input.bulkUnitPrice = -1;
    input.allowancePercent = -1;
    input.compactionPercent = 101;
    expect(validateSandInput(input).map((issue) => issue.field)).toEqual(
      expect.arrayContaining([
        'pricePerBag',
        'bulkUnitPrice',
        'allowancePercent',
        'compactionPercent',
      ]),
    );
  });
  it('keeps optionals empty after default and clear', () => {
    for (const input of [createDefaultSandInput(), createClearedSandInput('USD')]) {
      expect(input.bagSize).toBeUndefined();
      expect(input.pricePerBag).toBeUndefined();
      expect(input.bulkIncrement).toBeUndefined();
      expect(input.bulkUnitPrice).toBeUndefined();
      expect(input.supplierDensity).toBeUndefined();
    }
    expect(createClearedSandInput('USD').allowancePercent).toBe(5);
    expect(createClearedSandInput('USD').compactionPercent).toBe(0);
  });
  it('validates geometry and optional values without rejecting empty optionals', () => {
    expect(validateSandInput(createDefaultSandInput())).toEqual([]);
    const input = createDefaultSandInput();
    input.shape = 'ring';
    input.innerDiameter.value = 12;
    input.outerDiameter.value = 4;
    input.depth.value = 0;
    input.bagSize = -1;
    input.bulkIncrement = 0;
    input.supplierDensity = -1;
    input.compactionPercent = -1;
    expect(validateSandInput(input).map((x) => x.field)).toEqual(
      expect.arrayContaining([
        'innerDiameter',
        'depth',
        'bagSize',
        'bulkIncrement',
        'supplierDensity',
        'compactionPercent',
      ]),
    );
  });
});
