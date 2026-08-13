import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { createEstimatePdfBytes } from '../../../lib/reports/pdfRenderer';
import { calculateTopsoil } from './calculator';
import { createDefaultTopsoilInput } from './formDefaults';
import { createTopsoilEstimateText } from './estimateSummary';
import { createTopsoilEstimateReport } from './topsoilReport';

describe('topsoil report', () => {
  it('creates a normal one-page report and omits absent weight/cost', async () => {
    const input = createDefaultTopsoilInput();
    const calculation = calculateTopsoil(input);
    const report = createTopsoilEstimateReport(input, calculation, new Date(2026, 0, 2));
    expect(JSON.stringify(report)).not.toContain('WEIGHT ESTIMATE');
    expect(JSON.stringify(report)).not.toContain('BAGGED TOPSOIL');
    expect(JSON.stringify(report)).not.toContain('Estimated material cost');
    expect(report.primaryResult.confirmation).toBe(
      'Exact volume shown; no purchase rounding applied.',
    );
    expect((await PDFDocument.load(await createEstimatePdfBytes(report))).getPageCount()).toBe(1);
  });
  it('creates a dense one-page report and conditional copy summary', async () => {
    const input = {
      ...createDefaultTopsoilInput(),
      quantity: 4,
      bagVolume: 1,
      bulkIncrement: 0.25,
      supplierDensity: 2200,
      pricePerBag: 3.5,
      bulkUnitPrice: 42,
    };
    const calculation = calculateTopsoil(input);
    const report = createTopsoilEstimateReport(input, calculation);
    expect(JSON.stringify(report)).toContain('WEIGHT ESTIMATE');
    expect(report.customSections?.[0]?.title).toBe('MATERIAL COST COMPARISON');
    expect(report.primaryResult.confirmation).toBe('Configured purchase quantities round upward.');
    expect(createTopsoilEstimateText(input, calculation)).toContain('Supplier density');
    expect((await PDFDocument.load(await createEstimatePdfBytes(report))).getPageCount()).toBe(1);
  });

  it('uses metric-first values for the untouched optional-field regression case', () => {
    const input = {
      ...createDefaultTopsoilInput(),
      measurementSystem: 'metric' as const,
      measureMode: 'area' as const,
      knownArea: 320,
      areaUnit: 'sq-m' as const,
      depth: { value: 50, unit: 'cm' as const },
    };
    const calculation = calculateTopsoil(input);
    const serialized = JSON.stringify(createTopsoilEstimateReport(input, calculation));
    const summary = createTopsoilEstimateText(input, calculation);

    expect(serialized).toContain('168 cu m');
    expect(serialized).toContain('8 cu m');
    expect(serialized).toContain('320 sq m');
    expect(serialized).toContain('1 cu m covers about 2 sq m');
    expect(serialized).toContain('Exact required quantity');
    expect(serialized).not.toContain('BAGGED TOPSOIL');
    expect(serialized).not.toContain('WEIGHT ESTIMATE');
    expect(serialized).not.toContain('MATERIAL COST COMPARISON');
    expect(summary).toContain('Required topsoil: 168 cu m (168,000 L)');
    expect(summary).toContain('Coverage: 1 cu m covers about 2 sq m');
  });
});
