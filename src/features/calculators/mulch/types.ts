import type { CurrencyCode } from '../gravel/currencies';
import type { LengthUnit } from '../../../lib/units/measurements';

export type MeasurementSystem = 'imperial' | 'metric';
export type MeasureMode = 'dimensions' | 'area';
export type MulchShape = 'rectangle' | 'square' | 'circle' | 'triangle' | 'trapezoid' | 'ring';
export type ProjectType =
  'garden-bed' | 'trees-shrubs' | 'walkway' | 'play-area' | 'landscaping' | 'other';
export type MulchType =
  'hardwood' | 'bark' | 'wood-chips' | 'cedar' | 'pine-bark' | 'rubber' | 'compost' | 'other';
export type AreaUnit = 'sq-ft' | 'sq-yd' | 'sq-m';
export type BagVolumeUnit = 'cu-ft' | 'liter';

export interface Dimension {
  value: number;
  unit: LengthUnit;
}
export interface MulchInput {
  projectType: ProjectType;
  measureMode: MeasureMode;
  shape: MulchShape;
  measurementSystem: MeasurementSystem;
  length: Dimension;
  width: Dimension;
  side: Dimension;
  diameter: Dimension;
  base: Dimension;
  perpendicularHeight: Dimension;
  sideA: Dimension;
  sideB: Dimension;
  outerDiameter: Dimension;
  innerDiameter: Dimension;
  depth: Dimension;
  knownArea: number;
  areaUnit: AreaUnit;
  mulchType: MulchType;
  allowancePercent: number;
  bagVolume?: number;
  bagVolumeUnit: BagVolumeUnit;
  bulkIncrementCubicYards?: number;
  pricePerBag?: number;
  bulkPricePerCubicYard?: number;
  currency: CurrencyCode;
}

export interface MulchCalculation {
  areaSquareFeet: number;
  baseCubicFeet: number;
  allowanceCubicFeet: number;
  requiredCubicFeet: number;
  requiredCubicYards: number;
  requiredCubicMeters: number;
  requiredLiters: number;
  bagVolumeCubicFeet?: number;
  bagsRequired?: number;
  purchasedBagCubicFeet?: number;
  bagLeftoverCubicFeet?: number;
  bagCost?: number;
  bulkOrderCubicYards: number;
  bulkLeftoverCubicYards: number;
  bulkCost?: number;
}

export interface ValidationIssue {
  field: keyof MulchInput | 'geometry';
  message: string;
}
