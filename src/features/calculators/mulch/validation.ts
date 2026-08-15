import { toFeet } from '../../../lib/units/measurements';
import { isSupportedPurchaseQuotient } from '../../../lib/calculators/rounding';
import { calculateMulch } from './calculator';
import type { MulchInput, ValidationIssue } from './types';

const valid = (n: number) => Number.isFinite(n) && n > 0;
export function validateMulchInput(input: MulchInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const dimension = (field: keyof MulchInput, value: MulchInput['length']) => {
    if (!valid(value.value)) issues.push({ field, message: 'Enter a value greater than zero.' });
    else if (toFeet(value.value, value.unit) > 100000)
      issues.push({ field, message: 'Enter a smaller measurement.' });
  };
  if (input.measureMode === 'area') {
    if (!valid(input.knownArea))
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
      valid(input.outerDiameter.value) &&
      valid(input.innerDiameter.value) &&
      toFeet(input.outerDiameter.value, input.outerDiameter.unit) <=
        toFeet(input.innerDiameter.value, input.innerDiameter.unit)
    )
      issues.push({
        field: 'geometry',
        message: 'Outer diameter must be greater than inner diameter.',
      });
  }
  dimension('depth', input.depth);
  if (![0, 5, 10, 15, 20].includes(input.allowancePercent))
    issues.push({ field: 'allowancePercent', message: 'Choose an allowance from 0% to 20%.' });
  if (input.bagVolume !== undefined && !valid(input.bagVolume))
    issues.push({ field: 'bagVolume', message: 'Bag size must be greater than zero.' });
  if (input.bulkIncrementCubicYards !== undefined && !valid(input.bulkIncrementCubicYards))
    issues.push({
      field: 'bulkIncrementCubicYards',
      message: 'Bulk increment must be greater than zero.',
    });
  for (const field of ['pricePerBag', 'bulkPricePerCubicYard'] as const)
    if (input[field] !== undefined && (!Number.isFinite(input[field]) || input[field]! < 0))
      issues.push({ field, message: 'Price cannot be negative.' });
  if (!issues.length) {
    const result = calculateMulch({
      ...input,
      bagVolume: undefined,
      bulkIncrementCubicYards: undefined,
    });
    const bagVolumeCubicFeet =
      input.bagVolume === undefined
        ? undefined
        : input.bagVolumeUnit === 'liter'
          ? input.bagVolume / 28.316846592
          : input.bagVolume;
    if (
      bagVolumeCubicFeet !== undefined &&
      !isSupportedPurchaseQuotient(result.requiredCubicFeet, bagVolumeCubicFeet)
    )
      issues.push({ field: 'bagVolume', message: 'Use a larger bag size for this project.' });
    if (
      input.bulkIncrementCubicYards !== undefined &&
      !isSupportedPurchaseQuotient(result.requiredCubicYards, input.bulkIncrementCubicYards)
    )
      issues.push({
        field: 'bulkIncrementCubicYards',
        message: 'Use a larger purchasing increment for this project.',
      });
  }
  return issues;
}
