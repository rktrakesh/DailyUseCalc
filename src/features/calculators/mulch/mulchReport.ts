import type { EstimateReportData, ReportMetric } from '../../../components/reports/EstimateReport';
import { createReportFilename } from '../../../lib/reports/reportFilename';
import { formatMoney } from '../gravel/currencies';
import { mulchGuidance } from './recommendations';
import type { MulchCalculation, MulchInput } from './types';

const n = (value: number, digits = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
const projectLabels: Record<MulchInput['projectType'], string> = {
  'garden-bed': 'Landscape / Garden Bed',
  'trees-shrubs': 'Around Trees / Shrubs',
  walkway: 'Path / Walkway',
  'play-area': 'Play Area',
  landscaping: 'General Landscaping',
  other: 'Custom / Other',
};
const mulchLabels: Record<MulchInput['mulchType'], string> = {
  hardwood: 'Shredded Hardwood',
  bark: 'Bark Mulch',
  'wood-chips': 'Wood Chips',
  cedar: 'Cedar Mulch',
  'pine-bark': 'Pine Bark',
  rubber: 'Rubber Mulch',
  compost: 'Compost / Organic Mulch',
  other: 'Other / Custom',
};
const dimension = (value: MulchInput['length']) => `${n(value.value)} ${value.unit}`;
export function createMulchEstimateReport(
  input: MulchInput,
  calculation: MulchCalculation,
  generatedAt = new Date(),
): EstimateReportData {
  const measurementRows: ReportMetric[] = [
    { label: 'Measure by', value: input.measureMode === 'area' ? 'Known Area' : 'Dimensions' },
    ...(input.measureMode === 'area'
      ? [
          {
            label: 'Entered area',
            value: `${n(input.knownArea)} ${input.areaUnit.replace('-', ' ')}`,
          },
        ]
      : input.shape === 'rectangle'
        ? [
            { label: 'Shape', value: 'Rectangle' },
            { label: 'Length', value: dimension(input.length) },
            { label: 'Width', value: dimension(input.width) },
          ]
        : input.shape === 'square'
          ? [
              { label: 'Shape', value: 'Square' },
              { label: 'Side', value: dimension(input.side) },
            ]
          : input.shape === 'circle'
            ? [
                { label: 'Shape', value: 'Circle' },
                { label: 'Diameter', value: dimension(input.diameter) },
              ]
            : input.shape === 'triangle'
              ? [
                  { label: 'Shape', value: 'Triangle' },
                  { label: 'Base', value: dimension(input.base) },
                  { label: 'Perpendicular height', value: dimension(input.perpendicularHeight) },
                ]
              : input.shape === 'trapezoid'
                ? [
                    { label: 'Shape', value: 'Trapezoid' },
                    { label: 'Parallel side A', value: dimension(input.sideA) },
                    { label: 'Parallel side B', value: dimension(input.sideB) },
                    { label: 'Perpendicular height', value: dimension(input.perpendicularHeight) },
                  ]
                : [
                    { label: 'Shape', value: 'Ring / Donut' },
                    { label: 'Outer diameter', value: dimension(input.outerDiameter) },
                    { label: 'Inner diameter', value: dimension(input.innerDiameter) },
                  ]),
    {
      label: 'Calculated area',
      value: `${n(calculation.areaSquareFeet)} sq ft / ${n(calculation.areaSquareFeet * 0.09290304)} sq m`,
    },
    { label: 'Depth', value: `${n(input.depth.value)} ${input.depth.unit}` },
  ];
  const bagRows: ReportMetric[] =
    calculation.bagsRequired === undefined
      ? []
      : [
          {
            label: 'Bag recommendation',
            value: `${calculation.bagsRequired} x ${n(input.bagVolume!)} ${input.bagVolumeUnit === 'liter' ? 'L' : 'cu ft'} bags`,
            emphasis: true,
          },
          { label: 'Purchased volume', value: `${n(calculation.purchasedBagCubicFeet!)} cu ft` },
          { label: 'Estimated leftover', value: `${n(calculation.bagLeftoverCubicFeet!)} cu ft` },
          ...(calculation.bagCost === undefined
            ? []
            : [
                {
                  label: 'Estimated material cost',
                  value: formatMoney(calculation.bagCost, input.currency),
                  emphasis: true,
                },
              ]),
        ];
  const bulkRows: ReportMetric[] = [
    {
      label: input.bulkIncrementCubicYards ? 'Suggested order' : 'Exact required quantity',
      value: `${n(calculation.bulkOrderCubicYards)} cu yd`,
      emphasis: true,
    },
    ...(input.bulkIncrementCubicYards
      ? [{ label: 'Order increment', value: `${n(input.bulkIncrementCubicYards)} cu yd` }]
      : []),
    { label: 'Estimated leftover', value: `${n(calculation.bulkLeftoverCubicYards)} cu yd` },
    ...(calculation.bulkCost === undefined
      ? []
      : [
          {
            label: 'Estimated material cost',
            value: formatMoney(calculation.bulkCost, input.currency),
            emphasis: true,
          },
        ]),
  ];
  return {
    documentTitle: createReportFilename('mulch-estimate', generatedAt),
    reportTitle: 'MULCH PROJECT ESTIMATE',
    generatedAt,
    projectName: 'Mulch Project Estimate',
    projectTypeLabel: projectLabels[input.projectType],
    primaryResult: {
      label: 'REQUIRED MULCH',
      value:
        input.measurementSystem === 'metric'
          ? `${n(calculation.requiredCubicMeters)} cu m`
          : `${n(calculation.requiredCubicYards)} cu yd`,
      supportingText: 'Volume including allowance',
      confirmation: 'Configured bag and bulk quantities round upward.',
    },
    summary: [
      {
        label: 'Measurement system',
        value: input.measurementSystem === 'metric' ? 'Metric' : 'Imperial (US)',
      },
      { label: 'Measure by', value: input.measureMode === 'area' ? 'Known Area' : 'Dimensions' },
      { label: 'Allowance', value: `${input.allowancePercent}%` },
      { label: 'Mulch type', value: mulchLabels[input.mulchType] },
    ],
    sections: [],
    leftSections: [
      {
        title: 'PROJECT MEASUREMENTS',
        rows: measurementRows,
      },
      {
        title: 'VOLUME BREAKDOWN',
        rows: [
          { label: 'Base volume', value: `${n(calculation.baseCubicFeet)} cu ft` },
          { label: 'Extra allowance', value: `${n(calculation.allowanceCubicFeet)} cu ft` },
          {
            label: 'Total required',
            value: `${n(calculation.requiredCubicYards)} cu yd`,
            emphasis: true,
          },
        ],
      },
    ],
    rightSections: [
      {
        title: 'VOLUME CONVERSIONS',
        rows: [
          { label: 'Cubic yards', value: `${n(calculation.requiredCubicYards)} cu yd` },
          { label: 'Cubic feet', value: `${n(calculation.requiredCubicFeet)} cu ft` },
          { label: 'Cubic meters', value: `${n(calculation.requiredCubicMeters)} cu m` },
          { label: 'Liters', value: `${n(calculation.requiredLiters, 0)} L` },
        ],
      },
      ...(bagRows.length ? [{ title: 'BAGGED MULCH', rows: bagRows }] : []),
      { title: 'BULK MULCH', rows: bulkRows },
    ],
    guidance: [
      { label: 'Project guidance', value: mulchGuidance(input) },
      {
        label: 'Supplier quantities',
        value:
          'Supplier minimum orders, available bag sizes, and bulk increments vary; confirm before purchasing.',
      },
    ],
    customSections:
      calculation.bagCost !== undefined && calculation.bulkCost !== undefined
        ? [
            {
              title: 'MATERIAL COST COMPARISON',
              content: `Bagged mulch: ${formatMoney(calculation.bagCost, input.currency)}. Bulk mulch: ${formatMoney(calculation.bulkCost, input.currency)}. Material costs only; delivery, minimum orders, taxes, and supplier charges may change the actual total.`,
            },
          ]
        : undefined,
    notice: {
      title: 'IMPORTANT',
      content:
        'Planning estimate only. Actual requirements and material costs can vary with measurements, grade, existing material, settling, installation, supplier quantities, delivery, taxes, and fees.',
    },
    footerUrl: 'dailyusecalc.com/mulch',
    compactLayout: true,
  };
}
