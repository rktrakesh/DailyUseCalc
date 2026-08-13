import { convertLength } from '../../../lib/units/measurements';
import type { MulchInput, MeasurementSystem } from './types';

export function convertMulchMeasurementSystem(
  input: MulchInput,
  system: MeasurementSystem,
): MulchInput {
  if (input.measurementSystem === system) return input;
  const unit = system === 'metric' ? 'm' : 'ft';
  const depthUnit = system === 'metric' ? 'cm' : 'in';
  const convert = (d: MulchInput['length'], next: typeof unit | typeof depthUnit) => ({
    value: Number(convertLength(d.value, d.unit, next).toFixed(4)),
    unit: next,
  });
  const knownArea =
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
        : input.bagVolume * 28.316846592;
  const dims = [
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
  ] as const;
  const converted = { ...input };
  for (const key of dims) converted[key] = convert(input[key], unit);
  return {
    ...converted,
    measurementSystem: system,
    depth: convert(input.depth, depthUnit),
    knownArea: Number((system === 'metric' ? knownArea / 10.7639104167 : knownArea).toFixed(4)),
    areaUnit: system === 'metric' ? 'sq-m' : 'sq-ft',
    bagVolume:
      bagLiters === undefined
        ? undefined
        : Number((system === 'metric' ? bagLiters : bagLiters / 28.316846592).toFixed(4)),
    bagVolumeUnit: system === 'metric' ? 'liter' : 'cu-ft',
  };
}
