import { formatMoney } from '../gravel/currencies';
import { squareFeetToArea } from './calculator';
import type { AreaUnit, TileCalculation, TileInput } from './types';
const n = (v: number, d = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(v);
export const TILE_URL = 'https://dailyusecalc.com/tile/';
export const areaLabel = (u: AreaUnit) =>
  ({ 'sq-in': 'sq in', 'sq-ft': 'sq ft', 'sq-yd': 'sq yd', 'sq-cm': 'sq cm', 'sq-m': 'sq m' })[u];
export const projectLabel = (p: TileInput['projectType']) =>
  ({
    floor: 'Floor',
    wall: 'Wall',
    backsplash: 'Backsplash',
    'shower-wall': 'Shower Wall',
    'shower-floor': 'Shower Floor',
    'accent-wall': 'Fireplace / Accent Wall',
    patio: 'Patio / Outdoor',
    other: 'Other',
  })[p];
export const patternLabel = (p: TileInput['pattern']) =>
  ({
    straight: 'Straight / Grid',
    brick: 'Brick / Offset',
    diagonal: 'Diagonal',
    herringbone: 'Herringbone',
    custom: 'Custom / Other',
  })[p];
export function createTileEstimateText(input: TileInput, c: TileCalculation) {
  const metric = input.measurementSystem === 'metric',
    au = metric ? 'sq-m' : 'sq-ft';
  return [
    'DailyUseCalc Tile Estimate',
    `Project: ${projectLabel(input.projectType)}`,
    `Net tiled area: ${n(squareFeetToArea(c.netAreaSquareFeet, au))} ${areaLabel(au)}`,
    `Tile size: ${n(input.tileLength)} x ${n(input.tileWidth)} ${input.tileUnit}`,
    `Grout gap: ${n(input.groutGap, 3)} ${input.groutUnit}`,
    `Pattern: ${patternLabel(input.pattern)}`,
    `Waste: ${input.wastePercent}%`,
    `Required tiles: ${c.requiredTiles}`,
    ...(c.boxesRequired === undefined ? [] : [`Boxes required: ${c.boxesRequired}`]),
    ...(c.purchasedTiles === undefined
      ? []
      : [`Purchased tiles: ${c.purchasedTiles}`, `Extra tiles: ${c.extraTiles}`]),
    ...(input.boxMode === 'coverage' && input.manufacturerCoverage !== undefined
      ? [
          `Manufacturer coverage: ${n(input.manufacturerCoverage)} ${areaLabel(input.manufacturerCoverageUnit)}/box`,
          `Purchased coverage: ${n(squareFeetToArea(c.purchasedCoverageSquareFeet!, input.manufacturerCoverageUnit))} ${areaLabel(input.manufacturerCoverageUnit)}`,
        ]
      : []),
    ...(c.estimatedCost === undefined
      ? []
      : [`Estimated material cost: ${formatMoney(c.estimatedCost, input.currency)}`]),
    TILE_URL,
  ].join('\n');
}
