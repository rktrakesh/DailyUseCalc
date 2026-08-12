import { describe, expect, it } from 'vitest';
import { convertLength } from '../../../lib/units/measurements';
import {
  calculateConcrete,
  concreteQuantityUnit,
  concreteGeometry,
  createClearedConcreteInput,
  createDefaultConcreteInput,
  NORMAL_WEIGHT_CONCRETE_LB_PER_FT3,
  validateConcreteInput,
} from '.';
import type { ConcreteInput, ConcreteMode } from './types';

const base = createDefaultConcreteInput();
const expectedVolume = {
  slab: 20 * 10 * (4 / 12),
  'circular-pad': Math.PI * 5 ** 2 * (4 / 12),
  column: Math.PI * 5 ** 2 * 8,
  'post-hole': Math.PI * 0.5 ** 2 * 3,
};

function forMode(mode: ConcreteMode, overrides: Partial<ConcreteInput> = {}): ConcreteInput {
  return { ...base, concreteMode: mode, allowancePercent: 0, ...overrides };
}

function metric(input: ConcreteInput): ConcreteInput {
  const converted = (dimension: ConcreteInput['length']) => ({
    value: convertLength(dimension.value, dimension.unit, 'm'),
    unit: 'm' as const,
  });
  return {
    ...input,
    length: converted(input.length),
    width: converted(input.width),
    diameter: converted(input.diameter),
    thickness: converted(input.thickness),
    height: converted(input.height),
    holeDiameter: converted(input.holeDiameter),
    holeDepth: converted(input.holeDepth),
  };
}

describe('concrete geometry', () => {
  it.each(Object.entries(expectedVolume) as Array<[ConcreteMode, number]>)(
    'calculates %s in imperial units',
    (mode, expected) =>
      expect(concreteGeometry(forMode(mode)).volumeCubicFeet).toBeCloseTo(expected, 10),
  );
  it.each(Object.entries(expectedVolume) as Array<[ConcreteMode, number]>)(
    'calculates the metric-equivalent %s',
    (mode, expected) =>
      expect(concreteGeometry(metric(forMode(mode))).volumeCubicFeet).toBeCloseTo(expected, 8),
  );
  it.each(['slab', 'circular-pad', 'column', 'post-hole'] as ConcreteMode[])(
    'multiplies %s by quantity',
    (mode) =>
      expect(concreteGeometry(forMode(mode, { quantity: 4 })).volumeCubicFeet).toBeCloseTo(
        expectedVolume[mode] * 4,
        10,
      ),
  );
  it.each(['slab', 'circular-pad', 'column', 'post-hole'] as ConcreteMode[])(
    'ignores inactive fields for %s',
    (mode) => {
      const input = forMode(mode);
      const inactive = {
        ...input,
        length: { ...input.length, value: Number.NaN },
        width: { ...input.width, value: Number.NaN },
        diameter: { ...input.diameter, value: Number.NaN },
        thickness: { ...input.thickness, value: Number.NaN },
        height: { ...input.height, value: Number.NaN },
        holeDiameter: { ...input.holeDiameter, value: Number.NaN },
        holeDepth: { ...input.holeDepth, value: Number.NaN },
      };
      if (mode === 'slab')
        Object.assign(inactive, {
          length: input.length,
          width: input.width,
          thickness: input.thickness,
        });
      if (mode === 'circular-pad')
        Object.assign(inactive, { diameter: input.diameter, thickness: input.thickness });
      if (mode === 'column')
        Object.assign(inactive, { diameter: input.diameter, height: input.height });
      if (mode === 'post-hole')
        Object.assign(inactive, { holeDiameter: input.holeDiameter, holeDepth: input.holeDepth });
      expect(validateConcreteInput(inactive)).toEqual([]);
      expect(concreteGeometry(inactive).volumeCubicFeet).toBeCloseTo(expectedVolume[mode], 10);
    },
  );
  it('returns area only for slabs and circular pads', () => {
    expect(concreteGeometry(forMode('slab')).surfaceAreaSquareFeet).toBe(200);
    expect(concreteGeometry(forMode('circular-pad')).surfaceAreaSquareFeet).toBeCloseTo(
      Math.PI * 25,
    );
    expect(concreteGeometry(forMode('column')).surfaceAreaSquareFeet).toBeUndefined();
    expect(concreteGeometry(forMode('post-hole')).surfaceAreaSquareFeet).toBeUndefined();
  });
});

