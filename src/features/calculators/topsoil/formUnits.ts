import { convertLength } from '../../../lib/units/measurements';
import {
  CUBIC_METERS_PER_CUBIC_YARD,
  LITERS_PER_CUBIC_FOOT,
  POUNDS_PER_KILOGRAM,
} from './calculator';
import type { MeasurementSystem, TopsoilInput } from './types';

export function convertTopsoilMeasurementSystem(
  input: TopsoilInput,
  system: MeasurementSystem,
): TopsoilInput {
  if (input.measurementSystem === system) return input;
  const unit = system === 'metric' ? 'm' : 'ft';
  const depthUnit = system === 'metric' ? 'cm' : 'in';
  const convert = (d: TopsoilInput['length'], next: typeof unit | typeof depthUnit) => ({
    value: Number(convertLength(d.value, d.unit, next).toFixed(8)),
    unit: next,
  });
  const areaSquareFeet =
    input.areaUnit === 'sq-m'
      ? input.knownArea * 10.7639104167
      : input.areaUnit === 'sq-yd'
        ? input.knownArea * 9
        : input.knownArea;
  const bagLiters =
    input.bagVolume === undefined
      ? undefined
      : input.bagVolumeUnit === 'liter'
        ? input.bagVolume
        : input.bagVolume * LITERS_PER_CUBIC_FOOT;
  const bulkCubicMeters =
    input.bulkIncrement === undefined
      ? undefined
      : input.bulkIncrementUnit === 'cu-m'
        ? input.bulkIncrement
        : input.bulkIncrement * CUBIC_METERS_PER_CUBIC_YARD;
  const densityKgPerCubicMeter =
    input.supplierDensity === undefined
      ? undefined
      : input.densityUnit === 'kg-cu-m'
        ? input.supplierDensity
        : input.supplierDensity / POUNDS_PER_KILOGRAM / CUBIC_METERS_PER_CUBIC_YARD;
  const bulkPricePerCubicMeter =
    input.bulkUnitPrice === undefined
      ? undefined
      : input.measurementSystem === 'metric'
        ? input.bulkUnitPrice
        : input.bulkUnitPrice / CUBIC_METERS_PER_CUBIC_YARD;
  const converted = { ...input };
  for (const key of [
    'length',
    'width',
    'side',
    'diameter',
    'base',
    'perpendicularHeight',
    'sideA',
    'sideB',
    'outerDiameter',
    'innerDiameter',
  ] as const)
    converted[key] = convert(input[key], unit);
  return {
    ...converted,
    measurementSystem: system,
    depth: convert(input.depth, depthUnit),
    knownArea: Number(
      (system === 'metric' ? areaSquareFeet / 10.7639104167 : areaSquareFeet).toFixed(8),
    ),
    areaUnit: system === 'metric' ? 'sq-m' : 'sq-ft',
    bagVolume:
      bagLiters === undefined
        ? undefined
        : Number((system === 'metric' ? bagLiters : bagLiters / LITERS_PER_CUBIC_FOOT).toFixed(8)),
    bagVolumeUnit: system === 'metric' ? 'liter' : 'cu-ft',
    bulkIncrement:
      bulkCubicMeters === undefined
        ? undefined
        : Number(
            (system === 'metric'
              ? bulkCubicMeters
              : bulkCubicMeters / CUBIC_METERS_PER_CUBIC_YARD
            ).toFixed(8),
          ),
    bulkIncrementUnit: system === 'metric' ? 'cu-m' : 'cu-yd',
    supplierDensity:
      densityKgPerCubicMeter === undefined
        ? undefined
        : Number(
            (system === 'metric'
              ? densityKgPerCubicMeter
              : densityKgPerCubicMeter * POUNDS_PER_KILOGRAM * CUBIC_METERS_PER_CUBIC_YARD
            ).toFixed(8),
          ),
    densityUnit: system === 'metric' ? 'kg-cu-m' : 'lb-cu-yd',
    bulkUnitPrice:
      bulkPricePerCubicMeter === undefined
        ? undefined
        : Number(
            (system === 'metric'
              ? bulkPricePerCubicMeter
              : bulkPricePerCubicMeter * CUBIC_METERS_PER_CUBIC_YARD
            ).toFixed(8),
          ),
  };
}
