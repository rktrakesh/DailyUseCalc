import { toFeet } from '../../../lib/units/measurements';
import { isSupportedPurchaseQuotient } from '../../../lib/calculators/rounding';
import { areaToSquareFeet, tileAreaPerItemSquareFeet, tileLengthToFeet } from './calculator';
import type { TileInput, ValidationIssue } from './types';

const positive = (v: number) => Number.isFinite(v) && v > 0;
export function validateTileInput(input: TileInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const dimension = (field: keyof TileInput, d: TileInput['length']) => {
    if (!positive(d.value)) issues.push({ field, message: 'Enter a value greater than zero.' });
  };
  if (input.measureMode === 'area') {
    if (!positive(input.knownArea))
      issues.push({ field: 'knownArea', message: 'Enter an area greater than zero.' });
  } else if (input.shape === 'rectangle') {
    dimension('length', input.length);
    dimension('width', input.width);
  } else if (input.shape === 'square') dimension('side', input.side);
  else if (input.shape === 'circle') dimension('diameter', input.diameter);
  else if (input.shape === 'triangle') {
    dimension('base', input.base);
    dimension('perpendicularHeight', input.perpendicularHeight);
  } else if (input.shape === 'trapezoid') {
    dimension('sideA', input.sideA);
    dimension('sideB', input.sideB);
    dimension('perpendicularHeight', input.perpendicularHeight);
  } else {
    dimension('outerDiameter', input.outerDiameter);
    dimension('innerDiameter', input.innerDiameter);
    if (
      positive(input.outerDiameter.value) &&
      positive(input.innerDiameter.value) &&
      toFeet(input.outerDiameter.value, input.outerDiameter.unit) <=
        toFeet(input.innerDiameter.value, input.innerDiameter.unit)
    )
      issues.push({
        field: 'innerDiameter',
        message: 'Inner diameter must be smaller than outer diameter.',
      });
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1)
    issues.push({ field: 'quantity', message: 'Quantity must be a whole number of 1 or more.' });
  if (!positive(input.tileLength))
    issues.push({ field: 'tileLength', message: 'Enter a tile length greater than zero.' });
  if (!positive(input.tileWidth))
    issues.push({ field: 'tileWidth', message: 'Enter a tile width greater than zero.' });
  if (!Number.isFinite(input.groutGap) || input.groutGap < 0)
    issues.push({ field: 'groutGap', message: 'Grout gap cannot be negative.' });
  if (!Number.isFinite(input.wastePercent) || input.wastePercent < 0 || input.wastePercent > 100)
    issues.push({ field: 'wastePercent', message: 'Enter a percentage from 0 to 100.' });
  const gross = issues.some((issue) =>
    [
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
      'knownArea',
      'quantity',
    ].includes(String(issue.field)),
  )
    ? undefined
    : tileAreaPerItemSquareFeet(input) * input.quantity;
  if (
    input.excludedArea !== undefined &&
    (!positive(input.excludedArea) ||
      (gross !== undefined &&
        areaToSquareFeet(input.excludedArea, input.excludedAreaUnit) >= gross))
  )
    issues.push({
      field: 'excludedArea',
      message: 'Excluded area must be greater than zero and smaller than gross area.',
    });
  if (
    input.tilesPerBox !== undefined &&
    (!Number.isInteger(input.tilesPerBox) || input.tilesPerBox < 1)
  )
    issues.push({
      field: 'tilesPerBox',
      message: 'Tiles per box must be a whole number of 1 or more.',
    });
  if (input.manufacturerCoverage !== undefined && !positive(input.manufacturerCoverage))
    issues.push({ field: 'manufacturerCoverage', message: 'Coverage must be greater than zero.' });
  if (input.price !== undefined && (!Number.isFinite(input.price) || input.price < 0))
    issues.push({ field: 'price', message: 'Price cannot be negative.' });
  if (
    input.priceBasis === 'box' &&
    input.price !== undefined &&
    input.tilesPerBox === undefined &&
    input.manufacturerCoverage === undefined
  )
    issues.push({
      field: 'priceBasis',
      message: 'Configure box purchasing before using per-box pricing.',
    });
  if (!issues.length) {
    const excluded =
      input.excludedArea === undefined
        ? 0
        : areaToSquareFeet(input.excludedArea, input.excludedAreaUnit);
    const netArea = gross! - excluded;
    const gapFeet = input.groutUnit === 'in' ? input.groutGap / 12 : input.groutGap / 304.8;
    const moduleArea =
      (tileLengthToFeet(input.tileLength, input.tileUnit) + gapFeet) *
      (tileLengthToFeet(input.tileWidth, input.tileUnit) + gapFeet);
    const wasteAdjustedTiles = (netArea / moduleArea) * (1 + input.wastePercent / 100);
    if (!isSupportedPurchaseQuotient(wasteAdjustedTiles, 1))
      issues.push({
        field: 'tileLength',
        message: 'This project produces too many purchasing units for a reliable estimate.',
      });
    if (
      input.boxMode === 'coverage' &&
      input.manufacturerCoverage !== undefined &&
      !isSupportedPurchaseQuotient(
        netArea * (1 + input.wastePercent / 100),
        areaToSquareFeet(input.manufacturerCoverage, input.manufacturerCoverageUnit),
      )
    )
      issues.push({
        field: 'manufacturerCoverage',
        message: 'Use a larger manufacturer coverage value for this project.',
      });
  }
  return issues;
}
