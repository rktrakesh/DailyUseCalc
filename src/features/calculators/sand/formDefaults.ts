import type { CurrencyCode } from '../gravel/currencies';
import type { SandInput } from './types';

export function createDefaultSandInput(currency: CurrencyCode = 'USD'): SandInput {
  return {
    projectType: 'paver-bedding',
    measureMode: 'dimensions',
    shape: 'rectangle',
    measurementSystem: 'imperial',
    length: { value: 20, unit: 'ft' },
    width: { value: 10, unit: 'ft' },
    side: { value: 10, unit: 'ft' },
    diameter: { value: 10, unit: 'ft' },
    base: { value: 20, unit: 'ft' },
    perpendicularHeight: { value: 10, unit: 'ft' },
    sideA: { value: 10, unit: 'ft' },
    sideB: { value: 20, unit: 'ft' },
    outerDiameter: { value: 12, unit: 'ft' },
    innerDiameter: { value: 4, unit: 'ft' },
    depth: { value: 3, unit: 'in' },
    knownArea: 200,
    areaUnit: 'sq-ft',
    quantity: 1,
    sandType: 'all-purpose',
    allowancePercent: 5,
    compactionPercent: 0,
    densityUnit: 'lb-cu-yd',
    bagBasis: 'weight',
    bagUnit: 'lb',
    bulkBasis: 'volume',
    bulkUnit: 'cu-yd',
    currency,
  };
}

export function createClearedSandInput(currency: CurrencyCode): SandInput {
  const input = createDefaultSandInput(currency);
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
    depth: { value: Number.NaN, unit: 'in' },
    knownArea: Number.NaN,
    quantity: 1,
    allowancePercent: 5,
    compactionPercent: 0,
    supplierDensity: undefined,
    bagSize: undefined,
    pricePerBag: undefined,
    bulkIncrement: undefined,
    bulkUnitPrice: undefined,
  };
}
