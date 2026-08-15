import type { LengthUnit } from '../../../lib/units/measurements';
import type { DimensionInput, GravelInput, MeasurementSystem } from './types';

const METERS_PER_UNIT: Record<LengthUnit, number> = {
  ft: 0.3048,
  in: 0.0254,
  yd: 0.9144,
  m: 1,
  cm: 0.01,
  mm: 0.001,
};

export function convertGravelLength(value: number, from: LengthUnit, to: LengthUnit): number {
  const converted = (value * METERS_PER_UNIT[from]) / METERS_PER_UNIT[to];
  // Remove binary representation tails without reducing values to display-level
  // precision. Fifteen significant digits retain Number's reliable precision.
  return Number(converted.toPrecision(15));
}

function convertDimension(input: DimensionInput, unit: LengthUnit): DimensionInput {
  return {
    value: Number.isFinite(input.value)
      ? convertGravelLength(input.value, input.unit, unit)
      : input.value,
    unit,
  };
}

export function convertGravelMeasurementSystem(
  input: GravelInput,
  system: MeasurementSystem,
): Pick<GravelInput, 'length' | 'width' | 'diameter' | 'depth'> {
  const metric = system === 'metric';
  return {
    length: convertDimension(input.length, metric ? 'm' : 'ft'),
    width: convertDimension(input.width, metric ? 'm' : 'ft'),
    diameter: convertDimension(input.diameter, metric ? 'm' : 'ft'),
    depth: convertDimension(input.depth, metric ? 'cm' : 'in'),
  };
}
