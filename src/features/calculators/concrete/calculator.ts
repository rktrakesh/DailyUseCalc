import { requiredWholeUnits, roundUpToIncrement } from '../../../lib/calculators/rounding';
import {
  cubicFeetToCubicMeters,
  cubicFeetToCubicYards,
  toFeet,
} from '../../../lib/units/measurements';
import { concreteBagPreset } from './bagPresets';
import type { ConcreteCalculation, ConcreteInput } from './types';

export const NORMAL_WEIGHT_CONCRETE_LB_PER_FT3 = 145;
const KG_PER_POUND = 0.45359237;

export function concreteGeometry(input: ConcreteInput) {
  const quantity = input.quantity;
  if (input.concreteMode === 'slab') {
    const singleArea =
      toFeet(input.length.value, input.length.unit) * toFeet(input.width.value, input.width.unit);
    return {
      surfaceAreaSquareFeet: singleArea * quantity,
      volumeCubicFeet: singleArea * toFeet(input.thickness.value, input.thickness.unit) * quantity,
    };
  }
  if (input.concreteMode === 'circular-pad') {
    const radius = toFeet(input.diameter.value, input.diameter.unit) / 2;
    const singleArea = Math.PI * radius ** 2;
    return {
      surfaceAreaSquareFeet: singleArea * quantity,
      volumeCubicFeet: singleArea * toFeet(input.thickness.value, input.thickness.unit) * quantity,
    };
  }
  const diameter = input.concreteMode === 'column' ? input.diameter : input.holeDiameter;
  const vertical = input.concreteMode === 'column' ? input.height : input.holeDepth;
  const radius = toFeet(diameter.value, diameter.unit) / 2;
  return {
    surfaceAreaSquareFeet: undefined,
    volumeCubicFeet: Math.PI * radius ** 2 * toFeet(vertical.value, vertical.unit) * quantity,
  };
}

export function calculateConcrete(input: ConcreteInput): ConcreteCalculation {
  const geometry = concreteGeometry(input);
  const volumeCubicYards = cubicFeetToCubicYards(geometry.volumeCubicFeet);
  const allowanceVolumeCubicYards = (volumeCubicYards * input.allowancePercent) / 100;
  const adjustedVolumeCubicYards = volumeCubicYards + allowanceVolumeCubicYards;
  const adjustedVolumeCubicFeet = adjustedVolumeCubicYards * 27;
  const preset = concreteBagPreset(input.bagPreset);
  const bagYieldCubicFeet =
    input.bagPreset === 'custom' ? input.customBagYieldCubicFeet! : preset.yieldCubicFeet!;
  const bagCount = requiredWholeUnits(adjustedVolumeCubicFeet, bagYieldCubicFeet);
  const recommendedOrderCubicYards = roundUpToIncrement(adjustedVolumeCubicYards, 0.1);
  const estimatedWeightPounds = adjustedVolumeCubicFeet * NORMAL_WEIGHT_CONCRETE_LB_PER_FT3;
  return {
    ...geometry,
    volumeCubicYards,
    volumeCubicMeters: cubicFeetToCubicMeters(geometry.volumeCubicFeet),
    allowanceVolumeCubicYards,
    adjustedVolumeCubicYards,
    recommendedOrderCubicYards,
    densityPoundsPerCubicFoot: NORMAL_WEIGHT_CONCRETE_LB_PER_FT3,
    estimatedWeightPounds,
    estimatedWeightKilograms: estimatedWeightPounds * KG_PER_POUND,
    bagYieldCubicFeet,
    bagCount,
    estimatedReadyMixCost:
      input.readyMixPricePerCubicYard === undefined
        ? undefined
        : recommendedOrderCubicYards * input.readyMixPricePerCubicYard +
          (input.readyMixDeliveryFee ?? 0),
    estimatedBagCost: input.bagPrice === undefined ? undefined : bagCount * input.bagPrice,
  };
}

export function adjustedConcreteVolumeConversions(adjustedVolumeCubicYards: number) {
  const cubicFeet = adjustedVolumeCubicYards * 27;
  const cubicMeters = cubicFeetToCubicMeters(cubicFeet);
  return {
    cubicYards: adjustedVolumeCubicYards,
    cubicFeet,
    cubicMeters,
    liters: cubicMeters * 1000,
  };
}
