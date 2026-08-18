import { describe, expect, it } from 'vitest';
import { calculatePaver } from './calculator';
import { createPaverEstimateText } from './estimateSummary';
import { createDefaultPaverInput, preparePaverInputForSubmission } from './formDefaults';
import { createPaverEstimateReport } from './paverReport';
import { createEstimatePdfBytes } from '../../../lib/reports/pdfRenderer';
import { createEstimateReportHtml } from '../../../components/reports/EstimateReport';

describe('paver submitted-result and optional-feature regressions', () => {
  it('restores the intentional clear defaults', () => {
    const input = createDefaultPaverInput();
    expect(input).toMatchObject({
      projectType: 'patio',
      measureMode: 'dimensions',
      shape: 'rectangle',
      measurementSystem: 'imperial',
      paverPreset: '6x9',
      wastePercent: 5,
      estimateBase: false,
      estimateSand: false,
      estimateCost: false,
    });
    expect(input.length.value).toBeNaN();
    expect(input.width.value).toBeNaN();
    expect(input.jointWidth).toBeNaN();
    expect(input.baseDepth.value).toBeNaN();
    expect(input.sandDepth.value).toBeNaN();
    expect(input.pricePerPaver).toBeUndefined();
  });

  it('derives optional calculations only from fields the user entered', () => {
    const blank = preparePaverInputForSubmission(createDefaultPaverInput());
    expect(blank).toMatchObject({
      jointWidth: 0,
      estimateBase: false,
      estimateSand: false,
      estimateCost: false,
    });

    const entered = createDefaultPaverInput();
    entered.jointWidth = 0.5;
    entered.baseDepth.value = 4;
    entered.sandDepth.value = 1;
    entered.pricePerPaver = 1.45;
    expect(preparePaverInputForSubmission(entered)).toMatchObject({
      jointWidth: 0.5,
      estimateBase: true,
      estimateSand: true,
      estimateCost: true,
    });
  });

  it('keeps a submitted snapshot stable after live-form edits', () => {
    const live = createDefaultPaverInput();
    live.length.value = 20;
    live.width.value = 15;
    const submitted = structuredClone(live);
    const result = calculatePaver(submitted);
    live.length.value = 40;
    expect(result.requiredPavers).toBe(840);
    expect(submitted.length.value).toBe(20);
    expect(createPaverEstimateText(submitted, result)).toContain('Pavers needed: 840');
    expect(createPaverEstimateText(submitted, result)).toContain('Project area: 300 sq ft');
  });

  it('builds the basic 20 by 10 submitted report with matching values', () => {
    const input = createDefaultPaverInput();
    input.length.value = 20;
    input.width.value = 10;
    const result = calculatePaver(input);
    const report = createPaverEstimateReport(input, result);
    expect(result.projectAreaSquareFeet).toBe(200);
    expect(result.rawPavers).toBeCloseTo(533.3333333, 6);
    expect(result.requiredPavers).toBe(560);
    expect(report.primaryResult.value).toBe('560 pavers');
    expect(report.sections.flatMap((section) => section.rows)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Project area', value: '200 sq ft' }),
        expect.objectContaining({ label: 'Before waste', value: '533.33 pavers' }),
        expect.objectContaining({ label: 'Recommended quantity', value: '560 pavers' }),
      ]),
    );
  });

  it('renders report sections only for explicitly enabled options', () => {
    const input = createDefaultPaverInput();
    input.length.value = 20;
    input.width.value = 15;
    const basic = createPaverEstimateReport(input, calculatePaver(input));
    expect(basic.sections.map((section) => section.title)).not.toContain('PAVER BASE');
    expect(basic.sections.map((section) => section.title)).not.toContain('BEDDING SAND');
    expect(basic.sections.map((section) => section.title)).not.toContain('PAVER MATERIAL COST');
    input.estimateBase = true;
    input.estimateSand = true;
    input.baseDepth.value = 4;
    input.sandDepth.value = 1;
    input.estimateCost = true;
    input.pricePerPaver = 1.25;
    const detailed = createPaverEstimateReport(input, calculatePaver(input));
    expect(detailed.sections.map((section) => section.title)).toEqual(
      expect.arrayContaining(['PAVER BASE', 'BEDDING SAND', 'PAVER MATERIAL COST']),
    );
  });

  it('keeps Print HTML and direct PDF on the same Paver-specific report hierarchy', async () => {
    const input = createDefaultPaverInput();
    input.length.value = 20;
    input.width.value = 10;
    input.jointWidth = 0.5;
    input.estimateBase = true;
    input.estimateSand = true;
    input.baseDepth.value = 4;
    input.sandDepth.value = 1;
    input.estimateCost = true;
    input.pricePerPaver = 1.45;
    const result = calculatePaver(input);
    const report = createPaverEstimateReport(input, result, new Date('2026-08-17T12:00:00Z'));
    const html = createEstimateReportHtml(report);

    expect(result.requiredPavers).toBe(490);
    expect(result.baseVolumeCubicFeet).toBeCloseTo(66.6666667, 6);
    expect(result.sandVolumeCubicFeet).toBeCloseTo(16.6666667, 6);
    expect(result.estimatedCost).toBe(710.5);
    expect(report.leftSections?.map((section) => section.title)).toEqual([
      'PROJECT MEASUREMENTS',
      'PAVER CALCULATION',
    ]);
    expect(report.rightSections?.map((section) => section.title)).toEqual([
      'PAVER BASE',
      'BEDDING SAND',
      'PAVER MATERIAL COST',
    ]);
    expect(
      report.sections.flatMap((section) => section.rows).find((row) => row.label === 'Paver size')
        ?.value,
    ).toBe('6 x 9 in');
    expect(report.guidanceHeadingOnly).toBe(true);
    expect(html).toContain('<h2>GUIDANCE</h2>');
    expect(html).not.toContain('GUIDANCE - PLANNING GUIDANCE');
    expect(html).toContain('dailyusecalc.com/paver');
    expect(html).toContain('Thank you for using DailyUseCalc!');
    expect((await createEstimatePdfBytes(report)).byteLength).toBeGreaterThan(1_000);
  });

  it('generates a direct PDF from the submitted report model', async () => {
    const input = createDefaultPaverInput();
    input.length.value = 20;
    input.width.value = 15;
    const bytes = await createEstimatePdfBytes(
      createPaverEstimateReport(input, calculatePaver(input)),
    );
    expect(bytes.byteLength).toBeGreaterThan(1_000);
  });
});
