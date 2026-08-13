import type { LengthUnit } from '../../../lib/units/measurements';
import type { CurrencyCode } from '../gravel/currencies';

export type MeasurementSystem = 'imperial' | 'metric';
export type MeasureMode = 'dimensions' | 'area';
export type TopsoilShape = 'rectangle' | 'square' | 'circle' | 'triangle' | 'trapezoid' | 'ring';
export type ProjectType =
  | 'garden-bed'
  | 'new-lawn'
  | 'topdressing'
  | 'raised-bed'
  | 'flower-bed'
  | 'vegetable-garden'
  | 'landscaping'
  | 'other';
export type SoilType = 'screened' | 'unscreened' | 'compost-blend' | 'garden-soil' | 'other';
export type AreaUnit = 'sq-ft' | 'sq-yd' | 'sq-m';
export type BagVolumeUnit = 'cu-ft' | 'liter';
export type DensityUnit = 'lb-cu-yd' | 'kg-cu-m';

export interface Dimension {
  value: number;
  unit: LengthUnit;
}
export interface TopsoilInput {
  projectType: ProjectType;
  measureMode: MeasureMode;
  shape: TopsoilShape;
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
  quantity: number;
  soilType: SoilType;
  allowancePercent: number;
  bagVolume?: number;
  bagVolumeUnit: BagVolumeUnit;
  bulkIncrement?: number;
  bulkIncrementUnit: 'cu-yd' | 'cu-m';
  supplierDensity?: number;
  densityUnit: DensityUnit;
  pricePerBag?: number;
  bulkUnitPrice?: number;
  currency: CurrencyCode;
}

export interface WeightConversions {
  pounds: number;
  kilograms: number;
  usTons: number;
  longTons: number;
  metricTonnes: number;
}

export interface TopsoilCalculation {
  areaPerItemSquareFeet: number;
  totalAreaSquareFeet: number;
  baseCubicFeet: number;
  allowanceCubicFeet: number;
  requiredCubicFeet: number;
  requiredCubicYards: number;
  requiredCubicMeters: number;
  requiredLiters: number;
  coveragePerCubicYardSquareFeet: number;
  coveragePerCubicMeterSquareMeters: number;
  bagVolumeCubicFeet?: number;
  bagsRequired?: number;
  purchasedBagCubicFeet?: number;
  bagLeftoverCubicFeet?: number;
  bagCost?: number;
  bulkOrderCubicYards: number;
  bulkOrderCubicMeters: number;
  bulkLeftoverCubicYards: number;
  bulkCost?: number;
  requiredWeight?: WeightConversions;
  orderedWeight?: WeightConversions;
}

export interface ValidationIssue {
  field: keyof TopsoilInput | 'geometry';
  message: string;
}
