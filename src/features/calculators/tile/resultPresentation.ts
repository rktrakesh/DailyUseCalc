import { squareFeetToArea } from './calculator';
import type { TileCalculation, TileInput } from './types';

export interface TileResultMetric {
  label: string;
  value: string;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);

export function createTilePurchasingMetrics(
  input: TileInput,
  result: TileCalculation,
): TileResultMetric[] {
  if (result.boxesRequired === undefined) return [];

  if (input.boxMode === 'coverage') {
    const areaUnit = input.measurementSystem === 'metric' ? 'sq-m' : 'sq-ft';
    const unitLabel = input.measurementSystem === 'metric' ? 'sq m' : 'sq ft';
    const area = (squareFeet: number) =>
      `${formatNumber(squareFeetToArea(squareFeet, areaUnit))} ${unitLabel}`;

    return [
      {
        label: 'Purchasing coverage required',
        value: area(result.wasteAdjustedCoverageSquareFeet),
      },
      { label: 'Boxes required', value: String(result.boxesRequired) },
      { label: 'Coverage purchased', value: area(result.purchasedCoverageSquareFeet!) },
      { label: 'Extra coverage', value: area(result.extraPurchasedCoverageSquareFeet!) },
    ];
  }

  return [
    { label: 'Boxes required', value: String(result.boxesRequired) },
    { label: 'Tiles purchased', value: String(result.purchasedTiles) },
    { label: 'Extra tiles', value: String(result.extraTiles) },
  ];
}
