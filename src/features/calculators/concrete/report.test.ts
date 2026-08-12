import { describe, expect, it } from 'vitest';
import { createEstimateReportHtml } from '../../../components/reports/EstimateReport';
import { calculateConcrete, createDefaultConcreteInput, recommendConcrete } from '.';
import { createConcreteEstimateReport } from './concreteReport';
import type { ConcreteMode } from './types';

describe('concrete report', () => {
  it.each(['slab', 'circular-pad', 'column', 'post-hole'] as ConcreteMode[])(
    'includes only active %s measurements',
    (mode) => {
      const input = { ...createDefaultConcreteInput(), concreteMode: mode };
      const calculation = calculateConcrete(input);
      const report = createConcreteEstimateReport({
        input,
        calculation,
        recommendation: recommendConcrete(input, calculation),
        measurementSystem: 'imperial',
        generatedAt: new Date('2026-08-12T12:00:00'),
      });
      const labels = report.leftSections?.[0].rows.map((row) => row.label);
      expect(labels).toContain('Quantity');
      if (mode === 'slab') expect(labels).toEqual(['Length', 'Width', 'Thickness', 'Quantity']);
      if (mode === 'circular-pad') expect(labels).toEqual(['Diameter', 'Thickness', 'Quantity']);
      if (mode === 'column') expect(labels).toEqual(['Diameter', 'Height', 'Quantity']);
      if (mode === 'post-hole') expect(labels).toEqual(['Hole diameter', 'Hole depth', 'Quantity']);
      expect(report.footerUrl).toBe('dailyusecalc.com/concrete');
    },
  );
  it('keeps measured and adjusted semantics and uses adjusted weight', () => {
    const input = createDefaultConcreteInput();
    const calculation = calculateConcrete(input);
    const report = createConcreteEstimateReport({
      input,
      calculation,
      recommendation: recommendConcrete(input, calculation),
      measurementSystem: 'imperial',
    });
    const results = report.rightSections?.find(
      (section) => section.title === 'ESTIMATE RESULTS',
    )?.rows;
    expect(results?.find((row) => row.label === 'Measured volume')?.value).toContain(
      calculation.volumeCubicYards.toFixed(2),
    );
    expect(results?.find((row) => row.label === 'Volume with allowance')?.value).toContain(
      calculation.adjustedVolumeCubicYards.toFixed(2),
    );
    expect(results?.find((row) => row.label === 'Estimated weight')?.value).toContain(
      (calculation.estimatedWeightPounds / 2000).toFixed(2),
    );
  });
  it('shows bag and ready-mix purchasing details and both costs', () => {
    const input = {
      ...createDefaultConcreteInput(),
      readyMixPricePerCubicYard: 150,
      readyMixDeliveryFee: 50,
      bagPrice: 8,
    };
    const calculation = calculateConcrete(input);
    const report = createConcreteEstimateReport({
      input,
      calculation,
      recommendation: recommendConcrete(input, calculation),
      measurementSystem: 'imperial',
    });
    expect(report.additionalDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Ready-mix price / yd³' }),
        expect.objectContaining({ label: 'Bag size', value: '80 lb' }),
        expect.objectContaining({ label: 'Bags' }),
        expect.objectContaining({ label: 'Ready-mix cost' }),
        expect.objectContaining({ label: 'Bag cost' }),
      ]),
    );
  });

  it('formats ready-mix and bag costs with the same selected currency', () => {
    const input = {
      ...createDefaultConcreteInput('EUR'),
      readyMixPricePerCubicYard: 150,
      bagPrice: 8,
    };
    const calculation = calculateConcrete(input);
    const report = createConcreteEstimateReport({
      input,
      calculation,
      recommendation: recommendConcrete(input, calculation),
      measurementSystem: 'imperial',
    });

    expect(report.additionalDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Ready-mix cost', value: expect.stringContaining('€') }),
        expect.objectContaining({ label: 'Bag cost', value: expect.stringContaining('€') }),
      ]),
    );
  });
  it.each([
    ['30-kg', undefined, undefined, '30 kg'],
    ['custom', 25, 'kg', '25 kg'],
    ['custom', undefined, undefined, 'Custom'],
  ] as const)('reports purchasing details for %s bags', (bagPreset, weight, unit, expected) => {
    const input = {
      ...createDefaultConcreteInput(),
      bagPreset,
      customBagYieldCubicFeet: bagPreset === 'custom' ? 0.5 : undefined,
      customBagWeight: weight,
      customBagWeightUnit: unit ?? ('lb' as const),
    };
    const calculation = calculateConcrete(input);
    const report = createConcreteEstimateReport({
      input,
      calculation,
      recommendation: recommendConcrete(input, calculation),
      measurementSystem: 'imperial',
    });
    expect(report.additionalDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Bag size', value: expected }),
        expect.objectContaining({ label: 'Bag yield', value: '0.5 ft³ / bag' }),
        expect.objectContaining({ label: 'Bags', value: '147 bags' }),
      ]),
    );
  });
  it('omits empty warnings and retains HTML escaping', () => {
    const input = { ...createDefaultConcreteInput(), allowancePercent: 10 };
    const calculation = calculateConcrete(input);
    const report = createConcreteEstimateReport({
      input,
      calculation,
      recommendation: {
        ...recommendConcrete(input, calculation),
        explanation: '<img src=x onerror=alert(1)>',
      },
      measurementSystem: 'imperial',
    });
    const html = createEstimateReportHtml(report);
    expect(report.warnings).toBeUndefined();
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });
});
