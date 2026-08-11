import {
  cubicFeetToCubicMeters,
  cubicFeetToCubicYards,
  toFeet,
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

export function calculateGravel(input: GravelInput): GravelCalculation {
  const lengthFeet = toFeet(input.length.value, input.length.unit);
  const widthFeet = toFeet(input.width.value, input.width.unit);
  const depthFeet = toFeet(input.depth.value, input.depth.unit);
  const surfaceAreaSquareFeet = lengthFeet * widthFeet;
  const volumeCubicFeet = surfaceAreaSquareFeet * depthFeet;
  const volumeCubicYards = cubicFeetToCubicYards(volumeCubicFeet);
  const allowanceVolumeCubicYards = volumeCubicYards * (input.allowancePercent / 100);
  const adjustedVolumeCubicYards = volumeCubicYards + allowanceVolumeCubicYards;
  const densityTonsPerYard = densityForGravel(input);
  const recommendedOrder = recommendedOrderCubicYards(adjustedVolumeCubicYards);
  const estimatedWeightTons = adjustedVolumeCubicYards * densityTonsPerYard;
  const bagCount = input.bagSizeCubicFeet
    ? Math.ceil((volumeCubicFeet * (1 + input.allowancePercent / 100)) / input.bagSizeCubicFeet)
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
