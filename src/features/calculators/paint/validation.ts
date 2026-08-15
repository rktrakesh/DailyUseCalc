import { toFeet } from '../../../lib/units/measurements';
import { isSupportedPurchaseQuotient } from '../../../lib/calculators/rounding';
import { SQUARE_FEET_PER_SQUARE_METER, US_GALLON_LITERS } from './constants';
import type { DimensionInput, PaintInput, PaintValidationIssue } from './types';
const MAX_DIMENSION_FT = 100000,
  MAX_QUANTITY = 10000,
  MAX_PRICE = 1000000;
function dimension(
  value: DimensionInput,
  field: keyof PaintInput,
  label: string,
  issues: PaintValidationIssue[],
) {
  if (
    !Number.isFinite(value.value) ||
    value.value <= 0 ||
    toFeet(value.value, value.unit) > MAX_DIMENSION_FT
  )
    issues.push({
      field,
      message: `${label} must be greater than zero and within the supported range.`,
    });
}
function whole(
  value: number,
  field: keyof PaintInput,
  label: string,
  min: number,
  issues: PaintValidationIssue[],
) {
  if (!Number.isInteger(value) || value < min || value > MAX_QUANTITY)
    issues.push({
      field,
      message: `${label} must be a whole number from ${min} to ${MAX_QUANTITY.toLocaleString()}.`,
    });
}
function coats(
  value: number,
  field: 'coats' | 'paintedDoorCoats' | 'trimCoats' | 'primerCoats',
  label: string,
  max: number,
  issues: PaintValidationIssue[],
) {
  if (!Number.isInteger(value) || value < 1 || value > max)
    issues.push({
      field,
      message: `${label} must be a whole number from 1 to ${max}.`,
    });
}
export function validatePaintInput(input: PaintInput): PaintValidationIssue[] {
  const issues: PaintValidationIssue[] = [];
  dimension(input.length, 'length', 'Room length', issues);
  dimension(input.width, 'width', 'Room width', issues);
  dimension(input.wallHeight, 'wallHeight', 'Wall height', issues);
  whole(input.roomQuantity, 'roomQuantity', 'Room quantity', 1, issues);
  whole(input.doorOpenings.quantity, 'doorOpenings', 'Total doors', 0, issues);
  whole(input.windowOpenings.quantity, 'windowOpenings', 'Total windows', 0, issues);
  if (input.doorOpenings.quantity) {
    dimension(input.doorOpenings.width, 'doorOpenings', 'Door width', issues);
    dimension(input.doorOpenings.height, 'doorOpenings', 'Door height', issues);
  }
  if (input.windowOpenings.quantity) {
    dimension(input.windowOpenings.width, 'windowOpenings', 'Window width', issues);
    dimension(input.windowOpenings.height, 'windowOpenings', 'Window height', issues);
  }
  coats(input.coats, 'coats', 'Wall coats', 10, issues);
  if (
    !Number.isFinite(input.coverageSquareFeetPerGallon) ||
    input.coverageSquareFeetPerGallon <= 0 ||
    input.coverageSquareFeetPerGallon > 10000
  )
    issues.push({
      field: 'coverageSquareFeetPerGallon',
      message: 'Coverage must be greater than zero.',
    });
  if (
    !Number.isFinite(input.allowancePercent) ||
    input.allowancePercent < 0 ||
    input.allowancePercent > 100
  )
    issues.push({ field: 'allowancePercent', message: 'Allowance must be between 0% and 100%.' });
  if (input.paintDoors) {
    whole(input.paintedDoorQuantity, 'paintedDoorQuantity', 'Painted door quantity', 1, issues);
    dimension(input.paintedDoorWidth, 'paintedDoorWidth', 'Painted door width', issues);
    dimension(input.paintedDoorHeight, 'paintedDoorHeight', 'Painted door height', issues);
    coats(input.paintedDoorCoats, 'paintedDoorCoats', 'Door coats', 10, issues);
  }
  if (input.paintTrim) {
    dimension(input.trimLength, 'trimLength', 'Trim length', issues);
    dimension(input.trimWidth, 'trimWidth', 'Trim width', issues);
    coats(input.trimCoats, 'trimCoats', 'Trim coats', 10, issues);
  }
  if (input.usePrimer) {
    coats(input.primerCoats, 'primerCoats', 'Primer coats', 5, issues);
    if (
      !Number.isFinite(input.primerCoverageSquareFeetPerGallon) ||
      input.primerCoverageSquareFeetPerGallon <= 0 ||
      input.primerCoverageSquareFeetPerGallon > 10000
    )
      issues.push({
        field: 'primerCoverageSquareFeetPerGallon',
        message: 'Primer coverage must be greater than zero.',
      });
  }
  for (const [value, field] of [
    [input.pricePerQuart, 'pricePerQuart'],
    [input.pricePerGallon, 'pricePerGallon'],
    [input.pricePerFiveGallons, 'pricePerFiveGallons'],
    [input.primerPricePerGallon, 'primerPricePerGallon'],
  ] as const)
    if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > MAX_PRICE))
      issues.push({ field, message: 'Price must be a finite non-negative value.' });
  if (
    !issues.some((i) =>
      ['length', 'width', 'wallHeight', 'roomQuantity', 'doorOpenings', 'windowOpenings'].includes(
        i.field,
      ),
    )
  ) {
    const gross =
      2 *
      (toFeet(input.length.value, input.length.unit) +
        toFeet(input.width.value, input.width.unit)) *
      toFeet(input.wallHeight.value, input.wallHeight.unit) *
      input.roomQuantity;
    const openings =
      input.doorOpenings.quantity *
        toFeet(input.doorOpenings.width.value, input.doorOpenings.width.unit) *
        toFeet(input.doorOpenings.height.value, input.doorOpenings.height.unit) +
      input.windowOpenings.quantity *
        toFeet(input.windowOpenings.width.value, input.windowOpenings.width.unit) *
        toFeet(input.windowOpenings.height.value, input.windowOpenings.height.unit);
    if (openings >= gross)
      issues.push({
        field: 'openings',
        message: 'Door and window openings must be smaller than the total gross wall area.',
      });
    else if (
      !issues.some((issue) =>
        ['coats', 'coverageSquareFeetPerGallon', 'allowancePercent'].includes(String(issue.field)),
      )
    ) {
      const coverage =
        input.measurementSystem === 'metric'
          ? input.coverageSquareFeetPerGallon * SQUARE_FEET_PER_SQUARE_METER * US_GALLON_LITERS
          : input.coverageSquareFeetPerGallon;
      const requiredWallGallons =
        (((gross - openings) * input.coats) / coverage) * (1 + input.allowancePercent / 100);
      const unsupportedFinishPurchase = !isSupportedPurchaseQuotient(requiredWallGallons, 0.25);
      const roomLength = toFeet(input.length.value, input.length.unit);
      const roomWidth = toFeet(input.width.value, input.width.unit);
      const ceilingArea = input.includeCeiling ? roomLength * roomWidth * input.roomQuantity : 0;
      const paintedDoorArea = input.paintDoors
        ? input.paintedDoorQuantity *
          toFeet(input.paintedDoorWidth.value, input.paintedDoorWidth.unit) *
          toFeet(input.paintedDoorHeight.value, input.paintedDoorHeight.unit) *
          input.paintedDoorSides
        : 0;
      const trimArea = input.paintTrim
        ? toFeet(input.trimLength.value, input.trimLength.unit) *
          toFeet(input.trimWidth.value, input.trimWidth.unit)
        : 0;
      const allowanceMultiplier = 1 + input.allowancePercent / 100;
      const unsupportedOptionalFinishPurchase = [
        input.includeCeiling ? (ceilingArea * input.coats * allowanceMultiplier) / coverage : 0,
        input.paintDoors
          ? (paintedDoorArea * input.paintedDoorCoats * allowanceMultiplier) / coverage
          : 0,
        input.paintTrim ? (trimArea * input.trimCoats * allowanceMultiplier) / coverage : 0,
      ].some((requiredGallons) => !isSupportedPurchaseQuotient(requiredGallons, 0.25));
      if (unsupportedFinishPurchase || unsupportedOptionalFinishPurchase)
        issues.push({
          field: 'coverageSquareFeetPerGallon',
          message: 'This project produces too many purchasing units for a reliable estimate.',
        });
      if (input.usePrimer && Number.isFinite(input.primerCoverageSquareFeetPerGallon)) {
        const primerCoverage =
          input.measurementSystem === 'metric'
            ? input.primerCoverageSquareFeetPerGallon *
              SQUARE_FEET_PER_SQUARE_METER *
              US_GALLON_LITERS
            : input.primerCoverageSquareFeetPerGallon;
        const requiredPrimerGallons =
          (((gross - openings + ceilingArea + paintedDoorArea + trimArea) * input.primerCoats) /
            primerCoverage) *
          allowanceMultiplier;
        if (!isSupportedPurchaseQuotient(requiredPrimerGallons, 1))
          issues.push({
            field: 'primerCoverageSquareFeetPerGallon',
            message: 'This project produces too many purchasing units for a reliable estimate.',
          });
      }
    }
  }
  return issues;
}
