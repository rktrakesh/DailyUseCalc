import { toFeet } from '../../../lib/units/measurements';
import type { SandInput, ValidationIssue } from './types';

const positive = (value: number) => Number.isFinite(value) && value > 0;
export function validateSandInput(input: SandInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const dimension = (field: keyof SandInput, value: SandInput['length']) => {
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
        field: 'innerDiameter',
        message: 'Inner diameter must be smaller than outer diameter.',
      });
  }
  dimension('depth', input.depth);
  if (!Number.isInteger(input.quantity) || input.quantity < 1)
    issues.push({ field: 'quantity', message: 'Quantity must be a whole number of 1 or more.' });
  for (const field of ['allowancePercent', 'compactionPercent'] as const)
    if (!Number.isFinite(input[field]) || input[field] < 0 || input[field] > 100)
      issues.push({ field, message: 'Enter a percentage from 0 to 100.' });
  if (input.bagSize !== undefined && !positive(input.bagSize))
    issues.push({ field: 'bagSize', message: 'Bag size must be greater than zero.' });
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
  return issues;
}
