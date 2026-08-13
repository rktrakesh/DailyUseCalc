import type { LengthUnit } from '../../../lib/units/measurements';
import type { CurrencyCode } from '../gravel/currencies';

export type MeasurementSystem = 'imperial' | 'metric';
export type MeasureMode = 'dimensions' | 'area';
export type TileShape = 'rectangle' | 'square' | 'circle' | 'triangle' | 'trapezoid' | 'ring';
export type ProjectType =
  | 'floor'
  | 'wall'
  | 'backsplash'
  | 'shower-wall'
  | 'shower-floor'
  | 'accent-wall'
  | 'patio'
  | 'other';
export type AreaUnit = 'sq-in' | 'sq-ft' | 'sq-yd' | 'sq-cm' | 'sq-m';
export type TileSizeUnit = 'in' | 'ft' | 'mm' | 'cm';
export type PatternType = 'straight' | 'brick' | 'diagonal' | 'herringbone' | 'custom';
export type BoxMode = 'tiles' | 'coverage';
export type PriceBasis = 'tile' | 'box' | 'sq-ft' | 'sq-m';

export interface Dimension {
  value: number;
  unit: LengthUnit;
}
export interface TileInput {
  projectType: ProjectType;
  measureMode: MeasureMode;
  shape: TileShape;
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
  knownArea: number;
  areaUnit: AreaUnit;
  quantity: number;
  tileLength: number;
  tileWidth: number;
  tileUnit: TileSizeUnit;
  groutGap: number;
  groutUnit: 'in' | 'mm';
  pattern: PatternType;
  wastePercent: number;
  excludedArea?: number;
  excludedAreaUnit: AreaUnit;
  boxMode: BoxMode;
  tilesPerBox?: number;
  manufacturerCoverage?: number;
  manufacturerCoverageUnit: AreaUnit;
  priceBasis: PriceBasis;
  price?: number;
  currency: CurrencyCode;
}

export interface TileCalculation {
  areaPerItemSquareFeet: number;
  grossAreaSquareFeet: number;
  excludedAreaSquareFeet: number;
  netAreaSquareFeet: number;
  tileFaceAreaSquareFeet: number;
  moduleAreaSquareFeet: number;
  rawTiles: number;
  wasteAdjustedTiles: number;
  requiredTiles: number;
  wasteAdjustedCoverageSquareFeet: number;
  boxesRequired?: number;
  purchasedTiles?: number;
  extraTiles?: number;
  purchasedCoverageSquareFeet?: number;
  extraPurchasedCoverageSquareFeet?: number;
  estimatedCost?: number;
}

export interface ValidationIssue {
  field: keyof TileInput | 'geometry';
  message: string;
}
