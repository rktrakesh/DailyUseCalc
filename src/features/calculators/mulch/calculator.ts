import { toFeet } from '../../../lib/units/measurements';
import {
  normalizeNumericalLeftover,
  requiredWholeUnits,
  roundUpToIncrement,
} from '../../../lib/calculators/rounding';
import type { MulchCalculation, MulchInput } from './types';

const LITERS_PER_CUBIC_FOOT = 28.316846592;
const CUBIC_FEET_PER_CUBIC_METER = 35.3146667215;
const areaFeet = (input: MulchInput) => {
  if (input.measureMode === 'area') {
    if (input.areaUnit === 'sq-yd') return input.knownArea * 9;
    if (input.areaUnit === 'sq-m') return input.knownArea * 10.7639104167;
    return input.knownArea;
  }
  const f = (d: MulchInput['length']) => toFeet(d.value, d.unit);
  switch (input.shape) {
    case 'square':
      return f(input.side) ** 2;
    case 'circle':
      return Math.PI * (f(input.diameter) / 2) ** 2;
    case 'triangle':
      return (f(input.base) * f(input.perpendicularHeight)) / 2;
    case 'trapezoid':
      return ((f(input.sideA) + f(input.sideB)) / 2) * f(input.perpendicularHeight);
    case 'ring':
      return Math.PI * ((f(input.outerDiameter) / 2) ** 2 - (f(input.innerDiameter) / 2) ** 2);
    default:
      return f(input.length) * f(input.width);
  }
};

export function calculateMulch(input: MulchInput): MulchCalculation {
  const areaSquareFeet = areaFeet(input);
  const baseCubicFeet = areaSquareFeet * toFeet(input.depth.value, input.depth.unit);
  const allowanceCubicFeet = baseCubicFeet * (input.allowancePercent / 100);
  const requiredCubicFeet = baseCubicFeet + allowanceCubicFeet;
  const requiredCubicYards = requiredCubicFeet / 27;
  const requiredCubicMeters = requiredCubicFeet / CUBIC_FEET_PER_CUBIC_METER;
  const requiredLiters = requiredCubicFeet * LITERS_PER_CUBIC_FOOT;
  const bagVolumeCubicFeet =
    input.bagVolume === undefined
      ? undefined
      : input.bagVolumeUnit === 'liter'
        ? input.bagVolume / LITERS_PER_CUBIC_FOOT
        : input.bagVolume;
  const bagsRequired = bagVolumeCubicFeet
    ? requiredWholeUnits(requiredCubicFeet, bagVolumeCubicFeet)
    : undefined;
  const purchasedBagCubicFeet =
    bagsRequired === undefined ? undefined : bagsRequired * bagVolumeCubicFeet!;
  const bulkOrderCubicYards = input.bulkIncrementCubicYards
    ? roundUpToIncrement(requiredCubicYards, input.bulkIncrementCubicYards)
    : requiredCubicYards;
  return {
    areaSquareFeet,
    baseCubicFeet,
    allowanceCubicFeet,
    requiredCubicFeet,
    requiredCubicYards,
    requiredCubicMeters,
    requiredLiters,
    bagVolumeCubicFeet,
    bagsRequired,
    purchasedBagCubicFeet,
    bagLeftoverCubicFeet:
      purchasedBagCubicFeet === undefined
        ? undefined
        : normalizeNumericalLeftover(purchasedBagCubicFeet, requiredCubicFeet),
    bagCost:
      bagsRequired !== undefined && input.pricePerBag !== undefined
        ? bagsRequired * input.pricePerBag
        : undefined,
    bulkOrderCubicYards,
    bulkLeftoverCubicYards: normalizeNumericalLeftover(bulkOrderCubicYards, requiredCubicYards),
    bulkCost:
      input.bulkPricePerCubicYard === undefined
        ? undefined
        : bulkOrderCubicYards * input.bulkPricePerCubicYard,
  };
}
