import { formatMoney } from '../gravel/currencies';
import { cubicFeetToCubicMeters, cubicFeetToCubicYards, squareFeetToArea } from './calculator';
import type { AreaUnit, PaverCalculation, PaverInput, ProjectType } from './types';

const number = (value: number, digits = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);

export const PAVER_URL = 'https://dailyusecalc.com/paver/';
export const areaUnitLabel = (unit: AreaUnit) =>
  ({ 'sq-ft': 'sq ft', 'sq-yd': 'sq yd', 'sq-m': 'sq m' })[unit];
export const projectLabel = (project: ProjectType) =>
  ({
    patio: 'Patio',
    walkway: 'Walkway / Path',
    driveway: 'Driveway',
    'pool-deck': 'Pool Deck',
    other: 'Other',
  })[project];

export function createPaverEstimateText(input: PaverInput, result: PaverCalculation) {
  const metric = input.measurementSystem === 'metric';
  const areaUnit: AreaUnit = metric ? 'sq-m' : 'sq-ft';
  return [
    'DailyUseCalc Paver Estimate',
    `Project: ${projectLabel(input.projectType)}`,
    `Project area: ${number(squareFeetToArea(result.projectAreaSquareFeet, areaUnit))} ${areaUnitLabel(areaUnit)}`,
    `Paver size: ${number(input.paverLength)} × ${number(input.paverWidth)} ${input.paverUnit}`,
    `Joint width: ${number(input.jointWidth, 3)} ${input.jointUnit}`,
    `Before waste: ${number(result.rawPavers)} pavers`,
    `Waste allowance: ${input.wastePercent}%`,
    `Pavers needed: ${result.requiredPavers}`,
    ...(result.baseVolumeCubicFeet === undefined
      ? []
      : metric
        ? [`Paver base: ${number(cubicFeetToCubicMeters(result.baseVolumeCubicFeet))} cu m`]
        : [
            `Paver base: ${number(cubicFeetToCubicYards(result.baseVolumeCubicFeet))} cu yd (${number(result.baseVolumeCubicFeet)} cu ft)`,
          ]),
    ...(result.sandVolumeCubicFeet === undefined
      ? []
      : metric
        ? [`Bedding sand: ${number(cubicFeetToCubicMeters(result.sandVolumeCubicFeet))} cu m`]
        : [
            `Bedding sand: ${number(cubicFeetToCubicYards(result.sandVolumeCubicFeet))} cu yd (${number(result.sandVolumeCubicFeet)} cu ft)`,
          ]),
    ...(result.estimatedCost === undefined
      ? []
      : [`Estimated paver cost: ${formatMoney(result.estimatedCost, input.currency)}`]),
    PAVER_URL,
  ].join('\n');
}

export { number as formatPaverNumber };
