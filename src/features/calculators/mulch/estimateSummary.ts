import { formatMoney } from '../gravel/currencies';
import type { MulchCalculation, MulchInput } from './types';
const n = (v: number, d = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(v);
export const MULCH_URL = 'https://dailyusecalc.com/mulch/';
export function createMulchEstimateText(input: MulchInput, c: MulchCalculation) {
  return [
    'DailyUseCalc Mulch Estimate',
    `Project: ${input.projectType}`,
    `Area: ${n(c.areaSquareFeet)} sq ft`,
    `Depth: ${n(input.depth.value)} ${input.depth.unit}`,
    `Allowance: ${input.allowancePercent}%`,
    `Required mulch: ${n(c.requiredCubicYards)} cu yd (${n(c.requiredCubicFeet)} cu ft)`,
    ...(c.bagsRequired === undefined
      ? []
      : [`Bagged: ${c.bagsRequired} bags; leftover ${n(c.bagLeftoverCubicFeet!)} cu ft`]),
    `Bulk: ${n(c.bulkOrderCubicYards)} cu yd; leftover ${n(c.bulkLeftoverCubicYards)} cu yd`,
    ...(c.bagCost === undefined
      ? []
      : [`Bagged material cost: ${formatMoney(c.bagCost, input.currency)}`]),
    ...(c.bulkCost === undefined
      ? []
      : [`Bulk material cost: ${formatMoney(c.bulkCost, input.currency)}`]),
    MULCH_URL,
  ].join('\n');
}
