import { toFeet } from '../../../lib/units/measurements';
import type { ConcreteInput, ConcreteValidationIssue, DimensionInput } from './types';

export const MAX_SURFACE_DIMENSION_FEET = 100_000;
export const MAX_VERTICAL_DIMENSION_FEET = 10_000;
export const MAX_QUANTITY = 10_000;
export const MAX_ALLOWANCE_PERCENT = 100;
export const MAX_READY_MIX_PRICE = 1_000_000;
export const MAX_DELIVERY_FEE = 1_000_000;
export const MAX_BAG_PRICE = 100_000;
export const MAX_BAG_YIELD_CUBIC_FEET = 100;
export const MAX_CUSTOM_BAG_WEIGHT_POUNDS = 10_000;

function dimension(
  value: DimensionInput,
  field: keyof ConcreteInput,
  label: string,
  maximum: number,
  issues: ConcreteValidationIssue[],
) {
  if (!Number.isFinite(value.value))
    issues.push({ field, message: `Enter a ${label.toLowerCase()}.` });
  else if (value.value <= 0) issues.push({ field, message: `${label} must be greater than zero.` });
  else if (toFeet(value.value, value.unit) > maximum)
    issues.push({
      field,
      message: `${label} must be no more than ${maximum.toLocaleString()} ft.`,
    });
}

function optional(
  value: number | undefined,
  field: keyof ConcreteInput,
  label: string,
  maximum: number,
  issues: ConcreteValidationIssue[],
) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > maximum))
    issues.push({ field, message: `${label} must be between 0 and ${maximum.toLocaleString()}.` });
}

export function validateConcreteInput(input: ConcreteInput): ConcreteValidationIssue[] {
  const issues: ConcreteValidationIssue[] = [];
  if (input.concreteMode === 'slab') {
    dimension(input.length, 'length', 'Length', MAX_SURFACE_DIMENSION_FEET, issues);
    dimension(input.width, 'width', 'Width', MAX_SURFACE_DIMENSION_FEET, issues);
    dimension(input.thickness, 'thickness', 'Thickness', MAX_VERTICAL_DIMENSION_FEET, issues);
  } else if (input.concreteMode === 'circular-pad') {
    dimension(input.diameter, 'diameter', 'Diameter', MAX_SURFACE_DIMENSION_FEET, issues);
    dimension(input.thickness, 'thickness', 'Thickness', MAX_VERTICAL_DIMENSION_FEET, issues);
  } else if (input.concreteMode === 'column') {
    dimension(input.diameter, 'diameter', 'Diameter', MAX_SURFACE_DIMENSION_FEET, issues);
    dimension(input.height, 'height', 'Height', MAX_VERTICAL_DIMENSION_FEET, issues);
  } else {
    dimension(
      input.holeDiameter,
      'holeDiameter',
      'Hole diameter',
      MAX_SURFACE_DIMENSION_FEET,
      issues,
    );
    dimension(input.holeDepth, 'holeDepth', 'Hole depth', MAX_VERTICAL_DIMENSION_FEET, issues);
  }
  if (
    !Number.isFinite(input.quantity) ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > MAX_QUANTITY
  )
    issues.push({
      field: 'quantity',
      message: `Quantity must be a whole number from 1 to ${MAX_QUANTITY.toLocaleString()}.`,
    });
  if (
    !Number.isFinite(input.allowancePercent) ||
    input.allowancePercent < 0 ||
    input.allowancePercent > MAX_ALLOWANCE_PERCENT
  )
    issues.push({ field: 'allowancePercent', message: 'Allowance must be between 0% and 100%.' });
  optional(
    input.readyMixPricePerCubicYard,
    'readyMixPricePerCubicYard',
    'Ready-mix price',
    MAX_READY_MIX_PRICE,
    issues,
  );
  optional(
    input.readyMixDeliveryFee,
    'readyMixDeliveryFee',
    'Delivery fee',
    MAX_DELIVERY_FEE,
    issues,
  );
  optional(input.bagPrice, 'bagPrice', 'Bag price', MAX_BAG_PRICE, issues);
  if (input.bagPreset === 'custom') {
    const weightInPounds =
      input.customBagWeight === undefined
        ? undefined
        : input.customBagWeight * (input.customBagWeightUnit === 'kg' ? 2.2046226218 : 1);
    if (
      weightInPounds !== undefined &&
      (!Number.isFinite(weightInPounds) ||
        weightInPounds <= 0 ||
        weightInPounds > MAX_CUSTOM_BAG_WEIGHT_POUNDS)
    )
      issues.push({
        field: 'customBagWeight',
        message: 'Bag weight must be greater than zero and no more than 10,000 lb.',
      });
    const value = input.customBagYieldCubicFeet;
    if (
      value === undefined ||
      !Number.isFinite(value) ||
      value <= 0 ||
      value > MAX_BAG_YIELD_CUBIC_FEET
    )
      issues.push({
        field: 'customBagYieldCubicFeet',
        message: `Yield per bag must be greater than zero and no more than ${MAX_BAG_YIELD_CUBIC_FEET} ft³.`,
      });
  }
  return issues;
}
