import { describe, expect, it } from 'vitest';
import { calculateGravel } from './calculator';
import { recommendGravel } from './recommendations';
import { createGravelEstimateReport } from './gravelReport';
import { createEstimateReportHtml } from '../../../components/reports/EstimateReport';
import type { GravelInput } from './types';

const input: GravelInput = {
  projectType: 'driveway',
  gravelType: 'crushed-stone',
  length: { value: 40, unit: 'ft' },
  width: { value: 20, unit: 'ft' },
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
    expect(report.primaryResult.value).toBe('24.7 yd³');
    expect(report.summary).toContainEqual({ label: 'Allowance', value: '0%' });
    expect(report.additionalDetails).toContainEqual({ label: 'Estimated cost', value: '$1,167' });
    expect(report.customSections?.[0]?.title).toBe('WHY 24.7 YD³?');
    expect(report.footerUrl).toBe('dailyusecalc.com/gravel');
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
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });
});
