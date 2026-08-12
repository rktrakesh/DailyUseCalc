import { toFeet } from '../../../lib/units/measurements';
import type { DimensionInput, GravelInput, ValidationIssue } from './types';

const MAX_SURFACE_DIMENSION_FEET = 100_000;
const MAX_DEPTH_FEET = 1_000;
const MAX_DENSITY_TONS_PER_YARD = 10;
const MAX_PRICE = 100_000;
const MAX_DELIVERY_FEE = 1_000_000;
const MAX_BAG_SIZE_CUBIC_FEET = 1_000;
const MAX_TRUCK_CAPACITY_CUBIC_YARDS = 1_000;

function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function validateDimension(
  value: DimensionInput,
  field: 'length' | 'width' | 'diameter' | 'depth',
  maximumFeet: number,
  issues: ValidationIssue[],
) {
  if (!Number.isFinite(value.value)) {
    issues.push({ field, message: `Enter a ${field}.` });
  } else if (value.value <= 0) {
    issues.push({ field, message: `Enter a ${field} greater than zero.` });
  } else if (toFeet(value.value, value.unit) > maximumFeet) {
    issues.push({ field, message: `Enter a ${field} below ${maximumFeet.toLocaleString()} ft.` });
  }
}

function validateOptionalPrice(
  value: number | undefined,
  field: 'pricePerCubicYard' | 'bagPrice',
  label: string,
  issues: ValidationIssue[],
) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > MAX_PRICE)) {
    issues.push({
      field,
      message: `${label} must be between $0 and $${MAX_PRICE.toLocaleString()}.`,
    });
  }
}

export function validateGravelInput(input: GravelInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (input.inputMode === 'volume') {
    if (!isPositiveNumber(input.knownVolume.value))
      issues.push({ field: 'knownVolume', message: 'Enter a volume greater than zero.' });
  } else if (input.inputMode === 'area') {
    if (!isPositiveNumber(input.knownArea.value))
      issues.push({ field: 'knownArea', message: 'Enter an area greater than zero.' });
    validateDimension(input.depth, 'depth', MAX_DEPTH_FEET, issues);
  } else if (input.areaShape === 'circle') {
    validateDimension(input.diameter, 'diameter', MAX_SURFACE_DIMENSION_FEET, issues);
    validateDimension(input.depth, 'depth', MAX_DEPTH_FEET, issues);
  } else {
    validateDimension(input.length, 'length', MAX_SURFACE_DIMENSION_FEET, issues);
    validateDimension(input.width, 'width', MAX_SURFACE_DIMENSION_FEET, issues);
    validateDimension(input.depth, 'depth', MAX_DEPTH_FEET, issues);
  }

  if (
    !Number.isFinite(input.allowancePercent) ||
    input.allowancePercent < 0 ||
    input.allowancePercent > 50
  ) {
    issues.push({ field: 'allowancePercent', message: 'Allowance must be between 0% and 50%.' });
  }
  if (input.gravelType === 'custom') {
    const density = input.customDensityTonsPerYard ?? Number.NaN;
    if (!isPositiveNumber(density) || density > MAX_DENSITY_TONS_PER_YARD) {
      issues.push({
        field: 'customDensityTonsPerYard',
        message: `Custom density must be greater than zero and no more than ${MAX_DENSITY_TONS_PER_YARD} tons/yd³.`,
      });
    }
  }

  validateOptionalPrice(input.pricePerCubicYard, 'pricePerCubicYard', 'Price', issues);
  validateOptionalPrice(input.bagPrice, 'bagPrice', 'Bag price', issues);
  if (
    input.deliveryFee !== undefined &&
    (!Number.isFinite(input.deliveryFee) ||
      input.deliveryFee < 0 ||
      input.deliveryFee > MAX_DELIVERY_FEE)
  ) {
    issues.push({
      field: 'deliveryFee',
      message: `Delivery fee must be between $0 and $${MAX_DELIVERY_FEE.toLocaleString()}.`,
    });
  }
  if (
    input.bagSizeCubicFeet !== undefined &&
    (!isPositiveNumber(input.bagSizeCubicFeet) || input.bagSizeCubicFeet > MAX_BAG_SIZE_CUBIC_FEET)
  ) {
    issues.push({
      field: 'bagSizeCubicFeet',
      message: `Bag size must be greater than zero and no more than ${MAX_BAG_SIZE_CUBIC_FEET} ft³.`,
    });
  }
  if (
    input.truckCapacityCubicYards !== undefined &&
    (!isPositiveNumber(input.truckCapacityCubicYards) ||
      input.truckCapacityCubicYards > MAX_TRUCK_CAPACITY_CUBIC_YARDS)
  ) {
    issues.push({
      field: 'truckCapacityCubicYards',
      message: `Truck capacity must be greater than zero and no more than ${MAX_TRUCK_CAPACITY_CUBIC_YARDS} yd³.`,
    });
  }
  return issues;
}
