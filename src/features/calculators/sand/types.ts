import type { LengthUnit } from '../../../lib/units/measurements';
import type { CurrencyCode } from '../gravel/currencies';

export type MeasurementSystem = 'imperial' | 'metric';
export type MeasureMode = 'dimensions' | 'area';
export type SandShape = 'rectangle' | 'square' | 'circle' | 'triangle' | 'trapezoid' | 'ring';
export type ProjectType =
  | 'paver-bedding'
  | 'sandbox'
  | 'landscaping'
  | 'topdressing'
  | 'pool-base'
  | 'backfill'
  | 'concrete-mortar'
  | 'other';
export type SandType =
  'all-purpose' | 'concrete-sharp' | 'masonry' | 'play' | 'fill' | 'paver-bedding' | 'other';
export type AreaUnit = 'sq-in' | 'sq-ft' | 'sq-yd' | 'sq-cm' | 'sq-m';
export type BagBasis = 'weight' | 'volume';
export type BagUnit = 'lb' | 'kg' | 'cu-ft' | 'cu-yd' | 'liter' | 'cu-m';
export type BulkBasis = 'volume' | 'weight';
export type BulkUnit = 'cu-yd' | 'cu-ft' | 'cu-m' | 'lb' | 'us-ton' | 'kg' | 'metric-tonne';
export type DensityUnit = 'lb-cu-yd' | 'lb-cu-ft' | 'kg-cu-m' | 'tonne-cu-m';

export interface Dimension {
  value: number;
  unit: LengthUnit;
}
export interface SandInput {
  projectType: ProjectType;
  measureMode: MeasureMode;
  shape: SandShape;
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
  sandType: SandType;
  allowancePercent: number;
  compactionPercent: number;
  supplierDensity?: number;
  densityUnit: DensityUnit;
  bagBasis: BagBasis;
  bagSize?: number;
  bagUnit: BagUnit;
  pricePerBag?: number;
  bulkBasis: BulkBasis;
  bulkUnit: BulkUnit;
  bulkIncrement?: number;
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

export interface SandCalculation {
  areaPerItemSquareFeet: number;
  totalAreaSquareFeet: number;
  baseCubicFeet: number;
  allowanceCubicFeet: number;
  compactionCubicFeet: number;
  requiredCubicFeet: number;
  requiredCubicYards: number;
  requiredCubicMeters: number;
  requiredLiters: number;
  coveragePerCubicYardSquareFeet: number;
  coveragePerCubicMeterSquareMeters: number;
  densityPoundsPerCubicYard: number;
  densitySource: 'estimated' | 'supplier';
  requiredWeight: WeightConversions;
  bagsRequired?: number;
  bagPurchasedAmount?: number;
  bagLeftoverAmount?: number;
  bagCost?: number;
  bulkRequiredAmount: number;
  bulkOrderAmount: number;
  bulkLeftoverAmount: number;
  bulkCost?: number;
  orderedWeight?: WeightConversions;
}

export interface ValidationIssue {
  field: keyof SandInput | 'geometry';
  message: string;
}
