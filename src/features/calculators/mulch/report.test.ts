import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { createEstimatePdfBytes } from '../../../lib/reports/pdfRenderer';
import { calculateMulch } from './calculator';
import { createDefaultMulchInput } from './formDefaults';
import { createMulchEstimateReport } from './mulchReport';

describe('mulch report', () => {
  it('omits absent optional costs and creates a one-page normal PDF', async () => {
    const input = createDefaultMulchInput();
    const report = createMulchEstimateReport(input, calculateMulch(input), new Date(2026, 0, 2));
    expect(report.rightSections?.some((section) => section.title === 'BAGGED MULCH')).toBe(true);
    expect(JSON.stringify(report)).not.toContain('Estimated material cost');
    expect((await PDFDocument.load(await createEstimatePdfBytes(report))).getPageCount()).toBe(1);
  });
  it('includes both material costs in a dense one-page PDF', async () => {
    const input = { ...createDefaultMulchInput(), pricePerBag: 4.5, bulkPricePerCubicYard: 45 };
    const report = createMulchEstimateReport(input, calculateMulch(input));
    expect(JSON.stringify(report)).toContain('Estimated material cost');
    expect(report.customSections?.[0]?.title).toBe('MATERIAL COST COMPARISON');
    expect(report.leftSections?.[0]?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Length', value: '20 ft' }),
        expect.objectContaining({ label: 'Width', value: '10 ft' }),
      ]),
    );
    expect((await PDFDocument.load(await createEstimatePdfBytes(report))).getPageCount()).toBe(1);
  });
});
