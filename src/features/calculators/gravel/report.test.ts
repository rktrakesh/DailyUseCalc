import { describe, expect, it } from 'vitest';
import { calculateGravel } from './calculator';
import { recommendGravel } from './recommendations';
import { createGravelEstimateReport } from './gravelReport';
import { createEstimateReportHtml } from '../../../components/reports/EstimateReport';
import { createPdfFilename, createReportFilename } from '../../../lib/reports/reportFilename';
import type { GravelInput } from './types';
import { formatMoney, isCurrencyCode } from './currencies';

const input: GravelInput = {
  inputMode: 'dimensions',
  areaShape: 'rectangle',
  projectType: 'driveway',
  gravelType: 'crushed-stone',
  length: { value: 40, unit: 'ft' },
  width: { value: 20, unit: 'ft' },
  diameter: { value: Number.NaN, unit: 'ft' },
  depth: { value: 10, unit: 'in' },
  knownArea: { value: Number.NaN, unit: 'ft²' },
  knownVolume: { value: Number.NaN, unit: 'yd³' },
  currency: 'USD',
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
    expect(report.additionalDetails).toContainEqual({
      label: 'Estimated cost',
      value: '$1,166.50',
      emphasis: true,
    });
    expect(report.summary).toContainEqual({ label: 'Density', value: '1.4 tons/yd³' });
    expect(report.summary.some((row) => row.label === 'Estimated weight')).toBe(false);
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

  it('validates saved preferences and formats currencies without conversion', () => {
    expect(isCurrencyCode('USD')).toBe(true);
    expect(isCurrencyCode('INR')).toBe(true);
    expect(isCurrencyCode('XYZ')).toBe(false);
    expect(isCurrencyCode(null)).toBe(false);
    expect(formatMoney(1234.5, 'USD', 'en-US')).toContain('$');
    expect(formatMoney(1234.5, 'EUR', 'de-DE')).toContain('€');
    expect(formatMoney(1234.5, 'INR', 'en-IN')).toContain('₹');
    expect(formatMoney(1234.5, 'JPY', 'ja-JP')).not.toContain('.50');
  });

  it('reports area and volume modes without fake dimensions', () => {
    for (const inputMode of ['area', 'volume'] as const) {
      const modeInput: GravelInput = {
        ...input,
        inputMode,
        knownArea: { value: 1000, unit: 'ft²' },
        knownVolume: { value: 4.5, unit: 'yd³' },
        currency: 'EUR',
      };
      const calculation = calculateGravel(modeInput);
      const report = createGravelEstimateReport({
        calculation,
        input: modeInput,
        recommendation: recommendGravel(modeInput, calculation),
        measurementSystem: 'imperial',
      });
      const rows = report.sections[0].rows;
      expect(rows.some((row) => row.label === 'Length' || row.label === 'Width')).toBe(false);
      expect(rows.some((row) => row.label === (inputMode === 'area' ? 'Area' : 'Volume'))).toBe(
        true,
      );
      expect(report.summary).toContainEqual({
        label: 'Measurement system',
        value: 'Imperial (US)',
      });
    }
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
    expect(
      report.sections.find((section) => section.title === 'VOLUME (WITH ALLOWANCE)')?.rows,
    ).toContainEqual(
      expect.objectContaining({ label: 'Cubic meters', value: expect.stringContaining('m³') }),
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
    expect(report.summary).toContainEqual({ label: 'Shape', value: 'Circle' });
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

  it('maps measured, allowance, adjusted, order, and adjusted-weight results exactly', () => {
    const allowanceInput = { ...input, allowancePercent: 10 };
    const calculation = calculateGravel(allowanceInput);
    const report = createGravelEstimateReport({
      calculation,
      input: allowanceInput,
      recommendation: recommendGravel(allowanceInput, calculation),
      measurementSystem: 'imperial',
    });
    const results = report.rightSections?.find((section) => section.title === 'ESTIMATE RESULTS');
    const volumes = report.leftSections?.find(
      (section) => section.title === 'VOLUME (WITH ALLOWANCE)',
    );

    expect(results?.rows).toEqual([
      { label: 'Measured volume', value: `${calculation.volumeCubicYards.toFixed(2)} yd³` },
      {
        label: 'Extra allowance',
        value: `+${calculation.allowanceVolumeCubicYards.toFixed(2)} yd³`,
      },
      {
        label: 'Volume with allowance',
        value: `${calculation.adjustedVolumeCubicYards.toFixed(2)} yd³`,
      },
      {
        label: 'Recommended order',
        value: `${calculation.recommendedOrderCubicYards.toFixed(1)} yd³`,
        emphasis: true,
      },
      {
        label: 'Estimated weight',
        value: `${calculation.estimatedWeightTons.toFixed(2)} short tons`,
      },
    ]);
    expect(volumes?.rows[0]).toEqual({
      label: 'Cubic yards',
      value: `${calculation.adjustedVolumeCubicYards.toFixed(2)} yd³`,
    });
  });

  it('keeps zero-allowance adjusted volume equal to measured volume', () => {
    const calculation = calculateGravel(input);
    const report = createGravelEstimateReport({
      calculation,
      input,
      recommendation: recommendGravel(input, calculation),
      measurementSystem: 'imperial',
    });
    const results = report.rightSections?.find((section) => section.title === 'ESTIMATE RESULTS');

    expect(results?.rows[0].value).toBe(results?.rows[2].value);
    expect(results?.rows[1].value).toBe('+0 yd³');
  });

  it('omits inactive volume-mode measurements, depth guidance, and empty warnings', () => {
    const volumeInput: GravelInput = {
      ...input,
      inputMode: 'volume',
      knownVolume: { value: 4.5, unit: 'yd³' },
      depth: { value: Number.NaN, unit: 'in' },
      allowancePercent: 10,
      projectType: 'walkway',
      pricePerCubicYard: undefined,
      deliveryFee: undefined,
      bagSizeCubicFeet: undefined,
      truckCapacityCubicYards: undefined,
    };
    const calculation = calculateGravel(volumeInput);
    const report = createGravelEstimateReport({
      calculation,
      input: volumeInput,
      recommendation: recommendGravel(volumeInput, calculation),
      measurementSystem: 'imperial',
    });

    expect(report.leftSections?.[0].rows).toEqual([{ label: 'Volume', value: '4.5 yd³' }]);
    expect(report.guidance).toEqual([expect.objectContaining({ label: 'Material' })]);
    expect(report.warnings).toBeUndefined();
    expect(report.additionalDetails).toBeUndefined();
  });

  it('uses plain WHY copy without the obsolete collision-prone equation', () => {
    const calculation = calculateGravel(input);
    const report = createGravelEstimateReport({
      calculation,
      input,
      recommendation: recommendGravel(input, calculation),
      measurementSystem: 'imperial',
    });
    const html = createEstimateReportHtml(report);

    expect(report.customSections?.[0]?.content).toContain('Your measured volume');
    expect(html).not.toContain('equation-box');
    expect(html).not.toContain('Allowance factor');
    expect(html).not.toContain('Calculated need×');
  });

  it('includes price per bag only when bag pricing was submitted', () => {
    const bagPricedInput: GravelInput = {
      ...input,
      length: { value: 20, unit: 'ft' },
      width: { value: 15, unit: 'ft' },
      depth: { value: 4, unit: 'in' },
      allowancePercent: 10,
      pricePerCubicYard: undefined,
      deliveryFee: 20,
      bagSizeCubicFeet: 0.5,
      bagPrice: 20,
      truckCapacityCubicYards: 200,
    };
    const calculation = calculateGravel(bagPricedInput);
    const report = createGravelEstimateReport({
      calculation,
      input: bagPricedInput,
      recommendation: recommendGravel(bagPricedInput, calculation),
      measurementSystem: 'imperial',
    });
    const withoutBagPrice = createGravelEstimateReport({
      calculation: calculateGravel({ ...bagPricedInput, bagPrice: undefined }),
      input: { ...bagPricedInput, bagPrice: undefined },
      recommendation: recommendGravel(
        { ...bagPricedInput, bagPrice: undefined },
        calculateGravel({ ...bagPricedInput, bagPrice: undefined }),
      ),
      measurementSystem: 'imperial',
    });

    expect(report.additionalDetails).toEqual(
      expect.arrayContaining([
        { label: 'Price / bag', value: '$20.00' },
        { label: 'Bags', value: '220 bags' },
        { label: 'Truck loads', value: '1 load' },
        { label: 'Estimated cost', value: '$4,420.00', emphasis: true },
      ]),
    );
    expect(withoutBagPrice.additionalDetails?.some((row) => row.label === 'Price / bag')).toBe(
      false,
    );
  });
});
