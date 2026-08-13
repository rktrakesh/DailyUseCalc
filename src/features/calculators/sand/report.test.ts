import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { createEstimatePdfBytes } from '../../../lib/reports/pdfRenderer';
import { calculateSand } from './calculator';
import { createDefaultSandInput } from './formDefaults';
import { createSandEstimateText } from './estimateSummary';
import { createSandEstimateReport } from './sandReport';

describe('sand report', () => {
  it('creates a normal one-page report with estimated weight and no empty bag/cost sections', async () => {
    const input = createDefaultSandInput();
    const c = calculateSand(input);
    const report = createSandEstimateReport(input, c, new Date(2026, 0, 2));
    const json = JSON.stringify(report);
    expect(json).toContain('ESTIMATED WEIGHT');
    expect(report.primaryResult.supportingText).toBe('Volume including allowance and compaction');
    expect(json).not.toContain('BAGGED SAND');
    expect(json).not.toContain('MATERIAL COST COMPARISON');
    expect(report.primaryResult.confirmation).toContain('no purchase increment');
    expect((await PDFDocument.load(await createEstimatePdfBytes(report))).getPageCount()).toBe(1);
  });
  it('creates a dense one-page report with conditional purchasing', async () => {
    const input = {
      ...createDefaultSandInput(),
      bagSize: 50,
      pricePerBag: 4,
      bulkIncrement: 0.25,
      bulkUnitPrice: 42,
      supplierDensity: 3000,
    };
    const c = calculateSand(input);
    const report = createSandEstimateReport(input, c);
    const json = JSON.stringify(report);
    expect(json).toContain('BAGGED SAND');
    expect(json).toContain('cu yd');
    expect(json).not.toContain('cu-yd');
    expect(json).toContain('MATERIAL COST COMPARISON');
    expect(json).toContain('supplier');
    expect(createSandEstimateText(input, c)).toContain('https://dailyusecalc.com/sand/');
    expect((await PDFDocument.load(await createEstimatePdfBytes(report))).getPageCount()).toBe(1);
  });
  it('uses metric-first report values', () => {
    const input = {
      ...createDefaultSandInput(),
      measurementSystem: 'metric' as const,
      length: { value: 5, unit: 'm' as const },
      width: { value: 4, unit: 'm' as const },
      depth: { value: 50, unit: 'mm' as const },
      allowancePercent: 0,
    };
    const c = calculateSand(input);
    const json = JSON.stringify(createSandEstimateReport(input, c));
    expect(json).toContain('1 cu m');
    expect(json).toContain('20 sq m');
    expect(json).toContain('1 cu m covers about 20 sq m');
  });
});
