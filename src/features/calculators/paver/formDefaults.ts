import type { CurrencyCode } from '../gravel/currencies';
import type { PaverInput } from './types';

export function createDefaultPaverInput(currency: CurrencyCode = 'USD'): PaverInput {
  return {
    projectType: 'patio',
    measureMode: 'dimensions',
    shape: 'rectangle',
    measurementSystem: 'imperial',
    length: { value: Number.NaN, unit: 'ft' },
    width: { value: Number.NaN, unit: 'ft' },
    diameter: { value: Number.NaN, unit: 'ft' },
    knownArea: Number.NaN,
    areaUnit: 'sq-ft',
    paverPreset: '6x9',
    paverLength: 6,
    paverWidth: 9,
    paverUnit: 'in',
    wastePreset: '5',
    wastePercent: 5,
    jointWidth: Number.NaN,
    jointUnit: 'in',
    estimateBase: false,
    baseDepth: { value: Number.NaN, unit: 'in' },
    estimateSand: false,
    sandDepth: { value: Number.NaN, unit: 'in' },
    estimateCost: false,
    currency,
    pricePerPaver: undefined,
  };
}

export function preparePaverInputForSubmission(input: PaverInput): PaverInput {
  return {
    ...input,
    jointWidth: Number.isNaN(input.jointWidth) ? 0 : input.jointWidth,
    estimateBase: !Number.isNaN(input.baseDepth.value),
    estimateSand: !Number.isNaN(input.sandDepth.value),
    estimateCost: input.pricePerPaver !== undefined,
  };
}
