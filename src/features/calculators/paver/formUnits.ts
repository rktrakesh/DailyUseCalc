import { convertLength, type LengthUnit } from '../../../lib/units/measurements';
import { areaToSquareFeet, squareFeetToArea } from './calculator';
import type { AreaUnit, Dimension, PaverInput, PaverUnit } from './types';

// Keep form values precise without exposing conversion noise in number inputs.
const rounded = (value: number) => (Number.isFinite(value) ? Number(value.toFixed(8)) : value);
const convertDimension = (dimension: Dimension, unit: LengthUnit): Dimension => ({
  value: rounded(convertLength(dimension.value, dimension.unit, unit)),
  unit,
});

export function convertPaverMeasurementSystem(
  input: PaverInput,
  next: PaverInput['measurementSystem'],
): PaverInput {
  if (next === input.measurementSystem) return input;
  const metric = next === 'metric';
  const dimensionUnit: LengthUnit = metric ? 'm' : 'ft';
  const depthUnit: LengthUnit = metric ? 'cm' : 'in';
  const areaUnit: AreaUnit = metric ? 'sq-m' : 'sq-ft';
  const paverUnit: PaverUnit = metric ? 'mm' : 'in';
  return {
    ...input,
    measurementSystem: next,
    length: convertDimension(input.length, dimensionUnit),
    width: convertDimension(input.width, dimensionUnit),
    diameter: convertDimension(input.diameter, dimensionUnit),
    knownArea: rounded(
      squareFeetToArea(areaToSquareFeet(input.knownArea, input.areaUnit), areaUnit),
    ),
    areaUnit,
    paverLength: rounded(convertLength(input.paverLength, input.paverUnit, paverUnit)),
    paverWidth: rounded(convertLength(input.paverWidth, input.paverUnit, paverUnit)),
    paverUnit,
    jointWidth: rounded(convertLength(input.jointWidth, input.jointUnit, paverUnit)),
    jointUnit: paverUnit,
    baseDepth: convertDimension(input.baseDepth, depthUnit),
    sandDepth: convertDimension(input.sandDepth, depthUnit),
  };
}
