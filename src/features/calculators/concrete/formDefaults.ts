import type { CurrencyCode } from '../gravel/currencies';
import type { ConcreteInput } from './types';

export function createDefaultConcreteInput(currency: CurrencyCode = 'USD'): ConcreteInput {
  return {
    concreteMode: 'slab',
    length: { value: 20, unit: 'ft' },
    width: { value: 10, unit: 'ft' },
    diameter: { value: 10, unit: 'ft' },
    thickness: { value: 4, unit: 'in' },
    height: { value: 8, unit: 'ft' },
    holeDiameter: { value: 12, unit: 'in' },
    holeDepth: { value: 3, unit: 'ft' },
    quantity: 1,
    allowancePercent: 10,
    currency,
    bagPreset: '80-lb',
  };
}

export function createClearedConcreteInput(currency: CurrencyCode): ConcreteInput {
  const cleared = createDefaultConcreteInput(currency);
  return {
    ...cleared,
    length: { value: Number.NaN, unit: 'ft' },
    width: { value: Number.NaN, unit: 'ft' },
    diameter: { value: Number.NaN, unit: 'ft' },
    thickness: { value: Number.NaN, unit: 'in' },
    height: { value: Number.NaN, unit: 'ft' },
    holeDiameter: { value: Number.NaN, unit: 'in' },
    holeDepth: { value: Number.NaN, unit: 'ft' },
    quantity: 1,
    allowancePercent: 10,
  };
}
