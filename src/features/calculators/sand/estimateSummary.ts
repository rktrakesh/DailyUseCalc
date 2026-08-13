import { formatMoney } from '../gravel/currencies';
import type { SandCalculation, SandInput } from './types';
const n = (v: number, d = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(v);
export const SAND_URL = 'https://dailyusecalc.com/sand/';
export function createSandEstimateText(input: SandInput, c: SandCalculation) {
  const metric = input.measurementSystem === 'metric';
  return [
    'DailyUseCalc Sand Estimate',
    `Project: ${input.projectType}`,
    `Area: ${metric ? `${n(c.totalAreaSquareFeet / 10.7639104167)} sq m` : `${n(c.totalAreaSquareFeet)} sq ft`}`,
    `Depth: ${n(input.depth.value)} ${input.depth.unit}`,
    `Allowance: ${input.allowancePercent}%`,
    `Compaction extra: ${input.compactionPercent}%`,
    `Required sand: ${metric ? `${n(c.requiredCubicMeters)} cu m (${n(c.requiredLiters, 0)} L)` : `${n(c.requiredCubicYards)} cu yd (${n(c.requiredCubicFeet)} cu ft)`}`,
    `Required weight: ${metric ? `${n(c.requiredWeight.kilograms, 0)} kg (${n(c.requiredWeight.metricTonnes)} metric tonnes)` : `${n(c.requiredWeight.usTons)} US tons (${n(c.requiredWeight.pounds, 0)} lb)`}`,
    `Density: ${n(c.densityPoundsPerCubicYard, 0)} lb/cu yd (${c.densitySource})`,
    ...(c.bagsRequired === undefined
      ? []
      : [
          `Bagged: ${c.bagsRequired} x ${n(input.bagSize!)} ${input.bagUnit}; leftover ${n(c.bagLeftoverAmount!)} ${input.bagUnit}`,
        ]),
    `Bulk: ${n(c.bulkOrderAmount)} ${input.bulkUnit}; leftover ${n(c.bulkLeftoverAmount)} ${input.bulkUnit}`,
    ...(c.bagCost === undefined
      ? []
      : [`Bagged material cost: ${formatMoney(c.bagCost, input.currency)}`]),
    ...(c.bulkCost === undefined
      ? []
      : [`Bulk material cost: ${formatMoney(c.bulkCost, input.currency)}`]),
    `Coverage: ${metric ? `1 cu m covers about ${n(c.coveragePerCubicMeterSquareMeters)} sq m` : `1 cu yd covers about ${n(c.coveragePerCubicYardSquareFeet)} sq ft`} at the selected depth`,
    SAND_URL,
  ].join('\n');
}
