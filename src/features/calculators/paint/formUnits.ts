import { convertLength, type LengthUnit } from '../../../lib/units/measurements';
import { SQUARE_FEET_PER_SQUARE_METER, US_GALLON_LITERS } from './constants';
import type { MeasurementSystem, PaintInput } from './types';
const convert = (d: { value: number; unit: LengthUnit }, unit: LengthUnit) => ({
  ...d,
  value: Number.isFinite(d.value)
    ? Number(convertLength(d.value, d.unit, unit).toFixed(3))
    : d.value,
  unit,
});
const roundedCoverage = (value: number) =>
  Number.isFinite(value) ? Number(value.toFixed(3)) : value;
export function convertPaintMeasurementSystem(
  input: PaintInput,
  system: MeasurementSystem,
): PaintInput {
  const metric = system === 'metric';
  const major = metric ? 'm' : 'ft',
    minor = metric ? 'cm' : 'in';
  return {
    ...input,
    measurementSystem: system,
    length: convert(input.length, major),
    width: convert(input.width, major),
    wallHeight: convert(input.wallHeight, major),
    doorOpenings: {
      ...input.doorOpenings,
      width: convert(input.doorOpenings.width, major),
      height: convert(input.doorOpenings.height, major),
    },
    windowOpenings: {
      ...input.windowOpenings,
      width: convert(input.windowOpenings.width, major),
      height: convert(input.windowOpenings.height, major),
    },
    paintedDoorWidth: convert(input.paintedDoorWidth, major),
    paintedDoorHeight: convert(input.paintedDoorHeight, major),
    trimLength: convert(input.trimLength, major),
    trimWidth: convert(input.trimWidth, minor),
    coverageSquareFeetPerGallon: roundedCoverage(
      metric
        ? input.coverageSquareFeetPerGallon / SQUARE_FEET_PER_SQUARE_METER / US_GALLON_LITERS
        : input.coverageSquareFeetPerGallon * SQUARE_FEET_PER_SQUARE_METER * US_GALLON_LITERS,
    ),
    primerCoverageSquareFeetPerGallon: roundedCoverage(
      metric
        ? input.primerCoverageSquareFeetPerGallon / SQUARE_FEET_PER_SQUARE_METER / US_GALLON_LITERS
        : input.primerCoverageSquareFeetPerGallon * SQUARE_FEET_PER_SQUARE_METER * US_GALLON_LITERS,
    ),
  };
}
