import type { ValidationIssue } from './types';

export const DEFAULT_ADVANCED_OPTIONS_EXPANDED = false;

const advancedOptionFields = new Set<ValidationIssue['field']>([
  'allowancePercent',
  'pricePerCubicYard',
  'deliveryFee',
  'bagSizeCubicFeet',
  'bagPrice',
  'truckCapacityCubicYards',
]);

export function hasAdvancedOptionIssue(issues: readonly ValidationIssue[]) {
  return issues.some((issue) => advancedOptionFields.has(issue.field));
}
