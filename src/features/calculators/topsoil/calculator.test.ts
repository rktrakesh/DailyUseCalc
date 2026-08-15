import { describe, expect, it } from 'vitest';
import { calculateTopsoil } from './calculator';
import { createClearedTopsoilInput, createDefaultTopsoilInput } from './formDefaults';
import { convertTopsoilMeasurementSystem } from './formUnits';
import { validateTopsoilInput } from './validation';

it('rejects topsoil purchasing counts above the supported quotient', () => {
  const input = createDefaultTopsoilInput();
  input.bulkIncrement = 1e-9;
  expect(validateTopsoilInput(input)).toContainEqual(
    expect.objectContaining({ field: 'bulkIncrement' }),
  );

  const tinyIncrement = createDefaultTopsoilInput();
  tinyIncrement.measureMode = 'area';
  tinyIncrement.knownArea = 1e-99;
  tinyIncrement.depth = { value: 12, unit: 'in' };
  tinyIncrement.allowancePercent = 0;
  tinyIncrement.bulkIncrement = 1e-101;
  expect(validateTopsoilInput(tinyIncrement)).toContainEqual(
    expect.objectContaining({ field: 'bulkIncrement' }),
  );

  const valid = createDefaultTopsoilInput();
  expect(validateTopsoilInput(valid)).toEqual([]);
  expect(() => calculateTopsoil(valid)).not.toThrow();
});

