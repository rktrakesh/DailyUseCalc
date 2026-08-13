import type { EstimateReportData, ReportMetric } from '../../../components/reports/EstimateReport';
import { createReportFilename } from '../../../lib/reports/reportFilename';
import { formatMoney } from '../gravel/currencies';
import { topsoilGuidance } from './recommendations';
import type { TopsoilCalculation, TopsoilInput } from './types';

const n = (value: number, digits = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
const projects: Record<TopsoilInput['projectType'], string> = {
  'garden-bed': 'Garden Bed',
  'new-lawn': 'New Lawn',
  topdressing: 'Lawn Topdressing / Leveling',
  'raised-bed': 'Raised Bed',
  'flower-bed': 'Flower Bed',
  'vegetable-garden': 'Vegetable Garden',
  landscaping: 'General Landscaping',
  other: 'Other',
};
const soils: Record<TopsoilInput['soilType'], string> = {
  screened: 'Screened Topsoil',
  unscreened: 'Unscreened Topsoil',
  'compost-blend': 'Topsoil / Compost Blend',
  'garden-soil': 'Garden Soil',
  other: 'Custom / Other',
};
const dimension = (value: TopsoilInput['length']) => `${n(value.value)} ${value.unit}`;

function measurements(input: TopsoilInput, calculation: TopsoilCalculation): ReportMetric[] {
  const geometry: ReportMetric[] =
    input.measureMode === 'area'
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
                  ];
  return [
    { label: 'Measure by', value: input.measureMode === 'area' ? 'Known Area' : 'Dimensions' },
    ...geometry,
    { label: 'Quantity', value: String(input.quantity) },
    {
      label: 'Total area',
      value:
        input.measurementSystem === 'metric'
          ? `${n(calculation.totalAreaSquareFeet * 0.09290304)} sq m / ${n(calculation.totalAreaSquareFeet)} sq ft`
          : `${n(calculation.totalAreaSquareFeet)} sq ft / ${n(calculation.totalAreaSquareFeet * 0.09290304)} sq m`,
    },
    { label: 'Depth', value: dimension(input.depth) },
  ];
}

