import { describe, expect, it } from 'vitest';
import { calculateGravel } from './calculator';
import { recommendGravel } from './recommendations';
import { createGravelEstimateReport } from './gravelReport';
import { createEstimateReportHtml } from '../../../components/reports/EstimateReport';
import { createPdfFilename, createReportFilename } from '../../../lib/reports/reportFilename';
import type { GravelInput } from './types';

const input: GravelInput = {
  areaShape: 'rectangle',
  projectType: 'driveway',
  gravelType: 'crushed-stone',
  length: { value: 40, unit: 'ft' },
  width: { value: 20, unit: 'ft' },
  diameter: { value: Number.NaN, unit: 'ft' },
  depth: { value: 10, unit: 'in' },
  allowancePercent: 0,
  pricePerCubicYard: 45,
  deliveryFee: 55,
  bagSizeCubicFeet: 0.5,
  truckCapacityCubicYards: 12,
};

describe('gravel estimate report', () => {
  it('uses calculator output and falls back to a sensible project name', () => {
    const calculation = calculateGravel(input);
    const report = createGravelEstimateReport({
      calculation,
      input,
      recommendation: recommendGravel(input, calculation),
      measurementSystem: 'imperial',
      generatedAt: new Date('2026-08-09T10:24:00'),
    });

    expect(report.projectName).toBe('Gravel Project Estimate');
    expect(report.documentTitle).toBe('dailyusecalc-gravel-2026-08-09');
    expect(report.primaryResult.value).toBe('24.7 yd³');
    expect(report.summary).toContainEqual({ label: 'Allowance', value: '0%' });
    expect(report.additionalDetails).toContainEqual({ label: 'Estimated cost', value: '$1,167' });
    expect(report.customSections?.[0]?.title).toBe('WHY 24.7 YD³?');
    expect(report.footerUrl).toBe('dailyusecalc.com/gravel');
  });

  it('creates reusable, browser-safe report filename hints', () => {
    const date = new Date(2026, 7, 12);

    expect(createReportFilename('gravel', date)).toBe('dailyusecalc-gravel-2026-08-12');
    expect(createReportFilename('Paint & CoNCrete!', date)).toBe(
      'dailyusecalc-paint-concrete-2026-08-12',
    );
    expect(createPdfFilename('dailyusecalc-gravel-2026-08-12')).toBe(
      'dailyusecalc-gravel-2026-08-12.pdf',
    );
    expect(createPdfFilename('dailyusecalc-gravel-2026-08-12.pdf')).toBe(
      'dailyusecalc-gravel-2026-08-12.pdf',
    );
  });

  it('exposes the shared PDF renderer without calculator-specific PDF logic', async () => {
    const renderer = await import('../../../lib/reports/pdfRenderer');

    expect(renderer.downloadEstimatePdf).toBeTypeOf('function');
  });

  it('supports metric presentation and optional user-provided content', () => {
    const calculation = calculateGravel(input);
    const report = createGravelEstimateReport({
      calculation,
      input,
      recommendation: recommendGravel(input, calculation),
      measurementSystem: 'metric',
      projectName: 'Backyard Driveway Project',
      notes: 'Base layer for the driveway',
    });

    expect(report.projectName).toBe('Backyard Driveway Project');
    expect(report.summary).toContainEqual({ label: 'Measurement system', value: 'Metric' });
    expect(report.sections[0].rows).toContainEqual(
      expect.objectContaining({ label: 'Volume', value: expect.stringContaining('m³') }),
    );
    expect(report.additionalDetails).toContainEqual({
      label: 'Notes',
      value: 'Base layer for the driveway',
    });
  });

  it('describes circular geometry without fake rectangular measurements', () => {
    const circleInput: GravelInput = {
      ...input,
      areaShape: 'circle',
      diameter: { value: 20, unit: 'ft' },
    };
    const calculation = calculateGravel(circleInput);
    const report = createGravelEstimateReport({
      calculation,
      input: circleInput,
      recommendation: recommendGravel(circleInput, calculation),
      measurementSystem: 'imperial',
    });
    const measurements = report.sections[0].rows;
    expect(report.summary).toContainEqual({ label: 'Area shape', value: 'Circle' });
    expect(measurements).toContainEqual({ label: 'Shape', value: 'Circle' });
    expect(measurements).toContainEqual({ label: 'Diameter', value: '20 ft' });
    expect(measurements).toContainEqual({ label: 'Depth', value: '10 in' });
    expect(measurements.some((row) => row.label === 'Length' || row.label === 'Width')).toBe(false);
    expect(report.primaryResult.value).toBe(
      `${calculation.recommendedOrderCubicYards.toFixed(1)} yd³`,
    );
  });

  it('escapes user-provided notes in the rendered report', () => {
    const calculation = calculateGravel(input);
    const report = createGravelEstimateReport({
      calculation,
      input,
      recommendation: recommendGravel(input, calculation),
      measurementSystem: 'imperial',
      notes: '<img src=x onerror=alert(1)>',
    });

    const html = createEstimateReportHtml(report);
    expect(html).toContain('src="/logo/dailyusecalc-logo-176.png"');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });
});
