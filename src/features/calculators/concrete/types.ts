import type { LengthUnit } from '../../../lib/units/measurements';
import type { CurrencyCode } from '../gravel/currencies';

export type ConcreteMode = 'slab' | 'circular-pad' | 'column' | 'post-hole';
export type MeasurementSystem = 'imperial' | 'metric';
export type ConcreteBagPresetId = '40-lb' | '50-lb' | '60-lb' | '80-lb' | '30-kg' | 'custom';
export type ConcreteBagWeightUnit = 'lb' | 'kg';
export type ConcreteBagYieldUnit = 'ft³' | 'L';

export interface DimensionInput {
  value: number;
  unit: LengthUnit;
}

export interface ConcreteInput {
  concreteMode: ConcreteMode;
  length: DimensionInput;
  width: DimensionInput;
  diameter: DimensionInput;
  thickness: DimensionInput;
  height: DimensionInput;
  holeDiameter: DimensionInput;
  holeDepth: DimensionInput;
  quantity: number;
  allowancePercent: number;
  currency: CurrencyCode;
  readyMixPricePerCubicYard?: number;
  readyMixDeliveryFee?: number;
  bagPreset: ConcreteBagPresetId;
  customBagWeight?: number;
  customBagWeightUnit: ConcreteBagWeightUnit;
  customBagYieldCubicFeet?: number;
  customBagYieldUnit: ConcreteBagYieldUnit;
  bagPrice?: number;
}

export interface ConcreteCalculation {
  surfaceAreaSquareFeet?: number;
  volumeCubicFeet: number;
  volumeCubicYards: number;
  volumeCubicMeters: number;
  allowanceVolumeCubicYards: number;
  adjustedVolumeCubicYards: number;
  recommendedOrderCubicYards: number;
  densityPoundsPerCubicFoot: number;
  estimatedWeightPounds: number;
  estimatedWeightKilograms: number;
  bagYieldCubicFeet: number;
  bagCount: number;
  estimatedReadyMixCost?: number;
  estimatedBagCost?: number;
}

export interface ConcreteRecommendation {
  modeGuidance: string;
  supplierGuidance: string;
  warnings: string[];
  explanation: string;
}

export interface ConcreteValidationIssue {
  field: keyof ConcreteInput;
  message: string;
}
