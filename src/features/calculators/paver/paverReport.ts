import type { EstimateReportData, ReportMetric } from '../../../components/reports/EstimateReport';
import { formatMoney } from '../gravel/currencies';
import { cubicFeetToCubicMeters, cubicFeetToCubicYards, squareFeetToArea } from './calculator';
import { areaUnitLabel, formatPaverNumber as n, projectLabel } from './estimateSummary';
import type { AreaUnit, PaverCalculation, PaverInput } from './types';

function dimension(value: PaverInput['length']) {
  return `${n(value.value)} ${value.unit}`;
}

export function createPaverEstimateReport(
  input: PaverInput,
  result: PaverCalculation,
  generatedAt = new Date(),
): EstimateReportData {
  const metric = input.measurementSystem === 'metric';
  const areaUnit: AreaUnit = metric ? 'sq-m' : 'sq-ft';
  const area = `${n(squareFeetToArea(result.projectAreaSquareFeet, areaUnit))} ${areaUnitLabel(areaUnit)}`;
  const geometry: ReportMetric[] =
    input.measureMode === 'area'
      ? [{ label: 'Known area', value: `${n(input.knownArea)} ${areaUnitLabel(input.areaUnit)}` }]
      : input.shape === 'circle'
        ? [
            { label: 'Shape', value: 'Circle' },
            { label: 'Diameter', value: dimension(input.diameter) },
          ]
        : [
            { label: 'Shape', value: 'Rectangle' },
            { label: 'Length', value: dimension(input.length) },
            { label: 'Width', value: dimension(input.width) },
          ];
  const projectMeasurements = {
    title: 'PROJECT MEASUREMENTS',
    rows: [
      { label: 'Measure by', value: input.measureMode === 'area' ? 'Known Area' : 'Dimensions' },
      ...geometry,
      { label: 'Project area', value: area, emphasis: true },
    ],
  };
  const paverCalculation = {
    title: 'PAVER CALCULATION',
    rows: [
      {
        label: 'Paver size',
        value: `${n(input.paverLength)} x ${n(input.paverWidth)} ${input.paverUnit}`,
      },
      { label: 'Joint width', value: `${n(input.jointWidth, 3)} ${input.jointUnit}` },
      {
        label: 'Coverage per paver',
        value: metric
          ? `${n(squareFeetToArea(result.effectiveCoverageSquareFeet, 'sq-m'), 4)} sq m`
          : `${n(result.effectiveCoverageSquareFeet, 4)} sq ft`,
      },
      { label: 'Before waste', value: `${n(result.rawPavers)} pavers` },
      {
        label: `Waste allowance (${input.wastePercent}%)`,
        value: `${n(result.wastePavers)} pavers`,
      },
      { label: 'Recommended quantity', value: `${result.requiredPavers} pavers`, emphasis: true },
    ],
  };
  const paverBase =
    result.baseVolumeCubicFeet === undefined
      ? undefined
      : {
          title: 'PAVER BASE',
          rows: metric
            ? [
                { label: 'Base depth', value: dimension(input.baseDepth) },
                {
                  label: 'Required volume',
                  value: `${n(cubicFeetToCubicMeters(result.baseVolumeCubicFeet))} cu m`,
                  emphasis: true,
                },
                {
                  label: 'Liters',
                  value: `${n(cubicFeetToCubicMeters(result.baseVolumeCubicFeet) * 1_000)} L`,
                },
              ]
            : [
                { label: 'Base depth', value: dimension(input.baseDepth) },
                {
                  label: 'Cubic yards',
                  value: `${n(cubicFeetToCubicYards(result.baseVolumeCubicFeet))} cu yd`,
                  emphasis: true,
                },
                { label: 'Cubic feet', value: `${n(result.baseVolumeCubicFeet)} cu ft` },
              ],
        };
  const beddingSand =
    result.sandVolumeCubicFeet === undefined
      ? undefined
      : {
          title: 'BEDDING SAND',
          rows: metric
            ? [
                { label: 'Sand depth', value: dimension(input.sandDepth) },
                {
                  label: 'Required volume',
                  value: `${n(cubicFeetToCubicMeters(result.sandVolumeCubicFeet))} cu m`,
                  emphasis: true,
                },
                {
                  label: 'Liters',
                  value: `${n(cubicFeetToCubicMeters(result.sandVolumeCubicFeet) * 1_000)} L`,
                },
              ]
            : [
                { label: 'Sand depth', value: dimension(input.sandDepth) },
                {
                  label: 'Cubic yards',
                  value: `${n(cubicFeetToCubicYards(result.sandVolumeCubicFeet))} cu yd`,
                  emphasis: true,
                },
                { label: 'Cubic feet', value: `${n(result.sandVolumeCubicFeet)} cu ft` },
              ],
        };
  const paverMaterialCost =
    result.estimatedCost === undefined
      ? undefined
      : {
          title: 'PAVER MATERIAL COST',
          rows: [
            {
              label: 'Price per paver',
              value: formatMoney(input.pricePerPaver!, input.currency),
            },
            {
              label: 'Estimated paver cost',
              value: formatMoney(result.estimatedCost, input.currency),
              emphasis: true,
            },
          ],
        };
  const optionalSections = [paverBase, beddingSand, paverMaterialCost].filter(
    (section): section is NonNullable<typeof section> => section !== undefined,
  );
  const sections = [projectMeasurements, paverCalculation, ...optionalSections];
  return {
    documentTitle: 'Paver Project Estimate',
    reportTitle: 'PAVER PROJECT ESTIMATE',
    projectName: 'Paver Project Estimate',
    projectTypeLabel: projectLabel(input.projectType),
    generatedAt,
    primaryResult: {
      label: 'PAVERS NEEDED',
      value: `${result.requiredPavers} pavers`,
      supportingText: `Recommended quantity including ${input.wastePercent}% waste`,
      confirmation: 'Final purchasing quantity is rounded up to whole pavers.',
    },
    summary: [
      { label: 'Measurement system', value: metric ? 'Metric' : 'Imperial (US)' },
      { label: 'Project area', value: area },
      { label: 'Waste allowance', value: `${input.wastePercent}%` },
    ],
    sections,
    leftSections: [projectMeasurements, paverCalculation],
    rightSections: optionalSections,
    guidance: [
      {
        label: 'Planning guidance',
        value:
          'Confirm paver dimensions, joint layout, product coverage, cuts, and installation requirements before ordering.',
      },
    ],
    guidanceHeadingOnly: true,
    notice: {
      title: 'IMPORTANT',
      content:
        'Planning estimate only. Paver cost includes paver material only and excludes labor, base, bedding sand, restraints, delivery, taxes, and other project costs.',
    },
    footerUrl: 'dailyusecalc.com/paver',
  };
}
