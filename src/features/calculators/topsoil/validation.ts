import { toFeet } from '../../../lib/units/measurements';
import { isSupportedPurchaseQuotient } from '../../../lib/calculators/rounding';
import { calculateTopsoil, CUBIC_METERS_PER_CUBIC_YARD, LITERS_PER_CUBIC_FOOT } from './calculator';
import type { TopsoilInput, ValidationIssue } from './types';

const positive = (value: number) => Number.isFinite(value) && value > 0;
export function validateTopsoilInput(input: TopsoilInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const dimension = (field: keyof TopsoilInput, value: TopsoilInput['length']) => {
    if (!positive(value.value)) issues.push({ field, message: 'Enter a value greater than zero.' });
    else if (toFeet(value.value, value.unit) > 100000)
      issues.push({ field, message: 'Enter a smaller measurement.' });
  };
  if (input.measureMode === 'area') {
    if (!positive(input.knownArea))
      issues.push({ field: 'knownArea', message: 'Enter an area greater than zero.' });
  } else if (input.shape === 'rectangle') {
    dimension('length', input.length);
    dimension('width', input.width);
  } else if (input.shape === 'square') dimension('side', input.side);
  else if (input.shape === 'circle') dimension('diameter', input.diameter);
  else if (input.shape === 'triangle') {
    dimension('base', input.base);
    dimension('perpendicularHeight', input.perpendicularHeight);
  } else if (input.shape === 'trapezoid') {
    dimension('sideA', input.sideA);
    dimension('sideB', input.sideB);
    dimension('perpendicularHeight', input.perpendicularHeight);
  } else {
    dimension('outerDiameter', input.outerDiameter);
    dimension('innerDiameter', input.innerDiameter);
    if (
      positive(input.outerDiameter.value) &&
      positive(input.innerDiameter.value) &&
      toFeet(input.outerDiameter.value, input.outerDiameter.unit) <=
        toFeet(input.innerDiameter.value, input.innerDiameter.unit)
    )
      issues.push({
        field: 'geometry',
        message: 'Outer diameter must be greater than inner diameter.',
      });
  }
  dimension('depth', input.depth);
  if (!Number.isInteger(input.quantity) || input.quantity < 1)
    issues.push({ field: 'quantity', message: 'Quantity must be a whole number of 1 or more.' });
  if (![0, 5, 10, 15].includes(input.allowancePercent))
    issues.push({ field: 'allowancePercent', message: 'Choose an allowance from 0% to 15%.' });
  if (input.bagVolume !== undefined && !positive(input.bagVolume))
    issues.push({ field: 'bagVolume', message: 'Bag size must be greater than zero.' });
  if (input.bulkIncrement !== undefined && !positive(input.bulkIncrement))
    issues.push({ field: 'bulkIncrement', message: 'Bulk increment must be greater than zero.' });
  if (input.supplierDensity !== undefined && !positive(input.supplierDensity))
    issues.push({
      field: 'supplierDensity',
      message: 'Supplier density must be greater than zero.',
    });
  for (const field of ['pricePerBag', 'bulkUnitPrice'] as const)
    if (input[field] !== undefined && (!Number.isFinite(input[field]) || input[field]! < 0))
      issues.push({ field, message: 'Price cannot be negative.' });
  if (!issues.length) {
    const result = calculateTopsoil({
      ...input,
      bagVolume: undefined,
      bulkIncrement: undefined,
      supplierDensity: undefined,
    });
    const bagVolumeCubicFeet =
      input.bagVolume === undefined
        ? undefined
        : input.bagVolumeUnit === 'liter'
          ? input.bagVolume / LITERS_PER_CUBIC_FOOT
          : input.bagVolume;
    const incrementCubicYards =
      input.bulkIncrement === undefined
        ? undefined
        : input.bulkIncrementUnit === 'cu-m'
          ? input.bulkIncrement / CUBIC_METERS_PER_CUBIC_YARD
          : input.bulkIncrement;
    if (
      bagVolumeCubicFeet !== undefined &&
      !isSupportedPurchaseQuotient(result.requiredCubicFeet, bagVolumeCubicFeet)
    )
      issues.push({ field: 'bagVolume', message: 'Use a larger bag size for this project.' });
    if (
      incrementCubicYards !== undefined &&
      !isSupportedPurchaseQuotient(result.requiredCubicYards, incrementCubicYards)
    )
      issues.push({
        field: 'bulkIncrement',
        message: 'Use a larger purchasing increment for this project.',
      });
  }
  return issues;
}
