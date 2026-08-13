import type { CurrencyCode } from '../gravel/currencies';
import type { TileInput } from './types';

export function createDefaultTileInput(currency: CurrencyCode = 'USD'): TileInput {
  return {
    projectType: 'floor',
    measureMode: 'dimensions',
    shape: 'rectangle',
    measurementSystem: 'imperial',
    length: { value: 10, unit: 'ft' },
    width: { value: 12, unit: 'ft' },
    side: { value: 10, unit: 'ft' },
    diameter: { value: 10, unit: 'ft' },
    base: { value: 10, unit: 'ft' },
    perpendicularHeight: { value: 8, unit: 'ft' },
    sideA: { value: 8, unit: 'ft' },
    sideB: { value: 12, unit: 'ft' },
    outerDiameter: { value: 12, unit: 'ft' },
    innerDiameter: { value: 4, unit: 'ft' },
    knownArea: 120,
    areaUnit: 'sq-ft',
    quantity: 1,
    tileLength: Number.NaN,
    tileWidth: Number.NaN,
    tileUnit: 'in',
    groutGap: 0,
    groutUnit: 'in',
    pattern: 'straight',
    wastePercent: 10,
    excludedAreaUnit: 'sq-ft',
    boxMode: 'tiles',
    manufacturerCoverageUnit: 'sq-ft',
    priceBasis: 'tile',
    currency,
  };
}

export function createClearedTileInput(currency: CurrencyCode): TileInput {
  const input = createDefaultTileInput(currency);
  const empty = { value: Number.NaN, unit: 'ft' as const };
  return {
    ...input,
    length: empty,
    width: empty,
    side: empty,
    diameter: empty,
    base: empty,
    perpendicularHeight: empty,
    sideA: empty,
    sideB: empty,
    outerDiameter: empty,
    innerDiameter: empty,
    knownArea: Number.NaN,
    tileLength: Number.NaN,
    tileWidth: Number.NaN,
    excludedArea: undefined,
    tilesPerBox: undefined,
    manufacturerCoverage: undefined,
    price: undefined,
  };
}
