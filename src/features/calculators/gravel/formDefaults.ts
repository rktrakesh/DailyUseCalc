import type { CurrencyCode } from './currencies';
import type { GravelInput } from './types';

export function createDefaultGravelInput(currency: CurrencyCode = 'USD'): GravelInput {
  return {
    inputMode: 'dimensions',
    areaShape: 'rectangle',
    projectType: 'driveway',
    gravelType: 'crushed-stone',
    length: { value: 20, unit: 'ft' },
    width: { value: 15, unit: 'ft' },
    diameter: { value: 20, unit: 'ft' },
    depth: { value: 3, unit: 'in' },
    knownArea: { value: 300, unit: 'ft²' },
    knownVolume: { value: 3, unit: 'yd³' },
    currency,
    allowancePercent: 0,
    pricePerCubicYard: undefined,
    deliveryFee: undefined,
    bagSizeCubicFeet: undefined,
    bagPrice: undefined,
    truckCapacityCubicYards: undefined,
  };
}

export function createClearedGravelInput(currency: CurrencyCode): GravelInput {
  return {
    ...createDefaultGravelInput(currency),
    length: { value: Number.NaN, unit: 'ft' },
    width: { value: Number.NaN, unit: 'ft' },
    diameter: { value: Number.NaN, unit: 'ft' },
    depth: { value: Number.NaN, unit: 'in' },
    knownArea: { value: Number.NaN, unit: 'ft²' },
    knownVolume: { value: Number.NaN, unit: 'yd³' },
  };
}