export function createTopsoilEstimateReport(
  input: TopsoilInput,
  calculation: TopsoilCalculation,
  generatedAt = new Date(),
): EstimateReportData {
  const metric = input.measurementSystem === 'metric';
  const cubicMeters = (cubicFeet: number) => cubicFeet / 35.3146667215;
  const liters = (cubicFeet: number) => cubicFeet * 28.316846592;
  const bagRows: ReportMetric[] =
    calculation.bagsRequired === undefined
      ? []
      : [
          {
            label: 'Bag recommendation',
            value: `${calculation.bagsRequired} x ${n(input.bagVolume!)} ${input.bagVolumeUnit === 'liter' ? 'L' : 'cu ft'} bags`,
            emphasis: true,
          },
          {
            label: 'Purchased volume',
            value: metric
              ? `${n(liters(calculation.purchasedBagCubicFeet!), 0)} L`
              : `${n(calculation.purchasedBagCubicFeet!)} cu ft`,
          },
          {
            label: 'Estimated leftover',
            value: metric
              ? `${n(liters(calculation.bagLeftoverCubicFeet!))} L`
              : `${n(calculation.bagLeftoverCubicFeet!)} cu ft`,
          },
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
  const weightRows: ReportMetric[] =
    calculation.requiredWeight === undefined
      ? []
      : [
          {
            label: 'Required weight',
            value:
              input.measurementSystem === 'metric'
                ? `${n(calculation.requiredWeight.kilograms, 0)} kg / ${n(calculation.requiredWeight.metricTonnes)} metric tonnes`
                : `${n(calculation.requiredWeight.pounds, 0)} lb / ${n(calculation.requiredWeight.usTons)} US tons`,
            emphasis: true,
          },
          {
            label: 'Estimated ordered weight',
            value:
              input.measurementSystem === 'metric'
                ? `${n(calculation.orderedWeight!.kilograms, 0)} kg`
                : `${n(calculation.orderedWeight!.pounds, 0)} lb`,
          },
          {
            label: 'Supplier density',
            value: `${n(input.supplierDensity!)} ${input.densityUnit === 'kg-cu-m' ? 'kg/cu m' : 'lb/cu yd'}`,
          },
        ];
  return {
    documentTitle: createReportFilename('topsoil-estimate', generatedAt),
    reportTitle: 'TOPSOIL PROJECT ESTIMATE',
    generatedAt,
    projectName: 'Topsoil Project Estimate',
    projectTypeLabel: projects[input.projectType],
    primaryResult: {
      label: 'REQUIRED TOPSOIL',
      value:
        input.measurementSystem === 'metric'
          ? `${n(calculation.requiredCubicMeters)} cu m`
          : `${n(calculation.requiredCubicYards)} cu yd`,
      supportingText: 'Volume including allowance',
      confirmation:
        input.bagVolume !== undefined || input.bulkIncrement !== undefined
          ? 'Configured purchase quantities round upward.'
          : 'Exact volume shown; no purchase rounding applied.',
    },
    summary: [
      {
        label: 'Measurement system',
        value: input.measurementSystem === 'metric' ? 'Metric' : 'Imperial (US)',
      },
      { label: 'Allowance', value: `${input.allowancePercent}%` },
      { label: 'Soil type', value: soils[input.soilType] },
    ],
    sections: [],
    leftSections: [
      { title: 'PROJECT MEASUREMENTS', rows: measurements(input, calculation) },
      {
        title: 'VOLUME BREAKDOWN',
        rows: [
          {
            label: 'Base volume',
            value: metric
              ? `${n(cubicMeters(calculation.baseCubicFeet))} cu m`
              : `${n(calculation.baseCubicFeet)} cu ft`,
          },
          {
            label: 'Extra allowance',
            value: metric
              ? `${n(cubicMeters(calculation.allowanceCubicFeet))} cu m`
              : `${n(calculation.allowanceCubicFeet)} cu ft`,
          },
          {
            label: 'Total required',
            value: metric
              ? `${n(calculation.requiredCubicMeters)} cu m`
              : `${n(calculation.requiredCubicYards)} cu yd`,
            emphasis: true,
          },
        ],
      },
      ...(weightRows.length ? [{ title: 'WEIGHT ESTIMATE', rows: weightRows }] : []),
    ],
    rightSections: [
      {
        title: 'VOLUME CONVERSIONS',
        rows: metric
          ? [
              { label: 'Cubic meters', value: `${n(calculation.requiredCubicMeters)} cu m` },
              { label: 'Liters', value: `${n(calculation.requiredLiters, 0)} L` },
              { label: 'Cubic yards', value: `${n(calculation.requiredCubicYards)} cu yd` },
              { label: 'Cubic feet', value: `${n(calculation.requiredCubicFeet)} cu ft` },
            ]
          : [
              { label: 'Cubic yards', value: `${n(calculation.requiredCubicYards)} cu yd` },
              { label: 'Cubic feet', value: `${n(calculation.requiredCubicFeet)} cu ft` },
              { label: 'Cubic meters', value: `${n(calculation.requiredCubicMeters)} cu m` },
              { label: 'Liters', value: `${n(calculation.requiredLiters, 0)} L` },
            ],
      },
      ...(bagRows.length ? [{ title: 'BAGGED TOPSOIL', rows: bagRows }] : []),
      {
        title: 'BULK TOPSOIL',
        rows: [
          {
            label: input.bulkIncrement ? 'Suggested order' : 'Exact required quantity',
            value:
              input.measurementSystem === 'metric'
                ? `${n(calculation.bulkOrderCubicMeters)} cu m`
                : `${n(calculation.bulkOrderCubicYards)} cu yd`,
            emphasis: true,
          },
          {
            label: 'Estimated leftover',
            value: metric
              ? `${n(calculation.bulkLeftoverCubicYards * 0.764554857984)} cu m`
              : `${n(calculation.bulkLeftoverCubicYards)} cu yd`,
          },
          ...(calculation.bulkCost === undefined
            ? []
            : [
                {
                  label: 'Estimated material cost',
                  value: formatMoney(calculation.bulkCost, input.currency),
                  emphasis: true,
                },
              ]),
        ],
      },
    ],
    guidance: [
      { label: 'Project and soil guidance', value: topsoilGuidance(input) },
      {
        label: 'Coverage reference',
        value: metric
          ? `1 cu m covers about ${n(calculation.coveragePerCubicMeterSquareMeters)} sq m at the selected depth.`
          : `1 cu yd covers about ${n(calculation.coveragePerCubicYardSquareFeet)} sq ft at the selected depth.`,
      },
      ...(calculation.requiredWeight
        ? [
            {
              label: 'Hauling',
              value:
                "Actual loaded weight can vary. Confirm the supplier's loaded weight and your vehicle or trailer payload rating before hauling.",
            },
          ]
        : []),
    ],
    customSections:
      calculation.bagCost !== undefined && calculation.bulkCost !== undefined
        ? [
            {
              title: 'MATERIAL COST COMPARISON',
              content: `Bagged topsoil: ${formatMoney(calculation.bagCost, input.currency)}. Bulk topsoil: ${formatMoney(calculation.bulkCost, input.currency)}. Material costs only; delivery, taxes, minimum orders, and supplier fees may not be included.`,
            },
          ]
        : undefined,
    notice: {
      title: 'IMPORTANT',
      content:
        'Planning estimate only. Actual requirements and weight can vary with measurements, grade, moisture, composition, compaction, settling, handling, and supplier quantities.',
    },
    footerUrl: 'dailyusecalc.com/topsoil',
    compactLayout: true,
  };
}
