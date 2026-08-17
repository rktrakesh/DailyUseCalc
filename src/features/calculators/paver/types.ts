import type { LengthUnit } from '../../../lib/units/measurements';
import type { CurrencyCode } from '../gravel/currencies';

export type MeasurementSystem = 'imperial' | 'metric';
export type MeasureMode = 'dimensions' | 'area';
export type PaverShape = 'rectangle' | 'circle';
export type ProjectType = 'patio' | 'walkway' | 'driveway' | 'pool-deck' | 'other';
export type AreaUnit = 'sq-ft' | 'sq-yd' | 'sq-m';
export type PaverUnit = 'in' | 'mm';
export type PaverPresetId = '4x8' | '6x6' | '6x9' | '8x8' | '12x12' | '16x16' | '24x24' | 'custom';
export type WastePreset = '0' | '5' | '10' | '15' | 'custom';

export interface Dimension {
  value: number;
  unit: LengthUnit;
}

export interface PaverInput {
  projectType: ProjectType;
  measureMode: MeasureMode;
  shape: PaverShape;
  measurementSystem: MeasurementSystem;
  length: Dimension;
  width: Dimension;
  diameter: Dimension;
  knownArea: number;
  areaUnit: AreaUnit;
  paverPreset: PaverPresetId;
  paverLength: number;
  paverWidth: number;
  paverUnit: PaverUnit;
  wastePreset: WastePreset;
  wastePercent: number;
  jointWidth: number;
  jointUnit: PaverUnit;
  estimateBase: boolean;
  baseDepth: Dimension;
  estimateSand: boolean;
  sandDepth: Dimension;
  estimateCost: boolean;
  currency: CurrencyCode;
  pricePerPaver?: number;
}

export interface PaverCalculation {
  projectAreaSquareFeet: number;
  paverFaceAreaSquareFeet: number;
  effectiveCoverageSquareFeet: number;
  paversPerSquareFoot: number;
  rawPavers: number;
  wastePavers: number;
  wasteAdjustedPavers: number;
  requiredPavers: number;
  baseVolumeCubicFeet?: number;
  sandVolumeCubicFeet?: number;
  estimatedCost?: number;
}

export interface ValidationIssue {
  field: keyof PaverInput | 'purchasing';
  message: string;
}
