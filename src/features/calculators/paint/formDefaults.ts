import type { CurrencyCode } from '../gravel/currencies';
import {
  DEFAULT_ALLOWANCE_PERCENT,
  DEFAULT_FINISH_COATS,
  DEFAULT_PAINT_COVERAGE,
  DEFAULT_PRIMER_COVERAGE,
} from './constants';
import type { PaintInput } from './types';

export function createDefaultPaintInput(currency: CurrencyCode = 'USD'): PaintInput {
  return {
    measurementSystem: 'imperial',
    length: { value: 12, unit: 'ft' },
    width: { value: 10, unit: 'ft' },
    wallHeight: { value: 8, unit: 'ft' },
    roomQuantity: 1,
    includeCeiling: false,
    doorOpenings: {
      quantity: 0,
      width: { value: 3, unit: 'ft' },
      height: { value: 6.67, unit: 'ft' },
    },
    windowOpenings: {
      quantity: 0,
      width: { value: 3, unit: 'ft' },
      height: { value: 4, unit: 'ft' },
    },
    coats: DEFAULT_FINISH_COATS,
    coverageSquareFeetPerGallon: DEFAULT_PAINT_COVERAGE,
    surfaceCondition: 'smooth',
    allowancePercent: DEFAULT_ALLOWANCE_PERCENT,
    currency,
    paintDoors: false,
    paintedDoorQuantity: 1,
    paintedDoorWidth: { value: 3, unit: 'ft' },
    paintedDoorHeight: { value: 6.67, unit: 'ft' },
    paintedDoorSides: 2,
    paintedDoorCoats: 2,
    paintTrim: false,
    trimLength: { value: 44, unit: 'ft' },
    trimWidth: { value: 6, unit: 'in' },
    trimCoats: 2,
    usePrimer: false,
    primerCoats: 1,
    primerCoverageSquareFeetPerGallon: DEFAULT_PRIMER_COVERAGE,
  };
}
export function createClearedPaintInput(currency: CurrencyCode): PaintInput {
  const input = createDefaultPaintInput(currency);
  const empty = { value: Number.NaN, unit: 'ft' as const };
  return {
    ...input,
    length: empty,
    width: empty,
    wallHeight: empty,
    roomQuantity: 1,
    doorOpenings: { ...input.doorOpenings, quantity: 0 },
    windowOpenings: { ...input.windowOpenings, quantity: 0 },
  };
}
