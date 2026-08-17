import { requiredWholeUnits } from '../../../lib/calculators/rounding';
import {
  cubicFeetToCubicMeters,
  cubicFeetToCubicYards,
  toFeet,
} from '../../../lib/units/measurements';
import type { AreaUnit, PaverCalculation, PaverInput, PaverUnit } from './types';

export const SQUARE_FEET_PER_SQUARE_METER = 1 / 0.09290304;

export function areaToSquareFeet(value: number, unit: AreaUnit) {
  return value * { 'sq-ft': 1, 'sq-yd': 9, 'sq-m': SQUARE_FEET_PER_SQUARE_METER }[unit];
}

export function squareFeetToArea(value: number, unit: AreaUnit) {
  return value / areaToSquareFeet(1, unit);
}

export function paverLengthToFeet(value: number, unit: PaverUnit) {
  return unit === 'in' ? value / 12 : value / 304.8;
}

export function calculateProjectAreaSquareFeet(input: PaverInput) {
  if (input.measureMode === 'area') return areaToSquareFeet(input.knownArea, input.areaUnit);
  if (input.shape === 'circle')
    return Math.PI * (toFeet(input.diameter.value, input.diameter.unit) / 2) ** 2;
  return (
    toFeet(input.length.value, input.length.unit) * toFeet(input.width.value, input.width.unit)
  );
}

export function calculatePaver(input: PaverInput): PaverCalculation {
  const projectAreaSquareFeet = calculateProjectAreaSquareFeet(input);
  const paverLengthFeet = paverLengthToFeet(input.paverLength, input.paverUnit);
  const paverWidthFeet = paverLengthToFeet(input.paverWidth, input.paverUnit);
  const jointFeet = Number.isNaN(input.jointWidth)
    ? 0
    : paverLengthToFeet(input.jointWidth, input.jointUnit);
  const paverFaceAreaSquareFeet = paverLengthFeet * paverWidthFeet;
  const effectiveCoverageSquareFeet = (paverLengthFeet + jointFeet) * (paverWidthFeet + jointFeet);
  const paversPerSquareFoot = 1 / effectiveCoverageSquareFeet;
  const rawPavers = projectAreaSquareFeet / effectiveCoverageSquareFeet;
  const wastePavers = rawPavers * (input.wastePercent / 100);
  const wasteAdjustedPavers = rawPavers + wastePavers;
  const requiredPavers = requiredWholeUnits(wasteAdjustedPavers, 1);
  const baseVolumeCubicFeet = input.estimateBase
    ? projectAreaSquareFeet * toFeet(input.baseDepth.value, input.baseDepth.unit)
    : undefined;
  const sandVolumeCubicFeet = input.estimateSand
    ? projectAreaSquareFeet * toFeet(input.sandDepth.value, input.sandDepth.unit)
    : undefined;
  const estimatedCost =
    input.estimateCost && input.pricePerPaver !== undefined
      ? requiredPavers * input.pricePerPaver
      : undefined;
  return {
    projectAreaSquareFeet,
    paverFaceAreaSquareFeet,
    effectiveCoverageSquareFeet,
    paversPerSquareFoot,
    rawPavers,
    wastePavers,
    wasteAdjustedPavers,
    requiredPavers,
    baseVolumeCubicFeet,
    sandVolumeCubicFeet,
    estimatedCost,
  };
}

export { cubicFeetToCubicMeters, cubicFeetToCubicYards };
