import type { EstimateReportData, ReportSection } from '../../../components/reports/EstimateReport';
import { createReportFilename } from '../../../lib/reports/reportFilename';
import { formatMoney } from '../gravel/currencies';
import { gallonsToLiters, squareFeetToSquareMeters } from './calculator';
import { surfaceConditionLabels } from './constants';
import type {
  MeasurementSystem,
  PaintCalculation,
  PaintInput,
  PaintRecommendation,
  PaintRequirement,
} from './types';
const n = (value: number, digits = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
const area = (value: number) => `${n(value)} sq ft / ${n(squareFeetToSquareMeters(value))} sq m`;
const volume = (value: number) => `${n(value)} gal / ${n(gallonsToLiters(value))} L`;
const dimensions = (width: PaintInput['length'], height: PaintInput['length']) =>
  width.unit === height.unit
    ? `${n(width.value)} x ${n(height.value)} ${width.unit}`
    : `${n(width.value)} ${width.unit} x ${n(height.value)} ${height.unit}`;
const requirementSection = (title: string, item: PaintRequirement): ReportSection => ({
  title,
  rows: [
    { label: 'Paintable area', value: area(item.areaSquareFeet) },
    { label: 'Coats', value: n(item.coats, 0) },
    { label: 'Base requirement', value: volume(item.baseGallons) },
    { label: 'Allowance', value: volume(item.allowanceGallons) },
    { label: 'Required', value: volume(item.requiredGallons), emphasis: true },
    { label: 'Suggested purchase', value: item.purchase.display },
    { label: 'Purchased volume', value: volume(item.purchase.purchasedGallons) },
    { label: 'Estimated leftover', value: volume(item.purchase.leftoverGallons) },
  ],
});
const compactRequirementSection = (title: string, item: PaintRequirement): ReportSection => ({
  title,
  rows: [
    { label: 'Area / coats', value: `${area(item.areaSquareFeet)} - ${n(item.coats, 0)} coat(s)` },
    { label: 'Required', value: volume(item.requiredGallons), emphasis: true },
    { label: 'Suggested purchase', value: item.purchase.display },
    { label: 'Estimated leftover', value: volume(item.purchase.leftoverGallons) },
  ],
});
export function createPaintEstimateReport({
  calculation,
  input,
  recommendation,
  measurementSystem,
  generatedAt,
}: {
  calculation: PaintCalculation;
  input: PaintInput;
  recommendation: PaintRecommendation;
  measurementSystem: MeasurementSystem;
  generatedAt?: Date;
}): EstimateReportData {
  const date = generatedAt ?? new Date();
  const optional = [
    calculation.ceiling && compactRequirementSection('CEILING PAINT', calculation.ceiling),
    calculation.doors && compactRequirementSection('PAINTED DOORS', calculation.doors),
    calculation.trim && compactRequirementSection('TRIM / BASEBOARDS', calculation.trim),
    calculation.primer && compactRequirementSection('PRIMER', calculation.primer),
  ].filter(Boolean) as ReportSection[];
  const pricing = [
    calculation.estimatedFinishCost !== undefined
      ? {
          label: 'Finish paint',
          value: formatMoney(calculation.estimatedFinishCost, input.currency, undefined, 2),
        }
      : undefined,
    calculation.estimatedPrimerCost !== undefined
      ? {
          label: 'Primer',
          value: formatMoney(calculation.estimatedPrimerCost, input.currency, undefined, 2),
        }
      : undefined,
    calculation.estimatedTotalCost !== undefined
      ? {
          label: 'Total estimated cost',
          value: formatMoney(calculation.estimatedTotalCost, input.currency, undefined, 2),
          emphasis: true,
        }
      : undefined,
  ].filter(Boolean) as NonNullable<EstimateReportData['additionalDetails']>;
  const measurements = {
    title: 'PROJECT MEASUREMENTS',
    rows: [
      { label: 'Room length', value: `${n(input.length.value)} ${input.length.unit}` },
      { label: 'Room width', value: `${n(input.width.value)} ${input.width.unit}` },
      { label: 'Wall height', value: `${n(input.wallHeight.value)} ${input.wallHeight.unit}` },
      { label: 'Rooms', value: n(input.roomQuantity, 0) },
      { label: 'Total doors', value: n(input.doorOpenings.quantity, 0) },
      ...(input.doorOpenings.quantity
        ? [
            {
              label: 'Door size',
              value: dimensions(input.doorOpenings.width, input.doorOpenings.height),
            },
          ]
        : []),
      { label: 'Total windows', value: n(input.windowOpenings.quantity, 0) },
      ...(input.windowOpenings.quantity
        ? [
            {
              label: 'Window size',
              value: dimensions(input.windowOpenings.width, input.windowOpenings.height),
            },
          ]
        : []),
    ],
  };
  const breakdown = {
    title: 'AREA BREAKDOWN',
    rows: [
      { label: 'Gross wall area', value: area(calculation.grossWallAreaSquareFeet) },
      { label: 'Door openings', value: `- ${area(calculation.doorOpeningAreaSquareFeet)}` },
      { label: 'Window openings', value: `- ${area(calculation.windowOpeningAreaSquareFeet)}` },
      { label: 'Net wall area', value: area(calculation.netWallAreaSquareFeet), emphasis: true },
    ],
  };
  const wall = requirementSection('WALL PAINT', calculation.wall);
  const primer = optional.find((section) => section.title === 'PRIMER');
  const finishOptions = optional.filter((section) => section.title !== 'PRIMER');
  return {
    documentTitle: createReportFilename('paint-estimate', date),
    reportTitle: 'PAINT PROJECT ESTIMATE',
    generatedAt: date,
    projectName: 'Paint Project Estimate',
    projectTypeLabel: 'Room / Walls',
    primaryResult: {
      label: 'SUGGESTED WALL-PAINT PURCHASE',
      value: calculation.wall.purchase.display,
      supportingText: `${volume(calculation.wall.requiredGallons)} required`,
      confirmation: `${volume(calculation.wall.purchase.leftoverGallons)} estimated leftover`,
    },
    summary: [
      {
        label: 'Measurement system',
        value: measurementSystem === 'imperial' ? 'Imperial (US)' : 'Metric',
      },
      { label: 'Surface condition', value: surfaceConditionLabels[input.surfaceCondition] },
      {
        label: 'Coverage',
        value: `${n(input.coverageSquareFeetPerGallon)} ${measurementSystem === 'imperial' ? 'sq ft/gal' : 'sq m/L'}`,
      },
      { label: 'Allowance', value: `${n(input.allowancePercent)}%` },
    ],
    sections: [measurements, breakdown, wall, ...optional],
    leftSections: [measurements, breakdown, ...(primer ? [primer] : [])],
    rightSections: [wall, ...finishOptions],
    additionalDetails: pricing.length ? pricing : undefined,
    guidance: recommendation.guidance.slice(1).map((value, index) => ({
      label: index ? 'Purchase sizes' : 'Coverage factors',
      value,
    })),
    warnings: recommendation.warnings.length ? recommendation.warnings : undefined,
    notice: {
      title: 'IMPORTANT',
      content:
        'Estimate only. Actual paint requirements vary with texture, porosity, color change, formulation, primer, application method, coats, and waste. Verify coverage and application instructions on the actual product.',
    },
    footerUrl: 'dailyusecalc.com/paint',
    compactLayout: true,
    adaptivePrimaryResult: true,
  };
}
