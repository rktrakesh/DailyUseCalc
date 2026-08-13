import { convertLength } from '../../../lib/units/measurements';
import {
  CUBIC_FEET_PER_CUBIC_METER,
  LITERS_PER_CUBIC_FOOT,
  POUNDS_PER_KILOGRAM,
  densityToPoundsPerCubicYard,
} from './calculator';
import type { MeasurementSystem, SandInput } from './types';

export function convertSandMeasurementSystem(
  input: SandInput,
  system: MeasurementSystem,
): SandInput {
  if (input.measurementSystem === system) return input;
  const lengthUnit = system === 'metric' ? 'm' : 'ft';
  const depthUnit = system === 'metric' ? 'cm' : 'in';
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
    converted[key] = {
      value: Number(convertLength(input[key].value, input[key].unit, lengthUnit).toFixed(8)),
      unit: lengthUnit,
    };
  const areaSqFt =
    input.knownArea *
    { 'sq-in': 1 / 144, 'sq-ft': 1, 'sq-yd': 9, 'sq-cm': 0.00107639104167, 'sq-m': 10.7639104167 }[
      input.areaUnit
    ];
  const bagSize =
    input.bagSize === undefined
      ? undefined
      : input.bagBasis === 'weight'
        ? input.bagUnit === 'kg'
          ? input.bagSize * POUNDS_PER_KILOGRAM
          : input.bagSize
        : input.bagSize *
          {
            'cu-ft': 1,
            'cu-yd': 27,
            liter: 1 / LITERS_PER_CUBIC_FOOT,
            'cu-m': CUBIC_FEET_PER_CUBIC_METER,
            lb: 1,
            kg: 1,
          }[input.bagUnit];
  const bulkIncrementBase =
    input.bulkIncrement === undefined
      ? undefined
      : input.bulkBasis === 'weight'
        ? input.bulkIncrement *
          {
            lb: 1,
            'us-ton': 2000,
            kg: POUNDS_PER_KILOGRAM,
            'metric-tonne': 1000 * POUNDS_PER_KILOGRAM,
            'cu-ft': 1,
            'cu-yd': 1,
            'cu-m': 1,
          }[input.bulkUnit]
        : input.bulkIncrement *
          {
            'cu-ft': 1,
            'cu-yd': 27,
            'cu-m': CUBIC_FEET_PER_CUBIC_METER,
            lb: 1,
            'us-ton': 1,
            kg: 1,
            'metric-tonne': 1,
          }[input.bulkUnit];
  const densityLbYd =
    input.supplierDensity === undefined
      ? undefined
      : densityToPoundsPerCubicYard(input.supplierDensity, input.densityUnit);
  const oldBulkFactor =
    input.bulkBasis === 'weight'
      ? {
          lb: 1,
          'us-ton': 2000,
          kg: POUNDS_PER_KILOGRAM,
          'metric-tonne': 1000 * POUNDS_PER_KILOGRAM,
          'cu-ft': 1,
          'cu-yd': 1,
          'cu-m': 1,
        }[input.bulkUnit]
      : {
          'cu-ft': 1,
          'cu-yd': 27,
          'cu-m': CUBIC_FEET_PER_CUBIC_METER,
          lb: 1,
          'us-ton': 1,
          kg: 1,
          'metric-tonne': 1,
        }[input.bulkUnit];
  const bulkUnit =
    input.bulkBasis === 'weight'
      ? system === 'metric'
        ? 'metric-tonne'
        : 'us-ton'
      : system === 'metric'
        ? 'cu-m'
        : 'cu-yd';
  const newBulkFactor =
    input.bulkBasis === 'weight'
      ? system === 'metric'
        ? 1000 * POUNDS_PER_KILOGRAM
        : 2000
      : system === 'metric'
        ? CUBIC_FEET_PER_CUBIC_METER
        : 27;
  return {
    ...converted,
    measurementSystem: system,
    depth: {
      value: Number(convertLength(input.depth.value, input.depth.unit, depthUnit).toFixed(8)),
      unit: depthUnit,
    },
    knownArea: Number((system === 'metric' ? areaSqFt / 10.7639104167 : areaSqFt).toFixed(8)),
    areaUnit: system === 'metric' ? 'sq-m' : 'sq-ft',
    bagSize:
      bagSize === undefined
        ? undefined
        : Number(
            (input.bagBasis === 'weight'
              ? system === 'metric'
                ? bagSize / POUNDS_PER_KILOGRAM
                : bagSize
              : system === 'metric'
                ? bagSize * LITERS_PER_CUBIC_FOOT
                : bagSize
            ).toFixed(8),
          ),
    bagUnit:
      input.bagBasis === 'weight'
        ? system === 'metric'
          ? 'kg'
          : 'lb'
        : system === 'metric'
          ? 'liter'
          : 'cu-ft',
    bulkIncrement:
      bulkIncrementBase === undefined
        ? undefined
        : Number(
            (input.bulkBasis === 'weight'
              ? system === 'metric'
                ? (bulkIncrementBase * POUNDS_PER_KILOGRAM) / 1000
                : bulkIncrementBase / 2000
              : system === 'metric'
                ? bulkIncrementBase / CUBIC_FEET_PER_CUBIC_METER
                : bulkIncrementBase / 27
            ).toFixed(8),
          ),
    bulkUnit,
    bulkUnitPrice:
      input.bulkUnitPrice === undefined
        ? undefined
        : Number(((input.bulkUnitPrice * newBulkFactor) / oldBulkFactor).toFixed(8)),
    supplierDensity:
      densityLbYd === undefined
        ? undefined
        : Number(
            (system === 'metric'
              ? densityLbYd / POUNDS_PER_KILOGRAM / 0.764554857984
              : densityLbYd
            ).toFixed(8),
          ),
    densityUnit: system === 'metric' ? 'kg-cu-m' : 'lb-cu-yd',
  };
}
