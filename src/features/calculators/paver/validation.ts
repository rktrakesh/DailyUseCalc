import { isSupportedPurchaseQuotient } from '../../../lib/calculators/rounding';
import { calculateProjectAreaSquareFeet, paverLengthToFeet } from './calculator';
import type { PaverInput, ValidationIssue } from './types';

const positive = (value: number) => Number.isFinite(value) && value > 0;

export function validatePaverInput(input: PaverInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (input.measureMode === 'area') {
    if (!positive(input.knownArea))
      issues.push({ field: 'knownArea', message: 'Enter the project area.' });
  } else if (input.shape === 'circle') {
    if (!positive(input.diameter.value))
      issues.push({ field: 'diameter', message: 'Enter the project diameter.' });
  } else {
    if (!positive(input.length.value))
      issues.push({ field: 'length', message: 'Enter the project length.' });
    if (!positive(input.width.value))
      issues.push({ field: 'width', message: 'Enter the project width.' });
  }
  if (!positive(input.paverLength))
    issues.push({ field: 'paverLength', message: 'Enter the paver length.' });
  if (!positive(input.paverWidth))
    issues.push({ field: 'paverWidth', message: 'Enter the paver width.' });
  if (!Number.isFinite(input.wastePercent) || input.wastePercent < 0 || input.wastePercent > 100)
    issues.push({ field: 'wastePercent', message: 'Enter a waste percentage from 0 to 100.' });
  if (
    input.jointWidth === Number.POSITIVE_INFINITY ||
    input.jointWidth === Number.NEGATIVE_INFINITY ||
    input.jointWidth < 0
  )
    issues.push({ field: 'jointWidth', message: 'Joint width cannot be negative.' });
  if (input.estimateBase && !positive(input.baseDepth.value))
    issues.push({ field: 'baseDepth', message: 'Enter the paver base depth.' });
  if (input.estimateSand && !positive(input.sandDepth.value))
    issues.push({ field: 'sandDepth', message: 'Enter the bedding sand depth.' });
  if (
    input.estimateCost &&
    (input.pricePerPaver === undefined ||
      !Number.isFinite(input.pricePerPaver) ||
      input.pricePerPaver < 0)
  )
    issues.push({ field: 'pricePerPaver', message: 'Enter a nonnegative price per paver.' });
  if (!issues.length) {
    const area = calculateProjectAreaSquareFeet(input);
    const joint = Number.isNaN(input.jointWidth)
      ? 0
      : paverLengthToFeet(input.jointWidth, input.jointUnit);
    const coverage =
      (paverLengthToFeet(input.paverLength, input.paverUnit) + joint) *
      (paverLengthToFeet(input.paverWidth, input.paverUnit) + joint);
    const adjusted = (area / coverage) * (1 + input.wastePercent / 100);
    if (!isSupportedPurchaseQuotient(adjusted, 1))
      issues.push({
        field: 'purchasing',
        message: 'This project produces too many pavers for a reliable estimate.',
      });
  }
  return issues;
}
