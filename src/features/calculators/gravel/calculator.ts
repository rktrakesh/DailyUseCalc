import {
  cubicFeetToCubicMeters,
  cubicFeetToCubicYards,
  areaToSquareFeet,
  toFeet,
  volumeToCubicFeet,
} from '../../../lib/units/measurements';
import type { GravelCalculation, GravelInput, GravelType } from './types';

const DENSITY_TONS_PER_YARD: Record<Exclude<GravelType, 'custom'>, number> = {
  'crushed-stone': 1.4,
  'pea-gravel': 1.3,
  'river-rock': 1.35,
  limestone: 1.45,
  granite: 1.5,
};

const KILOGRAMS_PER_US_TON = 907.18474;
const TENTHS_PER_CUBIC_YARD = 10;

export function densityForGravel(input: GravelInput): number {
  if (input.gravelType === 'custom') return input.customDensityTonsPerYard ?? 0;
  return DENSITY_TONS_PER_YARD[input.gravelType];
}

export function recommendedOrderCubicYards(adjustedVolumeCubicYards: number): number {
  const scaledVolume = adjustedVolumeCubicYards * TENTHS_PER_CUBIC_YARD;
  const floatingPointTolerance = Number.EPSILON * Math.max(1, Math.abs(scaledVolume)) * 10;
  return Math.ceil(scaledVolume - floatingPointTolerance) / TENTHS_PER_CUBIC_YARD;
}

export function adjustedVolumeConversions(adjustedVolumeCubicYards: number) {
  const cubicFeet = adjustedVolumeCubicYards * 27;
  const cubicMeters = cubicFeetToCubicMeters(cubicFeet);
  return {
    cubicYards: adjustedVolumeCubicYards,
    cubicFeet,
    cubicMeters,
    liters: cubicMeters * 1_000,
  };
}

export function requiredWholeBags(
  requiredVolumeCubicFeet: number,
  bagVolumeCubicFeet: number,
): number {
  const exactBagCount = requiredVolumeCubicFeet / bagVolumeCubicFeet;
  const floatingPointTolerance = Number.EPSILON * Math.max(1, Math.abs(exactBagCount)) * 10;
  return Math.ceil(exactBagCount - floatingPointTolerance);
}

export function calculateSurfaceAreaSquareFeet(input: GravelInput): number {
  if (input.inputMode === 'volume') return 0;
  if (input.inputMode === 'area')
    return areaToSquareFeet(input.knownArea.value, input.knownArea.unit);
  if (input.areaShape === 'circle') {
    const diameterFeet = toFeet(input.diameter.value, input.diameter.unit);
    return Math.PI * (diameterFeet / 2) ** 2;
  }
  return (
    toFeet(input.length.value, input.length.unit) * toFeet(input.width.value, input.width.unit)
  );
}

export function calculateGravel(input: GravelInput): GravelCalculation {
  const depthFeet = toFeet(input.depth.value, input.depth.unit);
  const surfaceAreaSquareFeet = calculateSurfaceAreaSquareFeet(input);
  const volumeCubicFeet =
    input.inputMode === 'volume'
      ? volumeToCubicFeet(input.knownVolume.value, input.knownVolume.unit)
      : surfaceAreaSquareFeet * depthFeet;
  const volumeCubicYards = cubicFeetToCubicYards(volumeCubicFeet);
  const allowanceVolumeCubicYards = volumeCubicYards * (input.allowancePercent / 100);
  const adjustedVolumeCubicYards = volumeCubicYards + allowanceVolumeCubicYards;
  const densityTonsPerYard = densityForGravel(input);
  const recommendedOrder = recommendedOrderCubicYards(adjustedVolumeCubicYards);
  const estimatedWeightTons = adjustedVolumeCubicYards * densityTonsPerYard;
  const bagCount = input.bagSizeCubicFeet
    ? requiredWholeBags(
        volumeCubicFeet * (1 + input.allowancePercent / 100),
        input.bagSizeCubicFeet,
      )
    : undefined;
  const estimatedCost =
    input.pricePerCubicYard !== undefined
      ? recommendedOrder * input.pricePerCubicYard + (input.deliveryFee ?? 0)
      : input.bagPrice !== undefined && bagCount !== undefined
        ? bagCount * input.bagPrice + (input.deliveryFee ?? 0)
        : undefined;
  const truckLoads = input.truckCapacityCubicYards
    ? Math.ceil(recommendedOrder / input.truckCapacityCubicYards)
    : undefined;

  return {
    surfaceAreaSquareFeet,
    volumeCubicFeet,
    volumeCubicYards,
    volumeCubicMeters: cubicFeetToCubicMeters(volumeCubicFeet),
    allowanceVolumeCubicYards,
    adjustedVolumeCubicYards,
    densityTonsPerYard,
    estimatedWeightTons,
    estimatedWeightKilograms: estimatedWeightTons * KILOGRAMS_PER_US_TON,
    recommendedOrderCubicYards: recommendedOrder,
    bagCount,
    estimatedCost,
    truckLoads,
  };
}
