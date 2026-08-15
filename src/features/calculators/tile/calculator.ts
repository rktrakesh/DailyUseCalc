import { toFeet } from '../../../lib/units/measurements';
import { normalizeNumericalLeftover, requiredWholeUnits } from '../../../lib/calculators/rounding';
import type { AreaUnit, TileCalculation, TileInput, TileSizeUnit } from './types';

export const SQUARE_FEET_PER_SQUARE_METER = 10.7639104167;
export const areaToSquareFeet = (value: number, unit: AreaUnit) =>
  value *
  {
    'sq-in': 1 / 144,
    'sq-ft': 1,
    'sq-yd': 9,
    'sq-cm': 0.00107639104167,
    'sq-m': SQUARE_FEET_PER_SQUARE_METER,
  }[unit];
export const squareFeetToArea = (value: number, unit: AreaUnit) =>
  value / areaToSquareFeet(1, unit);

export function tileLengthToFeet(value: number, unit: TileSizeUnit) {
  if (unit === 'in') return value / 12;
  if (unit === 'ft') return value;
  if (unit === 'mm') return value / 304.8;
  return value / 30.48;
}

export function tileAreaPerItemSquareFeet(input: TileInput) {
  if (input.measureMode === 'area') return areaToSquareFeet(input.knownArea, input.areaUnit);
  const feet = (d: TileInput['length']) => toFeet(d.value, d.unit);
  if (input.shape === 'square') return feet(input.side) ** 2;
  if (input.shape === 'circle') return Math.PI * (feet(input.diameter) / 2) ** 2;
  if (input.shape === 'triangle') return (feet(input.base) * feet(input.perpendicularHeight)) / 2;
  if (input.shape === 'trapezoid')
    return ((feet(input.sideA) + feet(input.sideB)) / 2) * feet(input.perpendicularHeight);
  if (input.shape === 'ring')
    return Math.PI * ((feet(input.outerDiameter) / 2) ** 2 - (feet(input.innerDiameter) / 2) ** 2);
  return feet(input.length) * feet(input.width);
}

export function calculateTile(input: TileInput): TileCalculation {
  const areaPerItemSquareFeet = tileAreaPerItemSquareFeet(input);
  const grossAreaSquareFeet = areaPerItemSquareFeet * input.quantity;
  const excludedAreaSquareFeet =
    input.excludedArea === undefined
      ? 0
      : areaToSquareFeet(input.excludedArea, input.excludedAreaUnit);
  const netAreaSquareFeet = grossAreaSquareFeet - excludedAreaSquareFeet;
  const tileLengthFeet = tileLengthToFeet(input.tileLength, input.tileUnit);
  const tileWidthFeet = tileLengthToFeet(input.tileWidth, input.tileUnit);
  const gapFeet = input.groutUnit === 'in' ? input.groutGap / 12 : input.groutGap / 304.8;
  const tileFaceAreaSquareFeet = tileLengthFeet * tileWidthFeet;
  const moduleAreaSquareFeet = (tileLengthFeet + gapFeet) * (tileWidthFeet + gapFeet);
  const rawTiles = netAreaSquareFeet / moduleAreaSquareFeet;
  const wasteAdjustedTiles = rawTiles * (1 + input.wastePercent / 100);
  const requiredTiles = requiredWholeUnits(wasteAdjustedTiles, 1);
  const wasteAdjustedCoverageSquareFeet = netAreaSquareFeet * (1 + input.wastePercent / 100);
  let boxesRequired: number | undefined;
  let purchasedTiles: number | undefined;
  let extraTiles: number | undefined;
  let purchasedCoverageSquareFeet: number | undefined;
  let extraPurchasedCoverageSquareFeet: number | undefined;
  if (input.boxMode === 'coverage' && input.manufacturerCoverage !== undefined) {
    const coverage = areaToSquareFeet(input.manufacturerCoverage, input.manufacturerCoverageUnit);
    boxesRequired = requiredWholeUnits(wasteAdjustedCoverageSquareFeet, coverage);
    purchasedCoverageSquareFeet = boxesRequired * coverage;
    extraPurchasedCoverageSquareFeet = normalizeNumericalLeftover(
      purchasedCoverageSquareFeet,
      wasteAdjustedCoverageSquareFeet,
      coverage,
    );
  } else if (input.tilesPerBox !== undefined) {
    boxesRequired = requiredWholeUnits(requiredTiles, input.tilesPerBox);
    purchasedTiles = boxesRequired * input.tilesPerBox;
    extraTiles = purchasedTiles - requiredTiles;
    purchasedCoverageSquareFeet = purchasedTiles * tileFaceAreaSquareFeet;
  }
  let estimatedCost: number | undefined;
  if (input.price !== undefined) {
    if (input.priceBasis === 'tile') estimatedCost = requiredTiles * input.price;
    else if (input.priceBasis === 'box' && boxesRequired !== undefined)
      estimatedCost = boxesRequired * input.price;
    else if (input.priceBasis === 'sq-ft')
      estimatedCost = wasteAdjustedCoverageSquareFeet * input.price;
    else if (input.priceBasis === 'sq-m')
      estimatedCost =
        (wasteAdjustedCoverageSquareFeet / SQUARE_FEET_PER_SQUARE_METER) * input.price;
  }
  return {
    areaPerItemSquareFeet,
    grossAreaSquareFeet,
    excludedAreaSquareFeet,
    netAreaSquareFeet,
    tileFaceAreaSquareFeet,
    moduleAreaSquareFeet,
    rawTiles,
    wasteAdjustedTiles,
    requiredTiles,
    wasteAdjustedCoverageSquareFeet,
    boxesRequired,
    purchasedTiles,
    extraTiles,
    purchasedCoverageSquareFeet,
    extraPurchasedCoverageSquareFeet,
    estimatedCost,
  };
}
