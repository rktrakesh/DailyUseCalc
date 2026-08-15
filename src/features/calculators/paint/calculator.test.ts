import { describe, expect, it } from 'vitest';
import { calculatePaint, gallonsToLiters, recommendPaintPurchase } from './calculator';
import { createDefaultPaintInput } from './formDefaults';
import { convertPaintMeasurementSystem } from './formUnits';
import { validatePaintInput } from './validation';

describe('paint calculation', () => {
  it('calculates a simple four-wall room with two coats and allowance', () => {
    const result = calculatePaint(createDefaultPaintInput());
    expect(result.grossWallAreaSquareFeet).toBeCloseTo(352);
    expect(result.netWallAreaSquareFeet).toBeCloseTo(352);
    expect(result.wall.baseGallons).toBeCloseTo(1.76);
    expect(result.wall.requiredGallons).toBeCloseTo(1.936);
  });
  it('scales multiple identical rooms', () => {
    const input = createDefaultPaintInput();
    input.roomQuantity = 3;
    expect(calculatePaint(input).grossWallAreaSquareFeet).toBeCloseTo(1056);
  });
  it('deducts one or multiple doors', () => {
    const input = createDefaultPaintInput();
    input.doorOpenings.quantity = 2;
    expect(calculatePaint(input).doorOpeningAreaSquareFeet).toBeCloseTo(40.02);
  });
  it('deducts one or multiple windows', () => {
    const input = createDefaultPaintInput();
    input.windowOpenings.quantity = 3;
    expect(calculatePaint(input).windowOpeningAreaSquareFeet).toBeCloseTo(36);
  });
  it('deducts doors and windows together', () => {
    const input = createDefaultPaintInput();
    input.doorOpenings.quantity = 1;
    input.windowOpenings.quantity = 2;
    expect(calculatePaint(input).netWallAreaSquareFeet).toBeCloseTo(307.99);
  });
  it('uses project-total opening quantities for one room', () => {
    const input = createDefaultPaintInput();
    input.roomQuantity = 1;
    input.doorOpenings.quantity = 2;
    input.windowOpenings.quantity = 3;
    const result = calculatePaint(input);
    expect(result.doorOpeningAreaSquareFeet).toBeCloseTo(40.02);
    expect(result.windowOpeningAreaSquareFeet).toBeCloseTo(36);
    expect(result.netWallAreaSquareFeet).toBeCloseTo(275.98);
  });
  it('uses project-total openings across ten identical rooms', () => {
    const input = createDefaultPaintInput();
    input.roomQuantity = 10;
    input.doorOpenings.quantity = 10;
    input.windowOpenings.quantity = 20;
    const result = calculatePaint(input);
    expect(result.grossWallAreaSquareFeet).toBeCloseTo(3520);
    expect(result.doorOpeningAreaSquareFeet).toBeCloseTo(200.1);
    expect(result.windowOpeningAreaSquareFeet).toBeCloseTo(240);
    expect(result.netWallAreaSquareFeet).toBeCloseTo(3079.9);
  });
  it('uses zero deductions when project-total opening counts are zero', () => {
    const input = createDefaultPaintInput();
    input.roomQuantity = 4;
    const result = calculatePaint(input);
    expect(result.doorOpeningAreaSquareFeet).toBe(0);
    expect(result.windowOpeningAreaSquareFeet).toBe(0);
    expect(result.netWallAreaSquareFeet).toBe(result.grossWallAreaSquareFeet);
  });
  it('preserves project-total opening deductions after metric conversion', () => {
    const imperial = createDefaultPaintInput();
    imperial.roomQuantity = 3;
    imperial.doorOpenings.quantity = 2;
    imperial.windowOpenings.quantity = 4;
    const expected = calculatePaint(imperial);
    const metric = calculatePaint(convertPaintMeasurementSystem(imperial, 'metric'));
    expect(
      Math.abs(metric.grossWallAreaSquareFeet - expected.grossWallAreaSquareFeet),
    ).toBeLessThan(0.2);
    expect(
      Math.abs(metric.doorOpeningAreaSquareFeet - expected.doorOpeningAreaSquareFeet),
    ).toBeLessThan(0.1);
    expect(
      Math.abs(metric.windowOpeningAreaSquareFeet - expected.windowOpeningAreaSquareFeet),
    ).toBeLessThan(0.1);
    expect(Math.abs(metric.wall.requiredGallons - expected.wall.requiredGallons)).toBeLessThan(
      0.001,
    );
  });
  it('scales room geometry while project-total opening deductions remain unchanged', () => {
    const one = createDefaultPaintInput();
    one.includeCeiling = true;
    one.doorOpenings.quantity = 1;
    one.windowOpenings.quantity = 1;
    const many = structuredClone(one);
    many.roomQuantity = 6;
    const singleResult = calculatePaint(one);
    const manyResult = calculatePaint(many);
    expect(manyResult.grossWallAreaSquareFeet).toBeCloseTo(
      singleResult.grossWallAreaSquareFeet * 6,
    );
    expect(manyResult.doorOpeningAreaSquareFeet).toBeCloseTo(
      singleResult.doorOpeningAreaSquareFeet,
    );
    expect(manyResult.windowOpeningAreaSquareFeet).toBeCloseTo(
      singleResult.windowOpeningAreaSquareFeet,
    );
    expect(manyResult.ceilingAreaSquareFeet).toBeCloseTo(singleResult.ceilingAreaSquareFeet * 6);
    expect(manyResult.netWallAreaSquareFeet).toBeCloseTo(
      singleResult.grossWallAreaSquareFeet * 6 -
        singleResult.doorOpeningAreaSquareFeet -
        singleResult.windowOpeningAreaSquareFeet,
    );
  });
  it('keeps the ceiling off by default and calculates it when enabled', () => {
    const input = createDefaultPaintInput();
    expect(calculatePaint(input).ceiling).toBeUndefined();
    input.includeCeiling = true;
    expect(calculatePaint(input).ceilingAreaSquareFeet).toBeCloseTo(120);
  });
  it('keeps painted doors separate and supports one or two sides', () => {
    const input = createDefaultPaintInput();
    expect(calculatePaint(input).doors).toBeUndefined();
    input.paintDoors = true;
    input.paintedDoorSides = 1;
    expect(calculatePaint(input).paintedDoorAreaSquareFeet).toBeCloseTo(20.01);
    input.paintedDoorSides = 2;
    expect(calculatePaint(input).paintedDoorAreaSquareFeet).toBeCloseTo(40.02);
  });
  it('keeps project-total door openings independent from painted-door quantity', () => {
    const input = createDefaultPaintInput();
    input.doorOpenings.quantity = 10;
    input.paintDoors = true;
    input.paintedDoorQuantity = 4;
    input.paintedDoorSides = 2;
    const result = calculatePaint(input);
    expect(result.doorOpeningAreaSquareFeet).toBeCloseTo(200.1);
    expect(result.paintedDoorAreaSquareFeet).toBeCloseTo(160.08);
    expect(input.doorOpenings.quantity).toBe(10);
    expect(input.paintedDoorQuantity).toBe(4);
  });
  it('calculates trim from linear length times face width', () => {
    const input = createDefaultPaintInput();
    expect(calculatePaint(input).trim).toBeUndefined();
    input.paintTrim = true;
    expect(calculatePaint(input).trimAreaSquareFeet).toBeCloseTo(22);
  });
  it('calculates primer independently', () => {
    const input = createDefaultPaintInput();
    input.usePrimer = true;
    input.primerCoats = 1;
    expect(calculatePaint(input).primer?.baseGallons).toBeCloseTo(0.88);
  });
  it('supports one, two, and custom coats and coverage', () => {
    const input = createDefaultPaintInput();
    input.allowancePercent = 0;
    input.coats = 1;
    expect(calculatePaint(input).wall.requiredGallons).toBeCloseTo(0.88);
    input.coats = 3;
    input.coverageSquareFeetPerGallon = 300;
    expect(calculatePaint(input).wall.requiredGallons).toBeCloseTo(3.52);
  });
  it('keeps surface condition as guidance-only state', () => {
    const smooth = createDefaultPaintInput();
    const textured = { ...smooth, surfaceCondition: 'textured' as const };
    expect(calculatePaint(textured)).toEqual(calculatePaint(smooth));
  });
  it('applies 0% or 10% allowance transparently', () => {
    const input = createDefaultPaintInput();
    input.allowancePercent = 0;
    const zero = calculatePaint(input).wall;
    input.allowancePercent = 10;
    const ten = calculatePaint(input).wall;
    expect(zero.allowanceGallons).toBe(0);
    expect(ten.requiredGallons).toBeCloseTo(zero.baseGallons * 1.1);
  });
  it('preserves results when switching to metric and converts coverage', () => {
    const imperial = createDefaultPaintInput();
    const expected = calculatePaint(imperial).wall.requiredGallons;
    const metric = convertPaintMeasurementSystem(imperial, 'metric');
    expect(metric.coverageSquareFeetPerGallon).toBeCloseTo(9.817, 2);
    expect(calculatePaint(metric).wall.requiredGallons).toBeCloseTo(expected, 3);
  });
  it('keeps converted coverage inputs readable through a round trip', () => {
    const imperial = createDefaultPaintInput();
    const metric = convertPaintMeasurementSystem(imperial, 'metric');
    const restored = convertPaintMeasurementSystem(metric, 'imperial');
    expect(metric.coverageSquareFeetPerGallon).toBe(9.817);
    expect(metric.primerCoverageSquareFeetPerGallon).toBe(9.817);
    expect(restored.coverageSquareFeetPerGallon).toBe(400.002);
    expect(restored.primerCoverageSquareFeetPerGallon).toBe(400.002);
    expect(calculatePaint(restored).wall.requiredGallons).toBeCloseTo(
      calculatePaint(imperial).wall.requiredGallons,
      3,
    );
  });
  it('converts US gallons to liters', () => expect(gallonsToLiters(1)).toBeCloseTo(3.785411784));
  it('recommends mixed practical container sizes', () => {
    expect(recommendPaintPurchase(2.32).display).toBe('2 x 1 gal + 2 x 1 qt');
    expect(recommendPaintPurchase(7).display).toBe('1 x 5 gal + 2 x 1 gal');
    expect(recommendPaintPurchase(0.1).display).toBe('1 x 1 qt');
  });
  it('treats machine noise at a container boundary differently from genuine excess', () => {
    expect(recommendPaintPurchase(1.0000000000000002).purchasedGallons).toBe(1);
    expect(recommendPaintPurchase(1.0000000000000002).leftoverGallons).toBe(0);
    expect(recommendPaintPurchase(1.0001).purchasedGallons).toBe(1.25);
  });
  it.each([
    [0.25, 0.25, 1],
    [1, 1, 1],
    [1.25, 1.25, 2],
    [5, 5, 1],
    [5.25, 5.25, 2],
    [15.25, 15.25, 4],
  ])(
    'minimizes purchased volume and then container count at the %s gal boundary',
    (required, purchased, containerCount) => {
      const recommendation = recommendPaintPurchase(required);
      expect(recommendation.purchasedGallons).toBe(purchased);
      expect(recommendation.containers.reduce((sum, item) => sum + item.count, 0)).toBe(
        containerCount,
      );
      expect(recommendation.purchasedGallons).toBeGreaterThanOrEqual(required);
      expect(recommendation.leftoverGallons).toBeCloseTo(purchased - required);
    },
  );
  it('calculates pricing only when required prices exist', () => {
    const input = createDefaultPaintInput();
    expect(calculatePaint(input).estimatedTotalCost).toBeUndefined();
    input.pricePerGallon = 40;
    input.pricePerQuart = 15;
    input.pricePerFiveGallons = 160;
    expect(calculatePaint(input).estimatedFinishCost).toBe(80);
    input.usePrimer = true;
    input.primerPricePerGallon = 30;
    expect(calculatePaint(input).estimatedTotalCost).toBe(110);
  });
  it('allows empty and zero prices, rejects negative prices, and never changes paint quantity', () => {
    const input = createDefaultPaintInput();
    const required = calculatePaint(input).wall.requiredGallons;
    input.pricePerGallon = 0;
    expect(validatePaintInput(input)).toEqual([]);
    expect(calculatePaint(input).estimatedFinishCost).toBe(0);
    expect(calculatePaint(input).wall.requiredGallons).toBe(required);
    input.pricePerGallon = -1;
    expect(validatePaintInput(input).some((issue) => issue.field === 'pricePerGallon')).toBe(true);
    expect(calculatePaint(input).wall.requiredGallons).toBe(required);
  });
  it('handles very small and large projects without premature rounding', () => {
    const small = createDefaultPaintInput();
    small.length.value = 0.1;
    small.width.value = 0.1;
    small.wallHeight.value = 0.1;
    expect(calculatePaint(small).wall.requiredGallons).toBeGreaterThan(0);
    const large = createDefaultPaintInput();
    large.length.value = 1000;
    large.width.value = 500;
    large.wallHeight.value = 100;
    expect(calculatePaint(large).wall.requiredGallons).toBeGreaterThan(800);
  });
});

