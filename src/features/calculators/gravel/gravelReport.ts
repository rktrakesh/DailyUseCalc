import type { EstimateReportData, ReportMetric } from '../../../components/reports/EstimateReport';
import { createReportFilename } from '../../../lib/reports/reportFilename';
import { adjustedVolumeConversions } from './calculator';
import { formatMoney } from './currencies';
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
  const reportGeneratedAt = generatedAt ?? new Date();
  const adjusted = adjustedVolumeConversions(calculation.adjustedVolumeCubicYards);
  const recommendedOrder = calculation.recommendedOrderCubicYards.toFixed(1);
  const shape = input.areaShape === 'circle' ? 'Circle' : 'Rectangle';
  const area =
    measurementSystem === 'metric'
      ? `${number(calculation.surfaceAreaSquareFeet * 0.09290304)} m²`
      : `${number(calculation.surfaceAreaSquareFeet)} ft²`;

  const measurementRows: ReportMetric[] =
    input.inputMode === 'volume'
      ? [{ label: 'Volume', value: `${number(input.knownVolume.value)} ${input.knownVolume.unit}` }]
      : input.inputMode === 'area'
        ? [
            { label: 'Area', value: `${number(input.knownArea.value)} ${input.knownArea.unit}` },
            { label: 'Depth', value: `${number(input.depth.value)} ${input.depth.unit}` },
          ]
        : [
            { label: 'Shape', value: shape },
            ...(input.areaShape === 'circle'
              ? [
                  {
                    label: 'Diameter',
                    value: `${number(input.diameter.value)} ${input.diameter.unit}`,
                  },
                ]
              : [
                  {
                    label: 'Length',
                    value: `${number(input.length.value)} ${input.length.unit}`,
                  },
                  {
                    label: 'Width',
                    value: `${number(input.width.value)} ${input.width.unit}`,
                  },
                ]),
            { label: 'Depth', value: `${number(input.depth.value)} ${input.depth.unit}` },
            { label: 'Calculated area', value: area },
          ];

  const projectMeasurements = { title: 'PROJECT MEASUREMENTS', rows: measurementRows };
  const estimateResults = {
    title: 'ESTIMATE RESULTS',
    rows: [
      { label: 'Measured volume', value: `${number(calculation.volumeCubicYards)} yd³` },
      { label: 'Extra allowance', value: `+${number(calculation.allowanceVolumeCubicYards)} yd³` },
      {
        label: 'Volume with allowance',
        value: `${number(calculation.adjustedVolumeCubicYards)} yd³`,
      },
      { label: 'Recommended order', value: `${recommendedOrder} yd³`, emphasis: true },
      { label: 'Estimated weight', value: `${number(calculation.estimatedWeightTons)} short tons` },
    ],
  };
  const volumeConversions = {
    title: 'VOLUME (WITH ALLOWANCE)',
    rows: [
      { label: 'Cubic yards', value: `${number(adjusted.cubicYards)} yd³` },
      { label: 'Cubic feet', value: `${number(adjusted.cubicFeet)} ft³` },
      { label: 'Cubic meters', value: `${number(adjusted.cubicMeters)} m³` },
      { label: 'Liters', value: `${number(adjusted.liters, 0)} L` },
    ],
  };
  const weightConversions = {
    title: 'ESTIMATED WEIGHT',
    rows: [
      { label: 'Short tons', value: `${number(calculation.estimatedWeightTons)} short tons` },
      { label: 'Pounds', value: `${number(calculation.estimatedWeightTons * 2_000, 0)} lb` },
      { label: 'Kilograms', value: `${number(calculation.estimatedWeightKilograms, 0)} kg` },
      {
        label: 'Metric tons',
        value: `${number(calculation.estimatedWeightKilograms / 1_000)} metric tons`,
      },
    ],
  };

  const purchasingDetails: ReportMetric[] = [
    ...(input.pricePerCubicYard !== undefined
      ? [
          {
            label: 'Price / yd³',
            value: formatMoney(input.pricePerCubicYard, input.currency, undefined, 2),
          },
        ]
      : []),
    ...(input.deliveryFee !== undefined
      ? [
          {
            label: 'Delivery fee',
            value: formatMoney(input.deliveryFee, input.currency, undefined, 2),
          },
        ]
      : []),
    ...(input.bagPrice !== undefined
      ? [
          {
            label: 'Price / bag',
            value: formatMoney(input.bagPrice, input.currency, undefined, 2),
          },
        ]
      : []),
    ...(calculation.bagCount !== undefined
      ? [{ label: 'Bags', value: `${number(calculation.bagCount, 0)} bags` }]
      : []),
    ...(calculation.truckLoads !== undefined
      ? [
          {
            label: 'Truck loads',
            value: `${number(calculation.truckLoads, 0)} load${calculation.truckLoads === 1 ? '' : 's'}`,
          },
        ]
      : []),
    ...(calculation.estimatedCost !== undefined
      ? [
          {
            label: 'Estimated cost',
            value: formatMoney(calculation.estimatedCost, input.currency, undefined, 2),
            emphasis: true,
          },
        ]
      : []),
    ...(notes?.trim() ? [{ label: 'Notes', value: notes.trim() }] : []),
  ];

  return {
    documentTitle: createReportFilename('gravel', reportGeneratedAt),
    reportTitle: 'GRAVEL ESTIMATE',
    generatedAt: reportGeneratedAt,
    projectName: projectName?.trim() || 'Gravel Project Estimate',
    projectTypeLabel: projectLabels[input.projectType],
    primaryResult: {
      label: 'RECOMMENDED ORDER',
      value: `${recommendedOrder} yd³`,
      supportingText: 'Suggested order quantity',
      confirmation: 'Minimal upward rounding to 0.1 yd³; supplier order increments may vary.',
    },
    summary: [
      { label: 'Input method', value: input.inputMode[0].toUpperCase() + input.inputMode.slice(1) },
      ...(input.inputMode === 'dimensions' ? [{ label: 'Shape', value: shape }] : []),
      { label: 'Gravel type', value: gravelLabels[input.gravelType] },
      {
        label: 'Measurement system',
        value: measurementSystem === 'metric' ? 'Metric' : 'Imperial (US)',
      },
      { label: 'Allowance', value: `${input.allowancePercent}%` },
      { label: 'Density', value: `${number(calculation.densityTonsPerYard)} tons/yd³` },
    ],
    sections: [projectMeasurements, volumeConversions, estimateResults, weightConversions],
    leftSections: [projectMeasurements, volumeConversions],
    rightSections: [estimateResults, weightConversions],
    customSections: [
      {
        title: `WHY ${recommendedOrder} YD³?`,
        content: recommendation.explanation,
      },
    ],
    additionalDetails: purchasingDetails.length ? purchasingDetails : undefined,
    guidance: [
      ...(input.inputMode === 'volume'
        ? []
        : [{ label: 'Depth', value: recommendation.depthGuidance }]),
      { label: 'Material', value: recommendation.materialGuidance },
    ],
    warnings: recommendation.warnings.length ? recommendation.warnings : undefined,
    notice: {
      title: 'IMPORTANT',
      content:
        'Estimate only. Actual requirements can vary with density, moisture, compaction, site conditions, measurements, installation conditions, and supplier specifications.',
    },
    footerUrl: 'dailyusecalc.com/gravel',
  };
}
