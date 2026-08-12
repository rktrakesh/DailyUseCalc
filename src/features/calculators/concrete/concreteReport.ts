import type { EstimateReportData, ReportMetric } from '../../../components/reports/EstimateReport';
import { createReportFilename } from '../../../lib/reports/reportFilename';
import { formatMoney } from '../gravel/currencies';
import { adjustedConcreteVolumeConversions } from './calculator';
import { concreteBagPreset } from './bagPresets';
import { concreteBagSizeLabel } from './bagUnits';
import type {
  ConcreteCalculation,
  ConcreteInput,
  ConcreteRecommendation,
  MeasurementSystem,
} from './types';

const modeLabels = {
  slab: 'Slab / Rectangle',
  'circular-pad': 'Circular Pad',
  column: 'Column / Pier',
  'post-hole': 'Post Hole',
} as const;
const number = (value: number, digits = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);

export function createConcreteEstimateReport({
  calculation,
  input,
  recommendation,
  measurementSystem,
  generatedAt,
}: {
  calculation: ConcreteCalculation;
  input: ConcreteInput;
  recommendation: ConcreteRecommendation;
  measurementSystem: MeasurementSystem;
  generatedAt?: Date;
}): EstimateReportData {
  const reportGeneratedAt = generatedAt ?? new Date();
  const adjusted = adjustedConcreteVolumeConversions(calculation.adjustedVolumeCubicYards);
  const preset = concreteBagPreset(input.bagPreset);
  const bagSize = concreteBagSizeLabel({
    presetLabel: preset.label,
    customWeight: input.customBagWeight,
    customWeightUnit: input.customBagWeightUnit,
  });
  const measurements: ReportMetric[] =
    input.concreteMode === 'slab'
      ? [
          { label: 'Length', value: `${number(input.length.value)} ${input.length.unit}` },
          { label: 'Width', value: `${number(input.width.value)} ${input.width.unit}` },
          { label: 'Thickness', value: `${number(input.thickness.value)} ${input.thickness.unit}` },
        ]
      : input.concreteMode === 'circular-pad'
        ? [
            { label: 'Diameter', value: `${number(input.diameter.value)} ${input.diameter.unit}` },
            {
              label: 'Thickness',
              value: `${number(input.thickness.value)} ${input.thickness.unit}`,
            },
          ]
        : input.concreteMode === 'column'
          ? [
              {
                label: 'Diameter',
                value: `${number(input.diameter.value)} ${input.diameter.unit}`,
              },
              { label: 'Height', value: `${number(input.height.value)} ${input.height.unit}` },
            ]
          : [
              {
                label: 'Hole diameter',
                value: `${number(input.holeDiameter.value)} ${input.holeDiameter.unit}`,
              },
              {
                label: 'Hole depth',
                value: `${number(input.holeDepth.value)} ${input.holeDepth.unit}`,
              },
            ];
  measurements.push({ label: 'Quantity', value: number(input.quantity, 0) });
  const purchasing: ReportMetric[] = [
    ...(input.readyMixPricePerCubicYard === undefined
      ? []
      : [
          {
            label: 'Ready-mix price / yd³',
            value: formatMoney(input.readyMixPricePerCubicYard, input.currency, undefined, 2),
          },
        ]),
    ...(input.readyMixDeliveryFee === undefined
      ? []
      : [
          {
            label: 'Delivery fee',
            value: formatMoney(input.readyMixDeliveryFee, input.currency, undefined, 2),
          },
        ]),
    { label: 'Bag size', value: bagSize ?? 'Custom' },
    { label: 'Bag yield', value: `${number(calculation.bagYieldCubicFeet, 3)} ft³ / bag` },
    { label: 'Bags', value: `${number(calculation.bagCount, 0)} bags` },
    ...(input.bagPrice === undefined
      ? []
      : [
          {
            label: 'Price / bag',
            value: formatMoney(input.bagPrice, input.currency, undefined, 2),
          },
        ]),
    ...(calculation.estimatedReadyMixCost === undefined
      ? []
      : [
          {
            label: 'Ready-mix cost',
            value: formatMoney(calculation.estimatedReadyMixCost, input.currency, undefined, 2),
            emphasis: true,
          },
        ]),
    ...(calculation.estimatedBagCost === undefined
      ? []
      : [
          {
            label: 'Bag cost',
            value: formatMoney(calculation.estimatedBagCost, input.currency, undefined, 2),
            emphasis: true,
          },
        ]),
  ];
  const projectMeasurements = { title: 'PROJECT MEASUREMENTS', rows: measurements };
  const volumeConversions = {
    title: 'VOLUME (WITH ALLOWANCE)',
    rows: [
      { label: 'Cubic yards', value: `${number(adjusted.cubicYards)} yd³` },
      { label: 'Cubic feet', value: `${number(adjusted.cubicFeet)} ft³` },
      { label: 'Cubic meters', value: `${number(adjusted.cubicMeters)} m³` },
      { label: 'Liters', value: `${number(adjusted.liters, 0)} L` },
    ],
  };
  const estimateResults = {
    title: 'ESTIMATE RESULTS',
    rows: [
      { label: 'Measured volume', value: `${number(calculation.volumeCubicYards)} yd³` },
      { label: 'Extra allowance', value: `+${number(calculation.allowanceVolumeCubicYards)} yd³` },
      {
        label: 'Volume with allowance',
        value: `${number(calculation.adjustedVolumeCubicYards)} yd³`,
      },
      {
        label: 'Recommended order',
        value: `${calculation.recommendedOrderCubicYards.toFixed(1)} yd³`,
        emphasis: true,
      },
      {
        label: 'Estimated weight',
        value: `${number(calculation.estimatedWeightPounds / 2000)} short tons`,
      },
    ],
  };
  const weight = {
    title: 'ESTIMATED WEIGHT',
    rows: [
      {
        label: 'Short tons',
        value: `${number(calculation.estimatedWeightPounds / 2000)} short tons`,
      },
      { label: 'Pounds', value: `${number(calculation.estimatedWeightPounds, 0)} lb` },
      { label: 'Kilograms', value: `${number(calculation.estimatedWeightKilograms, 0)} kg` },
      {
        label: 'Metric tons',
        value: `${number(calculation.estimatedWeightKilograms / 1000)} metric tons`,
      },
    ],
  };
  return {
    documentTitle: createReportFilename('concrete', reportGeneratedAt),
    reportTitle: 'CONCRETE ESTIMATE',
    generatedAt: reportGeneratedAt,
    projectName: 'Concrete Project Estimate',
    projectTypeLabel: modeLabels[input.concreteMode],
    primaryResult: {
      label: 'RECOMMENDED ORDER',
      value: `${calculation.recommendedOrderCubicYards.toFixed(1)} yd³`,
      supportingText: 'Suggested order quantity',
      confirmation: 'Supplier minimums and ordering increments may vary.',
    },
    summary: [
      { label: 'Concrete type', value: modeLabels[input.concreteMode] },
      {
        label: 'Measurement system',
        value: measurementSystem === 'imperial' ? 'Imperial (US)' : 'Metric',
      },
      { label: 'Quantity', value: number(input.quantity, 0) },
      { label: 'Allowance', value: `${input.allowancePercent}%` },
      { label: 'Typical density', value: '145 lb/ft³' },
    ],
    sections: [projectMeasurements, volumeConversions, estimateResults, weight],
    leftSections: [projectMeasurements, volumeConversions],
    rightSections: [estimateResults, weight],
    customSections: [
      {
        title: `WHY ${calculation.recommendedOrderCubicYards.toFixed(1)} YD³?`,
        content: recommendation.explanation,
      },
    ],
    additionalDetails: purchasing,
    guidance: [
      { label: 'Mode', value: recommendation.modeGuidance },
      { label: 'Supplier', value: recommendation.supplierGuidance },
    ],
    warnings: recommendation.warnings.length ? recommendation.warnings : undefined,
    notice: {
      title: 'IMPORTANT',
      content:
        'Estimate only. This calculator does not provide structural engineering advice. Actual requirements vary with forms, subgrade, placement, spillage, product yield, and supplier specifications.',
    },
    footerUrl: 'dailyusecalc.com/concrete',
  };
}
