import type { EstimateReportData, ReportMetric } from '../../../components/reports/EstimateReport';
import { formatMoney } from '../gravel/currencies';
import { squareFeetToArea } from './calculator';
import { areaLabel, patternLabel, projectLabel } from './estimateSummary';
import type { TileCalculation, TileInput } from './types';
const n = (v: number, d = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(v);
const dim = (d: TileInput['length']) => `${n(d.value)} ${d.unit}`;
function geometry(i: TileInput): ReportMetric[] {
  if (i.measureMode === 'area')
    return [{ label: 'Known area', value: `${n(i.knownArea)} ${areaLabel(i.areaUnit)}` }];
  if (i.shape === 'rectangle')
    return [
      { label: 'Shape', value: 'Rectangle' },
      { label: 'Length', value: dim(i.length) },
      { label: 'Width', value: dim(i.width) },
    ];
  if (i.shape === 'square')
    return [
      { label: 'Shape', value: 'Square' },
      { label: 'Side', value: dim(i.side) },
    ];
  if (i.shape === 'circle')
    return [
      { label: 'Shape', value: 'Circle' },
      { label: 'Diameter', value: dim(i.diameter) },
    ];
  if (i.shape === 'triangle')
    return [
      { label: 'Shape', value: 'Triangle' },
      { label: 'Base', value: dim(i.base) },
      { label: 'Perpendicular height', value: dim(i.perpendicularHeight) },
    ];
  if (i.shape === 'trapezoid')
    return [
      { label: 'Shape', value: 'Trapezoid' },
      { label: 'Parallel side A', value: dim(i.sideA) },
      { label: 'Parallel side B', value: dim(i.sideB) },
      { label: 'Perpendicular height', value: dim(i.perpendicularHeight) },
    ];
  return [
    { label: 'Shape', value: 'Ring / Donut' },
    { label: 'Outer diameter', value: dim(i.outerDiameter) },
    { label: 'Inner diameter', value: dim(i.innerDiameter) },
  ];
}
export function createTileEstimateReport(
  i: TileInput,
  c: TileCalculation,
  generatedAt = new Date(),
): EstimateReportData {
  const metric = i.measurementSystem === 'metric',
    au = metric ? 'sq-m' : 'sq-ft',
    area = (v: number) => `${n(squareFeetToArea(v, au))} ${areaLabel(au)}`;
  const sections = [
    {
      title: 'Project measurements',
      rows: [
        { label: 'Measure by', value: i.measureMode === 'area' ? 'Known Area' : 'Dimensions' },
        ...geometry(i),
        { label: 'Quantity', value: String(i.quantity) },
        { label: 'Gross area', value: area(c.grossAreaSquareFeet) },
      ],
    },
    {
      title: 'Area breakdown',
      rows: [
        { label: 'Gross area', value: area(c.grossAreaSquareFeet) },
        ...(c.excludedAreaSquareFeet
          ? [{ label: 'Excluded area', value: `- ${area(c.excludedAreaSquareFeet)}` }]
          : []),
        { label: 'Net tiled area', value: area(c.netAreaSquareFeet), emphasis: true },
      ],
    },
    {
      title: 'Tile estimate',
      rows: [
        { label: 'Tile size', value: `${n(i.tileLength)} x ${n(i.tileWidth)} ${i.tileUnit}` },
        { label: 'Grout gap', value: `${n(i.groutGap, 3)} ${i.groutUnit}` },
        { label: 'Base estimate', value: `${n(c.rawTiles)} tiles` },
        {
          label: `Waste allowance (${i.wastePercent}%)`,
          value: `${n(c.wasteAdjustedTiles - c.rawTiles)} tiles`,
        },
        { label: 'Required tiles', value: `${c.requiredTiles} tiles`, emphasis: true },
      ],
    },
    ...(c.boxesRequired === undefined
      ? []
      : [
          {
            title: 'Box / purchasing',
            rows: [
              { label: 'Boxes required', value: String(c.boxesRequired), emphasis: true },
              ...(i.boxMode === 'coverage'
                ? [
                    {
                      label: 'Manufacturer coverage',
                      value: `${n(i.manufacturerCoverage!)} ${areaLabel(i.manufacturerCoverageUnit)}/box`,
                    },
                    {
                      label: 'Waste-adjusted coverage',
                      value: area(c.wasteAdjustedCoverageSquareFeet),
                    },
                    { label: 'Purchased coverage', value: area(c.purchasedCoverageSquareFeet!) },
                    {
                      label: 'Extra purchased coverage',
                      value: area(c.extraPurchasedCoverageSquareFeet!),
                    },
                  ]
                : [
                    { label: 'Tiles per box', value: String(i.tilesPerBox) },
                    { label: 'Purchased tiles', value: String(c.purchasedTiles) },
                    { label: 'Extra tiles', value: String(c.extraTiles) },
                  ]),
            ],
          },
        ]),
    ...(c.estimatedCost === undefined
      ? []
      : [
          {
            title: 'Pricing',
            rows: [
              {
                label: 'Estimated material cost',
                value: formatMoney(c.estimatedCost, i.currency),
                emphasis: true,
              },
            ],
          },
        ]),
  ];
  return {
    documentTitle: 'Tile Project Estimate',
    reportTitle: 'TILE PROJECT ESTIMATE',
    projectName: 'Tile Project Estimate',
    projectTypeLabel: projectLabel(i.projectType),
    generatedAt,
    primaryResult: {
      label: 'REQUIRED TILES',
      value: `${c.requiredTiles} tiles`,
      supportingText: 'Estimated tiles required',
      confirmation: 'Waste is applied before final whole-tile rounding.',
    },
    summary: [
      { label: 'Measurement system', value: metric ? 'Metric' : 'Imperial (US)' },
      { label: 'Pattern', value: patternLabel(i.pattern) },
      { label: 'Waste', value: `${i.wastePercent}%` },
    ],
    sections,
    guidance: [
      {
        label: 'Pattern and waste',
        value: `${patternLabel(i.pattern)} affects guidance only. The selected ${i.wastePercent}% waste is applied once before final whole-tile rounding.`,
      },
      ...(i.boxMode === 'coverage' && i.manufacturerCoverage !== undefined
        ? [
            {
              label: 'Manufacturer coverage',
              value:
                'Manufacturer coverage overrides calculated box coverage for purchasing. Tile dimensions remain the basis for estimated tile count.',
            },
          ]
        : []),
    ],
    notice: {
      title: 'IMPORTANT',
      content:
        'Planning estimate only. Material cost excludes labor, grout, thinset/adhesive, underlayment, delivery, taxes, tools, and other installation materials. Exact placement and offcut reuse are not simulated.',
    },
    footerUrl: 'dailyusecalc.com/tile',
  };
}
