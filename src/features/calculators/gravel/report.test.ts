import { describe, expect, it } from 'vitest';
import { calculateGravel } from './calculator';
import { recommendGravel } from './recommendations';
import { createGravelEstimateReportHtml } from './report';
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
    const html = createGravelEstimateReportHtml({
      calculation,
      input,
      recommendation: recommendGravel(input, calculation),
      measurementSystem: 'imperial',
      generatedAt: new Date('2026-08-09T10:24:00'),
    });

    expect(html).toContain('Gravel Project Estimate');
    expect(html).toContain('25 yd³');
    expect(html).toContain('0%');
    expect(html).toContain('$1,180');
    expect(html).toContain('dailyusecalc.com/gravel');
  });

  it('supports metric presentation and optional user-provided content', () => {
    const calculation = calculateGravel(input);
    const html = createGravelEstimateReportHtml({
      calculation,
      input,
      recommendation: recommendGravel(input, calculation),
      measurementSystem: 'metric',
      projectName: 'Backyard Driveway Project',
      notes: 'Base layer for the driveway',
    });

    expect(html).toContain('Backyard Driveway Project');
    expect(html).toContain('Metric');
    expect(html).toContain('m³');
    expect(html).toContain('Base layer for the driveway');
  });
});
