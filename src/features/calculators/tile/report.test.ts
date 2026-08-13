import { describe, expect, it } from 'vitest';
import { createEstimateReportHtml } from '../../../components/reports/EstimateReport';
import { calculateTile } from './calculator';
import { createDefaultTileInput } from './formDefaults';
import { createTileEstimateReport } from './tileReport';
describe('tile report', () => {
  it('creates a normal selectable one-page report model', () => {
    const i = createDefaultTileInput();
    i.tileLength = 12;
    i.tileWidth = 12;
    const r = createTileEstimateReport(i, calculateTile(i), new Date(2026, 0, 2));
    const html = createEstimateReportHtml(r);
    expect(r.primaryResult.value).toBe('132 tiles');
    expect(html).toContain('TILE PROJECT ESTIMATE');
    expect(html).toContain('Estimated tiles required');
    expect(html).not.toContain('NaN');
  });
  it('includes purchasing, pricing, exclusions, and override wording conditionally', () => {
    const i = createDefaultTileInput();
    i.tileLength = 12;
    i.tileWidth = 24;
    i.groutGap = 0.125;
    i.excludedArea = 12;
    i.boxMode = 'coverage';
    i.manufacturerCoverage = 15.5;
    i.priceBasis = 'box';
    i.price = 35;
    const text = JSON.stringify(createTileEstimateReport(i, calculateTile(i)));
    expect(text).toContain('Box / purchasing');
    expect(text).toContain('Pricing');
    expect(text).toContain('Manufacturer coverage overrides');
    expect(text).toContain('Excluded area');
  });
  it('uses metric-first area values', () => {
    const i = createDefaultTileInput();
    i.measurementSystem = 'metric';
    i.length = { value: 5, unit: 'm' };
    i.width = { value: 4, unit: 'm' };
    i.tileLength = 500;
    i.tileWidth = 500;
    i.tileUnit = 'mm';
    const text = JSON.stringify(createTileEstimateReport(i, calculateTile(i)));
    expect(text).toContain('20 sq m');
    expect(text).toContain('88 tiles');
  });
});