describe('paint validation', () => {
  it('rejects invalid dimensions and impossible opening area', () => {
    const input = createDefaultPaintInput();
    input.length.value = 0;
    expect(validatePaintInput(input).some((x) => x.field === 'length')).toBe(true);
    input.length.value = 12;
    input.doorOpenings.quantity = 100;
    expect(validatePaintInput(input).some((x) => x.field === 'openings')).toBe(true);
  });
  it('accepts zero doors and windows naturally', () =>
    expect(validatePaintInput(createDefaultPaintInput())).toEqual([]));
  it('validates project-total openings against the total project wall area', () => {
    const input = createDefaultPaintInput();
    input.roomQuantity = 10;
    input.doorOpenings.quantity = 10;
    input.windowOpenings.quantity = 20;
    expect(validatePaintInput(input).some((issue) => issue.field === 'openings')).toBe(false);

    input.doorOpenings.quantity = 176;
    input.windowOpenings.quantity = 0;
    expect(validatePaintInput(input)).toContainEqual({
      field: 'openings',
      message: 'Door and window openings must be smaller than the total gross wall area.',
    });
  });
  it('rejects malformed dimensions while accepting small and reasonably large projects', () => {
    const input = createDefaultPaintInput();
    input.length.value = Number.NaN;
    expect(validatePaintInput(input).some((issue) => issue.field === 'length')).toBe(true);
    input.length.value = 0.001;
    input.width.value = 0.001;
    input.wallHeight.value = 0.001;
    expect(validatePaintInput(input)).toEqual([]);
    input.length.value = 1000;
    input.width.value = 500;
    input.wallHeight.value = 100;
    expect(validatePaintInput(input)).toEqual([]);
  });
  it('ignores stale primer-only validation values while primer is disabled', () => {
    const input = createDefaultPaintInput();
    input.usePrimer = false;
    input.primerCoats = 0;
    input.primerCoverageSquareFeetPerGallon = 0;
    expect(validatePaintInput(input)).toEqual([]);
    expect(calculatePaint(input).primer).toBeUndefined();
  });
  it('validates primer coverage when primer is enabled', () => {
    const input = createDefaultPaintInput();
    input.usePrimer = true;
    input.primerCoverageSquareFeetPerGallon = 0;
    expect(validatePaintInput(input)).toContainEqual({
      field: 'primerCoverageSquareFeetPerGallon',
      message: 'Primer coverage must be greater than zero.',
    });
  });
  it('rejects invalid coats, coverage, allowance, and negative prices', () => {
    const input = createDefaultPaintInput();
    input.coats = 0;
    input.coverageSquareFeetPerGallon = 0;
    input.allowancePercent = -1;
    input.pricePerGallon = -2;
    const fields = validatePaintInput(input).map((x) => x.field);
    expect(fields).toEqual(
      expect.arrayContaining([
        'coats',
        'coverageSquareFeetPerGallon',
        'allowancePercent',
        'pricePerGallon',
      ]),
    );
  });
});

