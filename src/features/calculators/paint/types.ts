import type { LengthUnit } from '../../../lib/units/measurements';
import type { CurrencyCode } from '../gravel/currencies';

export type MeasurementSystem = 'imperial' | 'metric';
export type SurfaceCondition = 'smooth' | 'new-drywall' | 'porous' | 'textured';
export type DoorSides = 1 | 2;
export interface DimensionInput {
  value: number;
  unit: LengthUnit;
}
export interface PaintInput {
  measurementSystem: MeasurementSystem;
  length: DimensionInput;
  width: DimensionInput;
  wallHeight: DimensionInput;
  roomQuantity: number;
  includeCeiling: boolean;
  doorOpenings: { quantity: number; width: DimensionInput; height: DimensionInput };
  windowOpenings: { quantity: number; width: DimensionInput; height: DimensionInput };
  coats: number;
  coverageSquareFeetPerGallon: number;
  surfaceCondition: SurfaceCondition;
  allowancePercent: number;
  currency: CurrencyCode;
  paintDoors: boolean;
  paintedDoorQuantity: number;
  paintedDoorWidth: DimensionInput;
  paintedDoorHeight: DimensionInput;
  paintedDoorSides: DoorSides;
  paintedDoorCoats: number;
  paintTrim: boolean;
  trimLength: DimensionInput;
  trimWidth: DimensionInput;
  trimCoats: number;
  usePrimer: boolean;
  primerCoats: number;
  primerCoverageSquareFeetPerGallon: number;
  pricePerQuart?: number;
  pricePerGallon?: number;
  pricePerFiveGallons?: number;
  primerPricePerGallon?: number;
}
export interface PurchaseContainer {
  sizeGallons: number;
  count: number;
  label: string;
}
export interface PurchaseRecommendation {
  containers: PurchaseContainer[];
  purchasedGallons: number;
  leftoverGallons: number;
  display: string;
}
export interface PaintRequirement {
  areaSquareFeet: number;
  coats: number;
  baseGallons: number;
  allowanceGallons: number;
  requiredGallons: number;
  purchase: PurchaseRecommendation;
}
export interface PaintCalculation {
  grossWallAreaSquareFeet: number;
  doorOpeningAreaSquareFeet: number;
  windowOpeningAreaSquareFeet: number;
  netWallAreaSquareFeet: number;
  ceilingAreaSquareFeet: number;
  paintedDoorAreaSquareFeet: number;
  trimAreaSquareFeet: number;
  wall: PaintRequirement;
  ceiling?: PaintRequirement;
  doors?: PaintRequirement;
  trim?: PaintRequirement;
  primer?: PaintRequirement;
  totalFinishGallons: number;
  totalFinishLiters: number;
  estimatedFinishCost?: number;
  estimatedPrimerCost?: number;
  estimatedTotalCost?: number;
}
export interface PaintValidationIssue {
  field: keyof PaintInput | 'openings';
  message: string;
}
export interface PaintRecommendation {
  guidance: string[];
  warnings: string[];
}