describe('allowance, order, and weight', () => {
  it.each([
    [0, 1],
    [10, 1.1],
    [100, 2],
  ])('applies %s%% allowance exactly once', (allowance, factor) => {
    const result = calculateConcrete({ ...base, allowancePercent: allowance });
    expect(result.adjustedVolumeCubicYards).toBeCloseTo(result.volumeCubicYards * factor);
  });
  it.each([
    [3, 3],
    [3.01, 3.1],
    [3.1, 3.1],
    [3.1000000000000005, 3.1],
  ])('rounds %s yd³ safely to %s', (adjusted, expected) => {
    const input = {
      ...base,
      length: { value: adjusted * 27, unit: 'ft' as const },
      width: { value: 1, unit: 'ft' as const },
      thickness: { value: 1, unit: 'ft' as const },
      allowancePercent: 0,
    };
    expect(calculateConcrete(input).recommendedOrderCubicYards).toBe(expected);
  });
  it('uses adjusted volume and 145 lb/ft³ for all weight conversions', () => {
    const result = calculateConcrete(base);
    const adjustedFt3 = result.adjustedVolumeCubicYards * 27;
    expect(result.densityPoundsPerCubicFoot).toBe(NORMAL_WEIGHT_CONCRETE_LB_PER_FT3);
    expect(result.estimatedWeightPounds).toBeCloseTo(adjustedFt3 * 145);
    expect(result.estimatedWeightPounds / 2000).toBeCloseTo((adjustedFt3 * 145) / 2000);
    expect(result.estimatedWeightKilograms).toBeCloseTo(result.estimatedWeightPounds * 0.45359237);
    expect(result.estimatedWeightKilograms / 1000).toBeCloseTo(
      (result.estimatedWeightPounds * 0.45359237) / 1000,
    );
  });
});

describe('bags and pricing', () => {
  it.each([
    {
      name: 'slab',
      input: {},
      measured: 2.4691358,
      adjusted: 2.7160494,
      order: 2.8,
      bags: 123,
      readyMixCost: 76,
      bagCost: 3690,
    },
    {
      name: 'circular pad',
      input: { concreteMode: 'circular-pad' as const, quantity: 3 },
      measured: 2.9088821,
      adjusted: 3.1997703,
      order: 3.2,
      bags: 144,
      readyMixCost: 84,
      bagCost: 4320,
    },
    {
      name: 'column',
      input: {
        concreteMode: 'column' as const,
        height: { value: 20, unit: 'ft' as const },
        quantity: 2,
      },
      measured: 116.3552835,
      adjusted: 127.9908119,
      order: 128,
      bags: 5760,
      readyMixCost: 2580,
      bagCost: 172800,
    },
    {
      name: 'post hole',
      input: {
        concreteMode: 'post-hole' as const,
        holeDepth: { value: 15, unit: 'ft' as const },
        quantity: 2,
      },
      measured: 0.8726646,
      adjusted: 0.9599311,
      order: 1,
      bags: 44,
      readyMixCost: 40,
      bagCost: 1320,
    },
  ])(
    'preserves the known-good $name purchasing scenario',
    ({ input: overrides, measured, adjusted, order, bags, readyMixCost, bagCost }) => {
      const result = calculateConcrete({
        ...base,
        ...overrides,
        readyMixPricePerCubicYard: 20,
        readyMixDeliveryFee: 20,
        bagPrice: 30,
      });
      expect(result.volumeCubicYards).toBeCloseTo(measured, 6);
      expect(result.adjustedVolumeCubicYards).toBeCloseTo(adjusted, 6);
      expect(result.recommendedOrderCubicYards).toBe(order);
      expect(result.bagCount).toBe(bags);
      expect(result.estimatedReadyMixCost).toBe(readyMixCost);
      expect(result.estimatedBagCost).toBe(bagCost);
    },
  );

  it.each([
    ['40-lb', 0.3, 245],
    ['50-lb', 0.375, 196],
    ['60-lb', 0.45, 163],
    ['80-lb', 0.6, 123],
    ['30-kg', 0.5, 147],
  ] as const)('uses the %s preset yield', (bagPreset, yieldFt3, expectedBags) => {
    const result = calculateConcrete({ ...base, bagPreset });
    expect(result.bagYieldCubicFeet).toBe(yieldFt3);
    expect(result.bagCount).toBe(expectedBags);
  });
  it('uses a custom yield', () =>
    expect(
      calculateConcrete({ ...base, bagPreset: 'custom', customBagYieldCubicFeet: 0.5 })
        .bagYieldCubicFeet,
    ).toBe(0.5));
  it('uses custom yield rather than informational custom bag weight', () => {
    const first = calculateConcrete({
      ...base,
      bagPreset: 'custom',
      customBagYieldCubicFeet: 0.5,
      customBagWeight: 25,
      customBagWeightUnit: 'kg',
    });
    const second = calculateConcrete({
      ...base,
      bagPreset: 'custom',
      customBagYieldCubicFeet: 0.5,
      customBagWeight: 80,
      customBagWeightUnit: 'lb',
    });
    expect(first.bagCount).toBe(second.bagCount);
  });
  it.each([
    [27, 0.6, 45],
    [20, 0.6, 34],
    [0.3, 0.1, 3],
  ])('rounds %s ft³ with %s yield to %s bags', (volume, yieldFt3, bags) => {
    const result = calculateConcrete({
      ...base,
      length: { value: volume, unit: 'ft' },
      width: { value: 1, unit: 'ft' },
      thickness: { value: 1, unit: 'ft' },
      allowancePercent: 0,
      bagPreset: 'custom',
      customBagYieldCubicFeet: yieldFt3,
    });
    expect(result.bagCount).toBe(bags);
  });
  it('calculates ready-mix price without delivery', () => {
    const result = calculateConcrete({ ...base, readyMixPricePerCubicYard: 150 });
    expect(result.estimatedReadyMixCost).toBeCloseTo(result.recommendedOrderCubicYards * 150);
  });
  it('adds delivery only to ready-mix price', () => {
    const result = calculateConcrete({
      ...base,
      readyMixPricePerCubicYard: 150,
      readyMixDeliveryFee: 75,
      bagPrice: 8,
    });
    expect(result.estimatedReadyMixCost).toBeCloseTo(result.recommendedOrderCubicYards * 150 + 75);
    expect(result.estimatedBagCost).toBe(result.bagCount * 8);
  });
  it('produces both costs independently', () => {
    const result = calculateConcrete({ ...base, readyMixPricePerCubicYard: 150, bagPrice: 8 });
    expect(result.estimatedReadyMixCost).toBeDefined();
    expect(result.estimatedBagCost).toBeDefined();
  });
  it('produces no costs without prices', () => {
    const result = calculateConcrete(base);
    expect(result.estimatedReadyMixCost).toBeUndefined();
    expect(result.estimatedBagCost).toBeUndefined();
  });
});