describe.each([
  {
    name: 'wall coats',
    field: 'coats' as const,
    max: 10,
    prepare: () => createDefaultPaintInput(),
  },
  {
    name: 'door coats',
    field: 'paintedDoorCoats' as const,
    max: 10,
    prepare: () => ({ ...createDefaultPaintInput(), paintDoors: true }),
  },
  {
    name: 'trim coats',
    field: 'trimCoats' as const,
    max: 10,
    prepare: () => ({ ...createDefaultPaintInput(), paintTrim: true }),
  },
  {
    name: 'primer coats',
    field: 'primerCoats' as const,
    max: 5,
    prepare: () => ({ ...createDefaultPaintInput(), usePrimer: true }),
  },
])('$name validation', ({ field, max, prepare }) => {
  it('accepts the minimum boundary', () => {
    const input = prepare();
    input[field] = 1;
    expect(validatePaintInput(input).some((issue) => issue.field === field)).toBe(false);
  });

  it('rejects values below the minimum', () => {
    const input = prepare();
    input[field] = 0;
    expect(validatePaintInput(input)).toContainEqual({
      field,
      message: expect.stringContaining(`1 to ${max}`),
    });
  });

  it('accepts the maximum boundary', () => {
    const input = prepare();
    input[field] = max;
    expect(validatePaintInput(input).some((issue) => issue.field === field)).toBe(false);
  });

  it('rejects values above the maximum', () => {
    const input = prepare();
    input[field] = max + 1;
    expect(validatePaintInput(input)).toContainEqual({
      field,
      message: expect.stringContaining(`1 to ${max}`),
    });
  });

  it('rejects fractional values', () => {
    const input = prepare();
    input[field] = 1.5;
    expect(validatePaintInput(input)).toContainEqual({
      field,
      message: expect.stringContaining('whole number'),
    });
  });
});
