import type { EstimateReportData } from '../../../components/reports/EstimateReport';
import type {
  GravelCalculation,
  GravelInput,
  GravelRecommendation,
  MeasurementSystem,
} from './types';

export interface GravelReportOptions {
  calculation: GravelCalculation;
  input: GravelInput;
  recommendation: GravelRecommendation;
  measurementSystem: MeasurementSystem;
  projectName?: string;
  notes?: string;
  generatedAt?: Date;
}

const projectLabels = {
  driveway: 'Driveway',
  walkway: 'Walkway / Path',
  patio: 'Patio Base',
  landscaping: 'Decorative Landscaping',
  'french-drain': 'French Drain',
  'shed-base': 'Shed Base',
  other: 'Other',
} as const;
const gravelLabels = {
  'crushed-stone': 'Crushed Stone',
  'pea-gravel': 'Pea Gravel',
  'river-rock': 'River Rock',
  limestone: 'Limestone',
  granite: 'Granite Gravel',
  custom: 'Custom Material',
} as const;
const number = (value: number, digits = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);

export function createGravelEstimateReport({
  calculation,
  input,
  recommendation,
  measurementSystem,
  projectName,
  notes,
  generatedAt,
}: GravelReportOptions): EstimateReportData {
  const metric = measurementSystem === 'metric';
  const volume = metric
    ? `${number(calculation.volumeCubicMeters)} m³`
    : `${number(calculation.volumeCubicYards)} yd³`;
  const adjusted = metric
    ? `${number(calculation.adjustedVolumeCubicYards * 0.764554858)} m³`
    : `${number(calculation.adjustedVolumeCubicYards)} yd³`;
  const allowance = metric
    ? `${number(calculation.allowanceVolumeCubicYards * 0.764554858)} m³`
    : `${number(calculation.allowanceVolumeCubicYards)} yd³`;
  const weight = metric
    ? `${number(calculation.estimatedWeightKilograms / 1000)} tonnes`
    : `${number(calculation.estimatedWeightTons)} tons`;
  const area = metric
    ? `${number(calculation.surfaceAreaSquareFeet * 0.09290304)} m²`
    : `${number(calculation.surfaceAreaSquareFeet)} ft²`;
  const factor = (1 + input.allowancePercent / 100).toFixed(2);
  const recommendedOrder = calculation.recommendedOrderCubicYards.toFixed(1);
  return {
    documentTitle: 'dailyusecalc-gravel-estimate',
    reportTitle: 'GRAVEL ESTIMATE',
    generatedAt: generatedAt ?? new Date(),
    projectName: projectName?.trim() || 'Gravel Project Estimate',
    projectTypeLabel: projectLabels[input.projectType],
    primaryResult: {
      label: 'RECOMMENDED ORDER',
      value: `${recommendedOrder} yd³`,
      supportingText: 'Practical quantity to order',
      confirmation: 'Minimal upward rounding to 0.1 yd³; supplier order increments may vary.',
    },
    summary: [
      { label: 'Gravel type', value: gravelLabels[input.gravelType] },
      { label: 'Measurement system', value: metric ? 'Metric' : 'Imperial (US)' },
      { label: 'Allowance', value: `${input.allowancePercent}%` },
      { label: 'Estimated weight', value: weight },
    ],
    sections: [
      {
        title: 'PROJECT MEASUREMENTS',
        rows: [
          { label: 'Length', value: `${number(input.length.value)} ${input.length.unit}` },
          { label: 'Width', value: `${number(input.width.value)} ${input.width.unit}` },
          { label: 'Depth', value: `${number(input.depth.value)} ${input.depth.unit}` },
          { label: 'Area', value: area },
          { label: 'Volume', value: `${volume} (calculated)` },
        ],
      },
      {
        title: 'ESTIMATE BREAKDOWN',
        rows: [
          { label: 'Calculated need', value: volume },
          { label: `Allowance (${input.allowancePercent}%)`, value: `+ ${allowance}` },
          { label: 'Total with allowance', value: adjusted },
          {
            label: 'Recommended order',
            value: `${recommendedOrder} yd³`,
            emphasis: true,
          },
          { label: 'Estimated weight', value: weight },
        ],
      },
    ],
    customSections: [
      {
        title: `WHY ${recommendedOrder} YD³?`,
        contentHtml: `<p>${recommendation.explanation}</p><div class="equation"><div class="equation-box"><strong>${volume}</strong>Calculated need</div><span class="equation-symbol">×</span><div class="equation-box"><strong>${factor}</strong>Allowance factor</div><span class="equation-symbol">=</span><div class="equation-box"><strong>${adjusted}</strong>Total</div></div><div class="equation-result"><strong>${recommendedOrder} yd³</strong>Recommended Order (Rounded to 0.1 yd³)</div>`,
      },
    ],
    additionalDetails: [
      {
        label: 'Estimated cost',
        value:
          calculation.estimatedCost === undefined
            ? '—'
            : new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              }).format(calculation.estimatedCost),
      },
      {
        label: 'Bags',
        value: calculation.bagCount === undefined ? '—' : `${number(calculation.bagCount, 0)} bags`,
      },
      {
        label: 'Truck loads',
        value:
          calculation.truckLoads === undefined
            ? '—'
            : `${number(calculation.truckLoads, 0)} truck load${calculation.truckLoads === 1 ? '' : 's'}`,
      },
      ...(notes?.trim() ? [{ label: 'Notes', value: notes.trim() }] : []),
    ],
    notice: {
      title: 'IMPORTANT',
      content:
        'This estimate is intended for planning purposes. Actual material requirements can vary based on ground conditions, compaction, installation method, and supplier specifications.',
    },
    footerUrl: 'dailyusecalc.com/gravel',
  };
}
