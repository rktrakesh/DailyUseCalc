import { convertLength, type LengthUnit } from '../../../lib/units/measurements';
import { areaToSquareFeet, squareFeetToArea } from './calculator';
import type { AreaUnit, Dimension, TileInput, TileSizeUnit } from './types';

const DIMENSION_FIELDS = [
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

const rounded = (value: number) => (Number.isFinite(value) ? Number(value.toFixed(6)) : value);

const convertDimension = (dimension: Dimension, to: LengthUnit): Dimension => ({
  value: rounded(convertLength(dimension.value, dimension.unit, to)),
  unit: to,
});

const convertArea = (value: number, from: AreaUnit, to: AreaUnit) =>
  rounded(squareFeetToArea(areaToSquareFeet(value, from), to));

const convertOptionalArea = (value: number | undefined, from: AreaUnit, to: AreaUnit) =>
  value === undefined ? undefined : convertArea(value, from, to);

/** Converts the current Tile form values to normalized units without changing the physical project. */
export function convertTileMeasurementSystem(
  input: TileInput,
  next: TileInput['measurementSystem'],
): TileInput {
  if (next === input.measurementSystem) return input;

  const metric = next === 'metric';
  const surfaceUnit: LengthUnit = metric ? 'm' : 'ft';
  const areaUnit: AreaUnit = metric ? 'sq-m' : 'sq-ft';
  const tileUnit: TileSizeUnit = metric ? 'mm' : 'in';
  const converted = { ...input };

  for (const field of DIMENSION_FIELDS) {
    converted[field] = convertDimension(input[field], surfaceUnit);
  }

  return {
    ...converted,
    measurementSystem: next,
    knownArea: convertArea(input.knownArea, input.areaUnit, areaUnit),
    areaUnit,
    excludedArea: convertOptionalArea(input.excludedArea, input.excludedAreaUnit, areaUnit),
    excludedAreaUnit: areaUnit,
    manufacturerCoverage: convertOptionalArea(
      input.manufacturerCoverage,
      input.manufacturerCoverageUnit,
      areaUnit,
    ),
    manufacturerCoverageUnit: areaUnit,
    tileLength: rounded(convertLength(input.tileLength, input.tileUnit, tileUnit)),
    tileWidth: rounded(convertLength(input.tileWidth, input.tileUnit, tileUnit)),
    tileUnit,
    groutGap: rounded(convertLength(input.groutGap, input.groutUnit, metric ? 'mm' : 'in')),
    groutUnit: metric ? 'mm' : 'in',
  };
}
