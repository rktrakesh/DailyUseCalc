import { formatMoney } from '../gravel/currencies';
import type { TopsoilCalculation, TopsoilInput } from './types';

const n = (value: number, digits = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
export const TOPSOIL_URL = 'https://dailyusecalc.com/topsoil/';
export function createTopsoilEstimateText(input: TopsoilInput, calculation: TopsoilCalculation) {
  const metric = input.measurementSystem === 'metric';
  return [
    'DailyUseCalc Topsoil Estimate',
    `Project: ${input.projectType}`,
    `Total area: ${metric ? `${n(calculation.totalAreaSquareFeet * 0.09290304)} sq m` : `${n(calculation.totalAreaSquareFeet)} sq ft`}`,
    `Depth: ${n(input.depth.value)} ${input.depth.unit}`,
    `Allowance: ${input.allowancePercent}%`,
    `Required topsoil: ${metric ? `${n(calculation.requiredCubicMeters)} cu m (${n(calculation.requiredLiters, 0)} L)` : `${n(calculation.requiredCubicYards)} cu yd (${n(calculation.requiredCubicFeet)} cu ft)`}`,
    ...(calculation.bagsRequired === undefined
      ? []
      : [
          `Bagged: ${calculation.bagsRequired} bags; leftover ${metric ? `${n(calculation.bagLeftoverCubicFeet! * 28.316846592)} L` : `${n(calculation.bagLeftoverCubicFeet!)} cu ft`}`,
        ]),
    `Bulk: ${metric ? `${n(calculation.bulkOrderCubicMeters)} cu m; leftover ${n(calculation.bulkLeftoverCubicYards * 0.764554857984)} cu m` : `${n(calculation.bulkOrderCubicYards)} cu yd; leftover ${n(calculation.bulkLeftoverCubicYards)} cu yd`}`,
    ...(input.supplierDensity === undefined || calculation.requiredWeight === undefined
      ? []
      : [
          `Supplier density: ${n(input.supplierDensity)} ${input.densityUnit === 'kg-cu-m' ? 'kg/cu m' : 'lb/cu yd'}`,
          `Required weight: ${metric ? `${n(calculation.requiredWeight.kilograms, 0)} kg (${n(calculation.requiredWeight.metricTonnes)} metric tonnes)` : `${n(calculation.requiredWeight.pounds, 0)} lb (${n(calculation.requiredWeight.usTons)} US tons)`}`,
        ]),
    ...(calculation.bagCost === undefined
      ? []
      : [`Bagged material cost: ${formatMoney(calculation.bagCost, input.currency)}`]),
    ...(calculation.bulkCost === undefined
      ? []
      : [`Bulk material cost: ${formatMoney(calculation.bulkCost, input.currency)}`]),
    `Coverage: ${metric ? `1 cu m covers about ${n(calculation.coveragePerCubicMeterSquareMeters)} sq m` : `1 cu yd covers about ${n(calculation.coveragePerCubicYardSquareFeet)} sq ft`} at the selected depth`,
    TOPSOIL_URL,
  ].join('\n');
}