describe('concrete validation and defaults', () => {
  it.each([
    ['slab', 1, 'slab'],
    ['slab', 2, 'slabs'],
    ['circular-pad', 1, 'pad'],
    ['circular-pad', 2, 'pads'],
    ['column', 1, 'column'],
    ['column', 2, 'columns'],
    ['post-hole', 1, 'hole'],
    ['post-hole', 2, 'holes'],
  ] as const)('uses %s quantity wording for %s', (mode, quantity, expected) => {
    expect(concreteQuantityUnit(mode, quantity)).toBe(expected);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid active dimension %s',
    (value) =>
      expect(
        validateConcreteInput({ ...base, length: { ...base.length, value } }).some(
          (issue) => issue.field === 'length',
        ),
      ).toBe(true),
  );
  it('rejects excessive dimensions', () =>
    expect(
      validateConcreteInput({ ...base, length: { value: 100_001, unit: 'ft' } }).some(
        (issue) => issue.field === 'length',
      ),
    ).toBe(true));
  it.each([0, -1, 1.5, 10_001, Number.NaN])('rejects invalid quantity %s', (quantity) =>
    expect(
      validateConcreteInput({ ...base, quantity }).some((issue) => issue.field === 'quantity'),
    ).toBe(true),
  );
  it.each([-1, 101, Number.NaN])('rejects invalid allowance %s', (allowancePercent) =>
    expect(
      validateConcreteInput({ ...base, allowancePercent }).some(
        (issue) => issue.field === 'allowancePercent',
      ),
    ).toBe(true),
  );
  it.each([
    ['readyMixPricePerCubicYard', -1],
    ['readyMixDeliveryFee', 1_000_001],
    ['bagPrice', Number.POSITIVE_INFINITY],
  ] as const)('rejects invalid %s', (field, value) =>
    expect(
      validateConcreteInput({ ...base, [field]: value }).some((issue) => issue.field === field),
    ).toBe(true),
  );
  it.each([undefined, 0, -1, 101, Number.NaN])(
    'rejects custom yield %s',
    (customBagYieldCubicFeet) =>
      expect(
        validateConcreteInput({ ...base, bagPreset: 'custom', customBagYieldCubicFeet }).some(
          (issue) => issue.field === 'customBagYieldCubicFeet',
        ),
      ).toBe(true),
  );
  it.each([0, -1, 10_001, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid optional custom bag weight %s',
    (customBagWeight) =>
      expect(
        validateConcreteInput({
          ...base,
          bagPreset: 'custom',
          customBagYieldCubicFeet: 0.5,
          customBagWeight,
        }).some((issue) => issue.field === 'customBagWeight'),
      ).toBe(true),
  );
  it('clears measurements and preserves deterministic selectors', () => {
    const cleared = createClearedConcreteInput('EUR');
    expect(cleared.concreteMode).toBe('slab');
    expect(cleared.currency).toBe('EUR');
    expect(cleared.quantity).toBe(1);
    expect(cleared.allowancePercent).toBe(10);
    expect(cleared.bagPreset).toBe('80-lb');
    expect(Number.isNaN(cleared.length.value)).toBe(true);
    expect(cleared.length.unit).toBe('ft');
    expect(cleared.width.unit).toBe('ft');
    expect(cleared.thickness.unit).toBe('in');
    expect(cleared.diameter.unit).toBe('ft');
    expect(cleared.height.unit).toBe('ft');
    expect(cleared.holeDiameter.unit).toBe('in');
    expect(cleared.holeDepth.unit).toBe('ft');
  });
});
