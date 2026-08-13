import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createEstimateReportHtml } from '../../../components/reports/EstimateReport';
import { createEstimatePdfBytes } from '../../../lib/reports/pdfRenderer';
import { calculatePaint } from './calculator';
import { createDefaultPaintInput } from './formDefaults';
import { createPaintEstimateReport } from './paintReport';
import { recommendPaint } from './recommendations';
describe('paint report', () => {
  it('uses the calculation presentation model without duplicate formulas', () => {
    const input = createDefaultPaintInput();
    input.includeCeiling = true;
    input.paintDoors = true;
    input.paintTrim = true;
    input.usePrimer = true;
    const calculation = calculatePaint(input);
    const report = createPaintEstimateReport({
      input,
      calculation,
      recommendation: recommendPaint(input, calculation),
      measurementSystem: 'imperial',
      generatedAt: new Date(2026, 0, 2),
    });
    expect(report.footerUrl).toBe('dailyusecalc.com/paint');
    expect(report.primaryResult.value).toBe(calculation.wall.purchase.display);
    expect(report.sections.map((x) => x.title)).toEqual(
      expect.arrayContaining([
        'AREA BREAKDOWN',
        'WALL PAINT',
        'CEILING PAINT',
        'PAINTED DOORS',
        'TRIM / BASEBOARDS',
        'PRIMER',
      ]),
    );
    expect(report.documentTitle).toContain('paint-estimate');
  });
  it('reports project-total opening quantities without per-room wording', () => {
    const input = createDefaultPaintInput();
    input.roomQuantity = 10;
    input.doorOpenings.quantity = 10;
    input.windowOpenings.quantity = 20;
    const calculation = calculatePaint(input);
    const report = createPaintEstimateReport({
      input,
      calculation,
      recommendation: recommendPaint(input, calculation),
      measurementSystem: 'imperial',
    });
    const measurements = report.sections.find(
      (section) => section.title === 'PROJECT MEASUREMENTS',
    );
    expect(measurements?.rows).toEqual(
      expect.arrayContaining([
        { label: 'Rooms', value: '10' },
        { label: 'Total doors', value: '10' },
        { label: 'Door size', value: '3 × 6.67 ft' },
        { label: 'Total windows', value: '20' },
        { label: 'Window size', value: '3 × 4 ft' },
      ]),
    );
    const html = createEstimateReportHtml(report);
    expect(html).not.toMatch(/doors per room|windows per room/i);
  });
  it('omits disabled optional materials and uses compact rows when enabled', () => {
    const basicInput = createDefaultPaintInput();
    const basicCalculation = calculatePaint(basicInput);
    const basic = createPaintEstimateReport({
      input: basicInput,
      calculation: basicCalculation,
      recommendation: recommendPaint(basicInput, basicCalculation),
      measurementSystem: 'imperial',
    });
    expect(basic.sections.map((section) => section.title)).not.toEqual(
      expect.arrayContaining(['CEILING PAINT', 'PAINTED DOORS', 'TRIM / BASEBOARDS', 'PRIMER']),
    );
    const input = createDefaultPaintInput();
    input.includeCeiling = true;
    input.paintDoors = true;
    input.paintTrim = true;
    input.usePrimer = true;
    const calculation = calculatePaint(input);
    const report = createPaintEstimateReport({
      input,
      calculation,
      recommendation: recommendPaint(input, calculation),
      measurementSystem: 'imperial',
    });
    for (const title of ['CEILING PAINT', 'PAINTED DOORS', 'TRIM / BASEBOARDS', 'PRIMER'])
      expect(report.sections.find((section) => section.title === title)?.rows).toHaveLength(4);
    expect(report.sections.find((section) => section.title === 'WALL PAINT')?.rows).toHaveLength(8);
  });
  it('renders the complex repeated-room stress estimate as one PDF page', async () => {
    const input = createDefaultPaintInput();
    input.roomQuantity = 10;
    input.doorOpenings.quantity = 10;
    input.windowOpenings.quantity = 20;
    input.includeCeiling = true;
    input.paintDoors = true;
    input.paintTrim = true;
    input.usePrimer = true;
    input.pricePerQuart = 18;
    input.pricePerGallon = 52;
    input.pricePerFiveGallons = 220;
    input.primerPricePerGallon = 35;
    const calculation = calculatePaint(input);
    const report = createPaintEstimateReport({
      input,
      calculation,
      recommendation: recommendPaint(input, calculation),
      measurementSystem: 'imperial',
      generatedAt: new Date(2026, 0, 2),
    });
    const bytes = await createEstimatePdfBytes(report);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(report.additionalDetails).toHaveLength(3);
    report.primaryResult.value = '12 × 5 gal + 4 × 1 gal + 3 × 1 qt';
    expect(createEstimateReportHtml(report)).toContain('primary-value--long');
  });
});