describe('topsoil calculation', () => {
  it('keeps purchasing and density optional in new and cleared forms', () => {
    for (const input of [createDefaultTopsoilInput(), createClearedTopsoilInput('USD')]) {
      expect(input.bagVolume).toBeUndefined();
      expect(input.pricePerBag).toBeUndefined();
      expect(input.bulkIncrement).toBeUndefined();
      expect(input.bulkUnitPrice).toBeUndefined();
      expect(input.supplierDensity).toBeUndefined();
    }
  });

  it('matches truth case A including purchasing, pricing, coverage, and weight', () => {
    const input = {
      ...createDefaultTopsoilInput(),
      bagVolume: 1,
      bulkIncrement: 0.25,
      supplierDensity: 2200,
      pricePerBag: 3.5,
      bulkUnitPrice: 42,
    };
    const result = calculateTopsoil(input);
    expect(result.totalAreaSquareFeet).toBeCloseTo(200);
    expect(result.baseCubicFeet).toBeCloseTo(66.6666667);
    expect(result.allowanceCubicFeet).toBeCloseTo(3.3333333);
    expect(result.requiredCubicFeet).toBeCloseTo(70);
    expect(result.requiredCubicYards).toBeCloseTo(2.5925926);
    expect(result.requiredCubicMeters).toBeCloseTo(1.98217926);
    expect(result.bagsRequired).toBe(70);
    expect(result.bagLeftoverCubicFeet).toBeCloseTo(0);
    expect(result.bagCost).toBe(245);
    expect(result.bulkOrderCubicYards).toBe(2.75);
    expect(result.bulkLeftoverCubicYards).toBeCloseTo(0.1574074);
    expect(result.bulkCost).toBe(115.5);
    expect(result.coveragePerCubicYardSquareFeet).toBeCloseTo(81);
    expect(result.requiredWeight?.pounds).toBeCloseTo(5703.7037);
    expect(result.requiredWeight?.usTons).toBeCloseTo(2.85185185);
    expect(result.orderedWeight?.pounds).toBe(6050);
  });

  it('applies quantity before depth for identical raised beds', () => {
    const input = createDefaultTopsoilInput();
    input.length.value = 8;
    input.width.value = 4;
    input.quantity = 4;
    input.depth.value = 12;
    const result = calculateTopsoil(input);
    expect(result.areaPerItemSquareFeet).toBe(32);
    expect(result.totalAreaSquareFeet).toBe(128);
    expect(result.baseCubicFeet).toBe(128);
    expect(result.requiredCubicFeet).toBeCloseTo(134.4);
    expect(result.requiredCubicYards).toBeCloseTo(4.9777778);
  });

  it.each([
    ['square', 100],
    ['circle', Math.PI * 25],
    ['triangle', 100],
    ['trapezoid', 150],
    ['ring', Math.PI * 32],
  ] as const)('calculates %s geometry', (shape, area) => {
    const input = createDefaultTopsoilInput();
    input.shape = shape;
    expect(calculateTopsoil(input).areaPerItemSquareFeet).toBeCloseTo(area);
  });

  it('matches the circle and ring truth cases', () => {
    const circle = createDefaultTopsoilInput();
    circle.shape = 'circle';
    circle.depth.value = 3;
    circle.allowancePercent = 0;
    expect(calculateTopsoil(circle).requiredCubicYards).toBeCloseTo(0.7272205);
    const ring = createDefaultTopsoilInput();
    ring.shape = 'ring';
    ring.depth.value = 3;
    expect(calculateTopsoil(ring).requiredCubicYards).toBeCloseTo(0.97738438);
  });

  it('keeps equivalent known-area and metric projects physically equivalent', () => {
    const rectangle = createDefaultTopsoilInput();
    const area = createDefaultTopsoilInput();
    area.measureMode = 'area';
    expect(calculateTopsoil(area).requiredCubicFeet).toBeCloseTo(
      calculateTopsoil(rectangle).requiredCubicFeet,
    );
    const metric = convertTopsoilMeasurementSystem(rectangle, 'metric');
    expect(calculateTopsoil(metric).requiredCubicFeet).toBeCloseTo(
      calculateTopsoil(rectangle).requiredCubicFeet,
      3,
    );
    expect(calculateTopsoil(metric).bagsRequired).toBe(calculateTopsoil(rectangle).bagsRequired);
    const roundTrip = convertTopsoilMeasurementSystem(metric, 'imperial');
    expect(calculateTopsoil(roundTrip).requiredCubicFeet).toBeCloseTo(
      calculateTopsoil(rectangle).requiredCubicFeet,
      3,
    );
  });

  it.each([0, 5, 10, 15])('applies %i percent allowance', (allowance) => {
    const input = createDefaultTopsoilInput();
    input.allowancePercent = allowance;
    const result = calculateTopsoil(input);
    expect(result.requiredCubicFeet).toBeCloseTo(result.baseCubicFeet * (1 + allowance / 100));
  });

  it('supports bag and bulk boundary rounding and exact bulk mode', () => {
    const input = createDefaultTopsoilInput();
    input.allowancePercent = 0;
    input.length.value = 8;
    input.width.value = 8;
    input.depth.value = 3;
    input.bagVolume = 2;
    expect(calculateTopsoil(input).bagsRequired).toBe(8);
    input.length.value = 8.001;
    expect(calculateTopsoil(input).bagsRequired).toBe(9);
    input.bulkIncrement = undefined;
    const exact = calculateTopsoil(input);
    expect(exact.bulkOrderCubicYards).toBeCloseTo(exact.requiredCubicYards);
  });

  it('distinguishes purchasing noise from genuine excess', () => {
    const input = createDefaultTopsoilInput();
    input.measureMode = 'area';
    input.knownArea = 1;
    input.depth.value = 12;
    input.allowancePercent = 0;
    input.bagVolume = 1;
    input.bulkIncrement = 0.1;
    expect(calculateTopsoil(input).bagsRequired).toBe(1);
    input.knownArea = 1.0001;
    expect(calculateTopsoil(input).bagsRequired).toBe(2);
    input.knownArea = 27 * (0.3 + Number.EPSILON);
    expect(calculateTopsoil(input).bulkOrderCubicYards).toBe(0.3);
    input.knownArea = 27 * 0.3001;
    expect(calculateTopsoil(input).bulkOrderCubicYards).toBe(0.4);
  });

  it('supports absent, individual, both, and zero prices', () => {
    const input = createDefaultTopsoilInput();
    let result = calculateTopsoil(input);
    expect(result.bagCost).toBeUndefined();
    expect(result.bulkCost).toBeUndefined();
    input.bagVolume = 1;
    input.pricePerBag = 0;
    result = calculateTopsoil(input);
    expect(result.bagCost).toBe(0);
    input.pricePerBag = undefined;
    input.bulkUnitPrice = 42;
    result = calculateTopsoil(input);
    expect(result.bulkCost).toBeDefined();
    input.pricePerBag = 3.5;
    expect(calculateTopsoil(input).bagCost).toBe(245);
  });

  it('only calculates weights when supplier density is supplied and converts density systems', () => {
    const input = createDefaultTopsoilInput();
    expect(calculateTopsoil(input).requiredWeight).toBeUndefined();
    input.bulkIncrement = 0.25;
    input.supplierDensity = 2200;
    const expected = calculateTopsoil(input).requiredWeight!;
    const metric = convertTopsoilMeasurementSystem(input, 'metric');
    expect(calculateTopsoil(metric).requiredWeight?.pounds).toBeCloseTo(expected.pounds, 2);
    expect(calculateTopsoil(metric).orderedWeight?.pounds).toBeCloseTo(6050, 2);
  });

  it('keeps optional purchasing inactive and presents the metric known-area truth case', () => {
    const input = convertTopsoilMeasurementSystem(createDefaultTopsoilInput(), 'metric');
    input.measureMode = 'area';
    input.knownArea = 320;
    input.areaUnit = 'sq-m';
    input.depth = { value: 50, unit: 'cm' };
    input.allowancePercent = 5;

    expect(input.bagVolume).toBeUndefined();
    expect(input.pricePerBag).toBeUndefined();
    expect(input.bulkIncrement).toBeUndefined();
    expect(input.bulkUnitPrice).toBeUndefined();
    expect(input.supplierDensity).toBeUndefined();

    const result = calculateTopsoil(input);
    expect(result.baseCubicFeet / 35.3146667215).toBeCloseTo(160, 6);
    expect(result.allowanceCubicFeet / 35.3146667215).toBeCloseTo(8, 6);
    expect(result.requiredCubicMeters).toBeCloseTo(168, 6);
    expect(result.bagsRequired).toBeUndefined();
    expect(result.bulkOrderCubicMeters).toBeCloseTo(168, 6);
    expect(result.bulkLeftoverCubicYards).toBeCloseTo(0, 10);
    expect(result.requiredWeight).toBeUndefined();
    expect(result.bagCost).toBeUndefined();
    expect(result.bulkCost).toBeUndefined();
    expect(result.coveragePerCubicMeterSquareMeters).toBeCloseTo(2, 6);
  });

  it('preserves bulk material cost when switching price-per-volume units', () => {
    const input = createDefaultTopsoilInput();
    input.bulkUnitPrice = 42;
    const expected = calculateTopsoil(input).bulkCost;
    const metric = convertTopsoilMeasurementSystem(input, 'metric');
    expect(calculateTopsoil(metric).bulkCost).toBeCloseTo(expected!, 5);
  });

  it('keeps project and soil type guidance-only', () => {
    const base = createDefaultTopsoilInput();
    const expected = calculateTopsoil(base);
    for (const projectType of [
      'garden-bed',
      'new-lawn',
      'topdressing',
      'raised-bed',
      'flower-bed',
      'vegetable-garden',
      'landscaping',
      'other',
    ] as const)
      for (const soilType of [
        'screened',
        'unscreened',
        'compost-blend',
        'garden-soil',
        'other',
      ] as const)
        expect(calculateTopsoil({ ...base, projectType, soilType })).toEqual(expected);
  });

  it('rejects invalid geometry, quantity, depth, purchasing, density, allowance, and pricing', () => {
    const input = createDefaultTopsoilInput();
    input.shape = 'ring';
    input.outerDiameter.value = 4;
    input.innerDiameter.value = 4;
    input.quantity = 1.5;
    input.depth.value = 0;
    input.bagVolume = 0;
    input.bulkIncrement = -1;
    input.supplierDensity = 0;
    input.pricePerBag = -1;
    input.bulkUnitPrice = -1;
    input.allowancePercent = 20;
    expect(validateTopsoilInput(input).map((x) => x.field)).toEqual(
      expect.arrayContaining([
        'geometry',
        'quantity',
        'depth',
        'bagVolume',
        'bulkIncrement',
        'supplierDensity',
        'pricePerBag',
        'bulkUnitPrice',
        'allowancePercent',
      ]),
    );
  });
});
