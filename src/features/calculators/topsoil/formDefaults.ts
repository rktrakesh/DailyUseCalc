import type { CurrencyCode } from '../gravel/currencies';
import type { TopsoilInput } from './types';

export function createDefaultTopsoilInput(currency: CurrencyCode = 'USD'): TopsoilInput {
  return {
    projectType: 'garden-bed',
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
    depth: { value: 4, unit: 'in' },
    knownArea: 200,
    areaUnit: 'sq-ft',
    quantity: 1,
    soilType: 'screened',
    allowancePercent: 5,
    bagVolumeUnit: 'cu-ft',
    bulkIncrementUnit: 'cu-yd',
    densityUnit: 'lb-cu-yd',
    currency,
  };
}

export function createClearedTopsoilInput(currency: CurrencyCode): TopsoilInput {
  const input = createDefaultTopsoilInput(currency);
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
    allowancePercent: 0,
    bagVolume: undefined,
    bulkIncrement: undefined,
    supplierDensity: undefined,
    pricePerBag: undefined,
    bulkUnitPrice: undefined,
  };
}
