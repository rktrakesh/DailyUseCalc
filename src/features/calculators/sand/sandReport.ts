import type { EstimateReportData, ReportMetric } from '../../../components/reports/EstimateReport';
import { createReportFilename } from '../../../lib/reports/reportFilename';
import { formatMoney } from '../gravel/currencies';
import { formatSandUnit } from './estimateSummary';
import { sandGuidance } from './recommendations';
import type { SandCalculation, SandInput } from './types';
const n = (v: number, d = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(v);
const projects: Record<SandInput['projectType'], string> = {
  'paver-bedding': 'Paver Bedding',
  sandbox: 'Sandbox / Play Area',
  landscaping: 'Landscaping / Leveling',
  topdressing: 'Lawn Topdressing',
  'pool-base': 'Pool Base',
  backfill: 'Backfill / Fill',
  'concrete-mortar': 'Concrete / Mortar',
  other: 'Other',
};
const sands: Record<SandInput['sandType'], string> = {
  'all-purpose': 'All-Purpose Sand',
  'concrete-sharp': 'Concrete / Sharp Sand',
  masonry: 'Masonry Sand',
  play: 'Play Sand',
  fill: 'Fill Sand',
  'paver-bedding': 'Paver / Bedding Sand',
  other: 'Custom / Other',
};
const dimension = (d: SandInput['length']) => `${n(d.value)} ${d.unit}`;
function measurements(input: SandInput, c: SandCalculation): ReportMetric[] {
  const geometry: ReportMetric[] =
    input.measureMode === 'area'
      ? [{ label: 'Entered area', value: `${n(input.knownArea)} ${input.areaUnit}` }]
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
          ? `${n(c.totalAreaSquareFeet / 10.7639104167)} sq m / ${n(c.totalAreaSquareFeet)} sq ft`
          : `${n(c.totalAreaSquareFeet)} sq ft / ${n(c.totalAreaSquareFeet / 10.7639104167)} sq m`,
    },
    { label: 'Depth', value: dimension(input.depth) },
  ];
}
export function createSandEstimateReport(
  input: SandInput,
  c: SandCalculation,
  generatedAt = new Date(),
): EstimateReportData {
  const metric = input.measurementSystem === 'metric';
  const bagRows: ReportMetric[] =
    c.bagsRequired === undefined
      ? []
      : [
          {
            label: 'Bag recommendation',
            value: `${c.bagsRequired} x ${n(input.bagSize!)} ${formatSandUnit(input.bagUnit)} bags`,
            emphasis: true,
          },
          {
            label: 'Purchased amount',
            value: `${n(c.bagPurchasedAmount!)} ${formatSandUnit(input.bagUnit)}`,
          },
          {
            label: 'Estimated leftover',
            value: `${n(c.bagLeftoverAmount!)} ${formatSandUnit(input.bagUnit)}`,
          },
          ...(c.bagCost === undefined
            ? []
            : [
                {
                  label: 'Estimated material cost',
                  value: formatMoney(c.bagCost, input.currency),
                  emphasis: true,
                },
              ]),
        ];
  return {
    documentTitle: createReportFilename('sand-estimate', generatedAt),
    reportTitle: 'SAND PROJECT ESTIMATE',
    generatedAt,
    projectName: 'Sand Project Estimate',
    projectTypeLabel: projects[input.projectType],
    primaryResult: {
      label: 'REQUIRED SAND',
      value: metric ? `${n(c.requiredCubicMeters)} cu m` : `${n(c.requiredCubicYards)} cu yd`,
      supportingText: 'Volume including allowance and compaction',
      confirmation:
        input.bagSize !== undefined || input.bulkIncrement !== undefined
          ? 'Configured purchase quantities round upward.'
          : 'Exact bulk quantity shown; no purchase increment applied.',
    },
    summary: [
      { label: 'Measurement system', value: metric ? 'Metric' : 'Imperial (US)' },
      { label: 'Sand type', value: sands[input.sandType] },
      {
        label: 'Density',
        value: `${n(c.densityPoundsPerCubicYard, 0)} lb/cu yd (${c.densitySource})`,
      },
    ],
    sections: [],
    leftSections: [
      { title: 'PROJECT MEASUREMENTS', rows: measurements(input, c) },
      {
        title: 'VOLUME BREAKDOWN',
        rows: [
          {
            label: 'Base volume',
            value: metric
              ? `${n(c.baseCubicFeet / 35.3146667215)} cu m`
              : `${n(c.baseCubicFeet)} cu ft`,
          },
          {
            label: `Allowance (${input.allowancePercent}%)`,
            value: metric
              ? `${n(c.allowanceCubicFeet / 35.3146667215)} cu m`
              : `${n(c.allowanceCubicFeet)} cu ft`,
          },
          {
            label: `Compaction (${input.compactionPercent}%)`,
            value: metric
              ? `${n(c.compactionCubicFeet / 35.3146667215)} cu m`
              : `${n(c.compactionCubicFeet)} cu ft`,
          },
          {
            label: 'Total required',
            value: metric ? `${n(c.requiredCubicMeters)} cu m` : `${n(c.requiredCubicYards)} cu yd`,
            emphasis: true,
          },
        ],
      },
      {
        title: 'ESTIMATED WEIGHT',
        rows: [
          {
            label: 'Required weight',
            value: metric
              ? `${n(c.requiredWeight.kilograms, 0)} kg / ${n(c.requiredWeight.metricTonnes)} metric tonnes`
              : `${n(c.requiredWeight.usTons)} US tons / ${n(c.requiredWeight.pounds, 0)} lb`,
            emphasis: true,
          },
          ...(input.bulkIncrement === undefined
            ? []
            : [
                {
                  label: 'Estimated ordered weight',
                  value: metric
                    ? `${n(c.orderedWeight!.kilograms, 0)} kg`
                    : `${n(c.orderedWeight!.pounds, 0)} lb`,
                },
              ]),
        ],
      },
    ],
    rightSections: [
      {
        title: 'VOLUME CONVERSIONS',
        rows: metric
          ? [
              { label: 'Cubic meters', value: `${n(c.requiredCubicMeters)} cu m` },
              { label: 'Liters', value: `${n(c.requiredLiters, 0)} L` },
              { label: 'Cubic yards', value: `${n(c.requiredCubicYards)} cu yd` },
              { label: 'Cubic feet', value: `${n(c.requiredCubicFeet)} cu ft` },
            ]
          : [
              { label: 'Cubic yards', value: `${n(c.requiredCubicYards)} cu yd` },
              { label: 'Cubic feet', value: `${n(c.requiredCubicFeet)} cu ft` },
              { label: 'Cubic meters', value: `${n(c.requiredCubicMeters)} cu m` },
              { label: 'Liters', value: `${n(c.requiredLiters, 0)} L` },
            ],
      },
      ...(bagRows.length ? [{ title: 'BAGGED SAND', rows: bagRows }] : []),
      {
        title: 'BULK SAND',
        rows: [
          {
            label: input.bulkIncrement ? 'Suggested order' : 'Exact required quantity',
            value: `${n(c.bulkOrderAmount)} ${formatSandUnit(input.bulkUnit)}`,
            emphasis: true,
          },
          {
            label: 'Estimated leftover',
            value: `${n(c.bulkLeftoverAmount)} ${formatSandUnit(input.bulkUnit)}`,
          },
          ...(c.bulkCost === undefined
            ? []
            : [
                {
                  label: 'Estimated material cost',
                  value: formatMoney(c.bulkCost, input.currency),
                  emphasis: true,
                },
              ]),
        ],
      },
    ],
    guidance: [
      { label: 'Project and material guidance', value: sandGuidance(input) },
      {
        label: 'Coverage reference',
        value: metric
          ? `1 cu m covers about ${n(c.coveragePerCubicMeterSquareMeters)} sq m at the selected depth.`
          : `1 cu yd covers about ${n(c.coveragePerCubicYardSquareFeet)} sq ft at the selected depth.`,
      },
    ],
    customSections:
      c.bagCost !== undefined && c.bulkCost !== undefined
        ? [
            {
              title: 'MATERIAL COST COMPARISON',
              content: `Bagged sand: ${formatMoney(c.bagCost, input.currency)}. Bulk sand: ${formatMoney(c.bulkCost, input.currency)}. Difference: ${formatMoney(Math.abs(c.bagCost - c.bulkCost), input.currency)}. Material costs only; delivery, taxes, minimum orders, and regional pricing may not be included.`,
            },
          ]
        : undefined,
    notice: {
      title: 'IMPORTANT',
      content:
        'Planning estimate only. Sand weight varies with moisture, grading, compaction, and supplier material. Confirm material, quantities, and load limits with your supplier.',
    },
    footerUrl: 'dailyusecalc.com/sand',
    compactLayout: true,
  };
}
