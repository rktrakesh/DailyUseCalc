import { convertLength, type LengthUnit } from '../../../lib/units/measurements';
import type { ConcreteInput, DimensionInput, MeasurementSystem } from './types';

export const CONCRETE_LENGTH_UNITS: readonly LengthUnit[] = ['in', 'ft', 'yd', 'cm', 'm'];

export function convertConcreteDimension(
  dimension: DimensionInput,
  unit: LengthUnit,
  maximumFractionDigits = 8,
): DimensionInput {
  return {
    value: Number.isFinite(dimension.value)
      ? Number(convertLength(dimension.value, dimension.unit, unit).toFixed(maximumFractionDigits))
      : dimension.value,
    unit,
  };
}

export function convertConcreteMeasurementSystem(
  input: ConcreteInput,
  system: MeasurementSystem,
): ConcreteInput {
  const metric = system === 'metric';
  return {
    ...input,
    length: convertConcreteDimension(input.length, metric ? 'm' : 'ft', 3),
    width: convertConcreteDimension(input.width, metric ? 'm' : 'ft', 3),
    diameter: convertConcreteDimension(input.diameter, metric ? 'm' : 'ft', 3),
    thickness: convertConcreteDimension(input.thickness, metric ? 'cm' : 'in', 2),
    height: convertConcreteDimension(input.height, metric ? 'm' : 'ft', 3),
    holeDiameter: convertConcreteDimension(input.holeDiameter, metric ? 'cm' : 'in', 2),
    holeDepth: convertConcreteDimension(input.holeDepth, metric ? 'm' : 'ft', 3),
  };
}
