import { toFeet } from '../../../lib/units/measurements';
import type {
  BagUnit,
  BulkUnit,
  DensityUnit,
  SandCalculation,
  SandInput,
  WeightConversions,
} from './types';

export const LITERS_PER_CUBIC_FOOT = 28.316846592;
export const CUBIC_FEET_PER_CUBIC_METER = 35.3146667215;
export const CUBIC_METERS_PER_CUBIC_YARD = 0.764554857984;
export const POUNDS_PER_KILOGRAM = 2.2046226218487757;
export const ESTIMATED_DENSITY_LB_PER_CU_YD = 2700;

function areaPerItem(input: SandInput) {
  if (input.measureMode === 'area') {
    const factors = {
      'sq-in': 1 / 144,
      'sq-ft': 1,
      'sq-yd': 9,
      'sq-cm': 0.00107639104167,
      'sq-m': 10.7639104167,
    };
    return input.knownArea * factors[input.areaUnit];
  }
  const feet = (dimension: SandInput['length']) => toFeet(dimension.value, dimension.unit);
  if (input.shape === 'square') return feet(input.side) ** 2;
  if (input.shape === 'circle') return Math.PI * (feet(input.diameter) / 2) ** 2;
  if (input.shape === 'triangle') return (feet(input.base) * feet(input.perpendicularHeight)) / 2;
  if (input.shape === 'trapezoid')
    return ((feet(input.sideA) + feet(input.sideB)) / 2) * feet(input.perpendicularHeight);
  if (input.shape === 'ring')
    return Math.PI * ((feet(input.outerDiameter) / 2) ** 2 - (feet(input.innerDiameter) / 2) ** 2);
  return feet(input.length) * feet(input.width);
}

export function weightsFromPounds(pounds: number): WeightConversions {
  const kilograms = pounds / POUNDS_PER_KILOGRAM;
  return {
    pounds,
    kilograms,
    usTons: pounds / 2000,
    longTons: pounds / 2240,
    metricTonnes: kilograms / 1000,
  };
}

export function densityToPoundsPerCubicYard(value: number, unit: DensityUnit) {
  if (unit === 'lb-cu-ft') return value * 27;
  if (unit === 'kg-cu-m') return value * POUNDS_PER_KILOGRAM * CUBIC_METERS_PER_CUBIC_YARD;
  if (unit === 'tonne-cu-m')
    return value * 1000 * POUNDS_PER_KILOGRAM * CUBIC_METERS_PER_CUBIC_YARD;
  return value;
}

function weightUnitPounds(unit: BagUnit | BulkUnit) {
  if (unit === 'kg') return POUNDS_PER_KILOGRAM;
  if (unit === 'us-ton') return 2000;
  if (unit === 'metric-tonne') return 1000 * POUNDS_PER_KILOGRAM;
  return 1;
}
function volumeUnitCubicFeet(unit: BagUnit | BulkUnit) {
  if (unit === 'cu-yd') return 27;
  if (unit === 'cu-m') return CUBIC_FEET_PER_CUBIC_METER;
  if (unit === 'liter') return 1 / LITERS_PER_CUBIC_FOOT;
  return 1;
}
function requiredInBulkUnit(input: SandInput, cubicFeet: number, pounds: number) {
  return input.bulkBasis === 'weight'
    ? pounds / weightUnitPounds(input.bulkUnit)
    : cubicFeet / volumeUnitCubicFeet(input.bulkUnit);
}

export function calculateSand(input: SandInput): SandCalculation {
  const areaPerItemSquareFeet = areaPerItem(input);
  const totalAreaSquareFeet = areaPerItemSquareFeet * input.quantity;
  const depthFeet = toFeet(input.depth.value, input.depth.unit);
  const baseCubicFeet = totalAreaSquareFeet * depthFeet;
  const allowanceCubicFeet = (baseCubicFeet * input.allowancePercent) / 100;
  const compactionCubicFeet = (baseCubicFeet * input.compactionPercent) / 100;
  const requiredCubicFeet = baseCubicFeet + allowanceCubicFeet + compactionCubicFeet;
  const requiredCubicYards = requiredCubicFeet / 27;
  const densityPoundsPerCubicYard =
    input.supplierDensity === undefined
      ? ESTIMATED_DENSITY_LB_PER_CU_YD
      : densityToPoundsPerCubicYard(input.supplierDensity, input.densityUnit);
  const requiredWeight = weightsFromPounds(requiredCubicYards * densityPoundsPerCubicYard);

  const bagBase =
    input.bagSize === undefined
      ? undefined
      : input.bagBasis === 'weight'
        ? requiredWeight.pounds / (input.bagSize * weightUnitPounds(input.bagUnit))
        : requiredCubicFeet / (input.bagSize * volumeUnitCubicFeet(input.bagUnit));
  const bagsRequired = bagBase === undefined ? undefined : Math.ceil(bagBase - 1e-10);
  const bagPurchasedAmount = bagsRequired === undefined ? undefined : bagsRequired * input.bagSize!;
  const bagRequiredSelected =
    input.bagBasis === 'weight'
      ? requiredWeight.pounds / weightUnitPounds(input.bagUnit)
      : requiredCubicFeet / volumeUnitCubicFeet(input.bagUnit);

  const bulkRequiredAmount = requiredInBulkUnit(input, requiredCubicFeet, requiredWeight.pounds);
  const bulkOrderAmount =
    input.bulkIncrement === undefined
      ? bulkRequiredAmount
      : Math.ceil((bulkRequiredAmount - 1e-12) / input.bulkIncrement) * input.bulkIncrement;
  const orderedPounds =
    input.bulkBasis === 'weight'
      ? bulkOrderAmount * weightUnitPounds(input.bulkUnit)
      : ((bulkOrderAmount * volumeUnitCubicFeet(input.bulkUnit)) / 27) * densityPoundsPerCubicYard;

  return {
    areaPerItemSquareFeet,
    totalAreaSquareFeet,
    baseCubicFeet,
    allowanceCubicFeet,
    compactionCubicFeet,
    requiredCubicFeet,
    requiredCubicYards,
    requiredCubicMeters: requiredCubicFeet / CUBIC_FEET_PER_CUBIC_METER,
    requiredLiters: requiredCubicFeet * LITERS_PER_CUBIC_FOOT,
    coveragePerCubicYardSquareFeet: 27 / depthFeet,
    coveragePerCubicMeterSquareMeters: 1 / (depthFeet / 3.280839895),
    densityPoundsPerCubicYard,
    densitySource: input.supplierDensity === undefined ? 'estimated' : 'supplier',
    requiredWeight,
    bagsRequired,
    bagPurchasedAmount,
    bagLeftoverAmount:
      bagPurchasedAmount === undefined
        ? undefined
        : Math.max(0, bagPurchasedAmount - bagRequiredSelected),
    bagCost:
      bagsRequired !== undefined && input.pricePerBag !== undefined
        ? bagsRequired * input.pricePerBag
        : undefined,
    bulkRequiredAmount,
    bulkOrderAmount,
    bulkLeftoverAmount: Math.max(0, bulkOrderAmount - bulkRequiredAmount),
    bulkCost: input.bulkUnitPrice === undefined ? undefined : bulkOrderAmount * input.bulkUnitPrice,
    orderedWeight: weightsFromPounds(orderedPounds),
  };
}
