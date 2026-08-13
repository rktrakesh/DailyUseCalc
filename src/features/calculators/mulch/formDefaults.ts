import type { CurrencyCode } from '../gravel/currencies';
import type { MulchInput } from './types';

export function createDefaultMulchInput(currency: CurrencyCode = 'USD'): MulchInput {
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
    depth: { value: 3, unit: 'in' },
    knownArea: 200,
    areaUnit: 'sq-ft',
    mulchType: 'hardwood',
    allowancePercent: 5,
    bagVolume: 2,
    bagVolumeUnit: 'cu-ft',
    bulkIncrementCubicYards: 0.25,
    currency,
  };
}

export function createClearedMulchInput(currency: CurrencyCode) {
  const input = createDefaultMulchInput(currency);
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
    depth: { value: Number.NaN, unit: 'in' as const },
    knownArea: Number.NaN,
    bagVolume: undefined,
    bulkIncrementCubicYards: undefined,
    pricePerBag: undefined,
    bulkPricePerCubicYard: undefined,
    allowancePercent: 0,
  };
}
