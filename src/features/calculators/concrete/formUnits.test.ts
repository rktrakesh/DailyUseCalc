import { describe, expect, it } from 'vitest';
import { toFeet } from '../../../lib/units/measurements';
import {
  calculateConcrete,
  convertConcreteDimension,
  convertConcreteMeasurementSystem,
  createDefaultConcreteInput,
  validateConcreteInput,
} from '.';

describe('concrete form unit conversion', () => {
  it.each([
    [{ value: 20, unit: 'ft' as const }, 'in' as const, 240],
    [{ value: 4, unit: 'in' as const }, 'ft' as const, 0.33333333],
    [{ value: 20, unit: 'ft' as const }, 'yd' as const, 6.66666667],
    [{ value: 2, unit: 'm' as const }, 'cm' as const, 200],
  ])('converts %o to %s', (source, unit, expected) => {
    const converted = convertConcreteDimension(source, unit);
    expect(converted.value).toBeCloseTo(expected, 6);
    expect(toFeet(converted.value, converted.unit)).toBeCloseTo(
      toFeet(source.value, source.unit),
      5,
    );
  });

  it('converts the complete form from Imperial to Metric and back', () => {
    const imperial = createDefaultConcreteInput();
    const metric = convertConcreteMeasurementSystem(imperial, 'metric');
    const restored = convertConcreteMeasurementSystem(metric, 'imperial');

    expect(metric.length).toEqual({ value: 6.096, unit: 'm' });
    expect(metric.width).toEqual({ value: 3.048, unit: 'm' });
    expect(metric.thickness).toEqual({ value: 10.16, unit: 'cm' });
    expect(restored.length).toEqual({ value: 20, unit: 'ft' });
    expect(restored.width).toEqual({ value: 10, unit: 'ft' });
    expect(restored.thickness).toEqual({ value: 4, unit: 'in' });
  });

  it('preserves calculation results after manual unit conversion', () => {
    const input = createDefaultConcreteInput();
    const converted = {
      ...input,
      length: convertConcreteDimension(input.length, 'in'),
      width: convertConcreteDimension(input.width, 'yd'),
      thickness: convertConcreteDimension(input.thickness, 'ft'),
    };

    expect(calculateConcrete(converted).volumeCubicFeet).toBeCloseTo(
      calculateConcrete(input).volumeCubicFeet,
      4,
    );
  });

  it('applies equivalent physical validation limits across units', () => {
    const feet = {
      ...createDefaultConcreteInput(),
      length: { value: 100_001, unit: 'ft' as const },
    };
    const yards = {
      ...feet,
      length: convertConcreteDimension(feet.length, 'yd'),
    };

    expect(validateConcreteInput(feet).some((issue) => issue.field === 'length')).toBe(true);
    expect(validateConcreteInput(yards).some((issue) => issue.field === 'length')).toBe(true);
  });
});
