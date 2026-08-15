import { describe, expect, it } from 'vitest';
import { calculateTile } from './calculator';
import { createTileEstimateText } from './estimateSummary';
import { createDefaultTileInput } from './formDefaults';
import { createTilePurchasingMetrics } from './resultPresentation';
import { createTileEstimateReport } from './tileReport';

const imperialInput = () => {
  const input = createDefaultTileInput();
  input.tileLength = 12;
  input.tileWidth = 12;
  return input;
};

describe('tile purchasing result presentation', () => {
  it('shows boxes, purchased tiles, and extra tiles in tiles-per-box mode', () => {
    const input = imperialInput();
    input.tilesPerBox = 10;
    expect(createTilePurchasingMetrics(input, calculateTile(input))).toEqual([
      { label: 'Boxes required', value: '14' },
      { label: 'Tiles purchased', value: '140' },
      { label: 'Extra tiles', value: '8' },
    ]);
  });

  it('keeps a meaningful zero extra-tile result visible', () => {
    const input = imperialInput();
    input.length.value = 10;
    input.width.value = 10;
    input.wastePercent = 0;
    input.tilesPerBox = 10;
    expect(createTilePurchasingMetrics(input, calculateTile(input))).toContainEqual({
      label: 'Extra tiles',
      value: '0',
    });
  });

  it('shows all manufacturer-coverage purchasing values in Imperial units', () => {
    const input = imperialInput();
    input.boxMode = 'coverage';
    input.manufacturerCoverage = 15.5;
    expect(createTilePurchasingMetrics(input, calculateTile(input))).toEqual([
      { label: 'Purchasing coverage required', value: '132 sq ft' },
      { label: 'Boxes required', value: '9' },
      { label: 'Coverage purchased', value: '139.5 sq ft' },
      { label: 'Extra coverage', value: '7.5 sq ft' },
    ]);
  });

  it('uses Metric area units while tile count remains dimension-based', () => {
    const input = imperialInput();
    input.measurementSystem = 'metric';
    input.length = { value: 5, unit: 'm' };
    input.width = { value: 4, unit: 'm' };
    input.tileLength = 500;
    input.tileWidth = 500;
    input.tileUnit = 'mm';
    input.groutUnit = 'mm';
    input.boxMode = 'coverage';
    input.manufacturerCoverage = 1.44;
    input.manufacturerCoverageUnit = 'sq-m';
    const result = calculateTile(input);
    expect(result.requiredTiles).toBe(88);
    expect(createTilePurchasingMetrics(input, result)).toEqual([
      { label: 'Purchasing coverage required', value: '22 sq m' },
      { label: 'Boxes required', value: '16' },
      { label: 'Coverage purchased', value: '23.04 sq m' },
      { label: 'Extra coverage', value: '1.04 sq m' },
    ]);
  });

  it('omits purchasing metrics when box purchasing is not configured', () => {
    const input = imperialInput();
    expect(createTilePurchasingMetrics(input, calculateTile(input))).toEqual([]);
  });

  it('keeps web, Copy, and report purchasing quantities aligned', () => {
    const input = imperialInput();
    input.boxMode = 'coverage';
    input.manufacturerCoverage = 15.5;
    const result = calculateTile(input);
    const metrics = createTilePurchasingMetrics(input, result);
    const copy = createTileEstimateText(input, result);
    const report = JSON.stringify(createTileEstimateReport(input, result));

    for (const value of ['132 sq ft', '9', '139.5 sq ft', '7.5 sq ft']) {
      expect(metrics.some((metric) => metric.value === value)).toBe(true);
      expect(copy).toContain(value);
      expect(report).toContain(value);
    }
  });
});
