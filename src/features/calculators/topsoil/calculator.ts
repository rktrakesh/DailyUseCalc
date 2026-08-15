import { toFeet } from '../../../lib/units/measurements';
import {
  normalizeNumericalLeftover,
  requiredWholeUnits,
  roundUpToIncrement,
} from '../../../lib/calculators/rounding';
import type { TopsoilCalculation, TopsoilInput, WeightConversions } from './types';

export const LITERS_PER_CUBIC_FOOT = 28.316846592;
export const CUBIC_FEET_PER_CUBIC_METER = 35.3146667215;
export const CUBIC_METERS_PER_CUBIC_YARD = 0.764554857984;
export const POUNDS_PER_KILOGRAM = 2.20462262185;

function areaPerItem(input: TopsoilInput) {
  if (input.measureMode === 'area') {
    if (input.areaUnit === 'sq-yd') return input.knownArea * 9;
    if (input.areaUnit === 'sq-m') return input.knownArea * 10.7639104167;
    return input.knownArea;
  }
  const feet = (dimension: TopsoilInput['length']) => toFeet(dimension.value, dimension.unit);
  switch (input.shape) {
    case 'square':
      return feet(input.side) ** 2;
    case 'circle':
      return Math.PI * (feet(input.diameter) / 2) ** 2;
    case 'triangle':
      return (feet(input.base) * feet(input.perpendicularHeight)) / 2;
    case 'trapezoid':
      return ((feet(input.sideA) + feet(input.sideB)) / 2) * feet(input.perpendicularHeight);
    case 'ring':
      return (
        Math.PI * ((feet(input.outerDiameter) / 2) ** 2 - (feet(input.innerDiameter) / 2) ** 2)
      );
    default:
      return feet(input.length) * feet(input.width);
  }
}

function weightsFromPounds(pounds: number): WeightConversions {
  const kilograms = pounds / POUNDS_PER_KILOGRAM;
  return {
    pounds,
    kilograms,
    usTons: pounds / 2000,
    longTons: pounds / 2240,
    metricTonnes: kilograms / 1000,
  };
}

export function calculateTopsoil(input: TopsoilInput): TopsoilCalculation {
  const areaPerItemSquareFeet = areaPerItem(input);
  const totalAreaSquareFeet = areaPerItemSquareFeet * input.quantity;
  const depthFeet = toFeet(input.depth.value, input.depth.unit);
  const baseCubicFeet = totalAreaSquareFeet * depthFeet;
  const allowanceCubicFeet = (baseCubicFeet * input.allowancePercent) / 100;
  const requiredCubicFeet = baseCubicFeet + allowanceCubicFeet;
  const requiredCubicYards = requiredCubicFeet / 27;
  const requiredCubicMeters = requiredCubicFeet / CUBIC_FEET_PER_CUBIC_METER;
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
  const incrementCubicYards =
    input.bulkIncrement === undefined
      ? undefined
      : input.bulkIncrementUnit === 'cu-m'
        ? input.bulkIncrement / CUBIC_METERS_PER_CUBIC_YARD
        : input.bulkIncrement;
  const bulkOrderCubicYards = incrementCubicYards
    ? roundUpToIncrement(requiredCubicYards, incrementCubicYards)
    : requiredCubicYards;
  const densityPoundsPerCubicYard =
    input.supplierDensity === undefined
      ? undefined
      : input.densityUnit === 'kg-cu-m'
        ? input.supplierDensity * POUNDS_PER_KILOGRAM * CUBIC_METERS_PER_CUBIC_YARD
        : input.supplierDensity;
  return {
    areaPerItemSquareFeet,
    totalAreaSquareFeet,
    baseCubicFeet,
    allowanceCubicFeet,
    requiredCubicFeet,
    requiredCubicYards,
    requiredCubicMeters,
    requiredLiters: requiredCubicFeet * LITERS_PER_CUBIC_FOOT,
    coveragePerCubicYardSquareFeet: 27 / depthFeet,
    coveragePerCubicMeterSquareMeters: 1 / (depthFeet / 3.280839895),
    bagVolumeCubicFeet,
    bagsRequired,
    purchasedBagCubicFeet,
    bagLeftoverCubicFeet:
      purchasedBagCubicFeet === undefined
        ? undefined
        : normalizeNumericalLeftover(purchasedBagCubicFeet, requiredCubicFeet, bagVolumeCubicFeet!),
    bagCost:
      bagsRequired !== undefined && input.pricePerBag !== undefined
        ? bagsRequired * input.pricePerBag
        : undefined,
    bulkOrderCubicYards,
    bulkOrderCubicMeters: bulkOrderCubicYards * CUBIC_METERS_PER_CUBIC_YARD,
    bulkLeftoverCubicYards: normalizeNumericalLeftover(
      bulkOrderCubicYards,
      requiredCubicYards,
      incrementCubicYards ?? 1,
    ),
    bulkCost:
      input.bulkUnitPrice === undefined
        ? undefined
        : input.bulkUnitPrice *
          (input.measurementSystem === 'metric'
            ? bulkOrderCubicYards * CUBIC_METERS_PER_CUBIC_YARD
            : bulkOrderCubicYards),
    requiredWeight:
      densityPoundsPerCubicYard === undefined
        ? undefined
        : weightsFromPounds(requiredCubicYards * densityPoundsPerCubicYard),
    orderedWeight:
      densityPoundsPerCubicYard === undefined
        ? undefined
        : weightsFromPounds(bulkOrderCubicYards * densityPoundsPerCubicYard),
  };
}
