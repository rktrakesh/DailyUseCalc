import type { AreaUnit, LengthUnit, VolumeUnit } from '../../../lib/units/measurements';
import type { CurrencyCode } from './currencies';

export type MeasurementSystem = 'imperial' | 'metric';
export type AreaShape = 'rectangle' | 'circle';
export type ProjectSizeMode = 'dimensions' | 'area' | 'volume';
export type ProjectType =
  'driveway' | 'walkway' | 'patio' | 'landscaping' | 'french-drain' | 'shed-base' | 'other';
export type GravelType =
  'crushed-stone' | 'pea-gravel' | 'river-rock' | 'limestone' | 'granite' | 'custom';

export interface DimensionInput {
  value: number;
  unit: LengthUnit;
}

export interface GravelInput {
  inputMode: ProjectSizeMode;
  areaShape: AreaShape;
  projectType: ProjectType;
  gravelType: GravelType;
  length: DimensionInput;
  width: DimensionInput;
  diameter: DimensionInput;
  depth: DimensionInput;
  knownArea: { value: number; unit: AreaUnit };
  knownVolume: { value: number; unit: VolumeUnit };
  currency: CurrencyCode;
  allowancePercent: number;
  customDensityTonsPerYard?: number;
  pricePerCubicYard?: number;
  deliveryFee?: number;
  bagSizeCubicFeet?: number;
  bagPrice?: number;
  truckCapacityCubicYards?: number;
}

export interface ValidationIssue {
  field: keyof GravelInput | 'customDensityTonsPerYard';
  message: string;
}

export interface GravelCalculation {
  surfaceAreaSquareFeet: number;
  volumeCubicFeet: number;
  volumeCubicYards: number;
  volumeCubicMeters: number;
  allowanceVolumeCubicYards: number;
  adjustedVolumeCubicYards: number;
  densityTonsPerYard: number;
  estimatedWeightTons: number;
  estimatedWeightKilograms: number;
  recommendedOrderCubicYards: number;
  bagCount?: number;
  estimatedCost?: number;
  truckLoads?: number;
}

export interface GravelRecommendation {
  depthGuidance: string;
  materialGuidance: string;
  warnings: string[];
  explanation: string;
}
