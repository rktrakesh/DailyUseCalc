import { describe, expect, it } from 'vitest';
import { calculateTile } from './calculator';
import { createDefaultTileInput } from './formDefaults';
import { convertTileMeasurementSystem } from './formUnits';
import type { Dimension } from './types';

const convertSurface = (
  dimension: Dimension,
  from: 'imperial' | 'metric',
  to: 'imperial' | 'metric',
) => {
  const input = createDefaultTileInput();
  input.measurementSystem = from;
  input.length = dimension;
  return convertTileMeasurementSystem(input, to).length;
};

describe('Tile measurement-system conversion', () => {
  it.each([
    [{ value: 12, unit: 'in' }, 0.3048],
    [{ value: 1, unit: 'ft' }, 0.3048],
    [{ value: 1, unit: 'yd' }, 0.9144],
  ] as const)('converts Imperial surface dimensions from their actual unit', (source, expected) => {
    expect(convertSurface(source, 'imperial', 'metric')).toEqual({ value: expected, unit: 'm' });
  });

  it.each([
    [{ value: 1000, unit: 'mm' }, 3.28084],
    [{ value: 100, unit: 'cm' }, 3.28084],
    [{ value: 1, unit: 'm' }, 3.28084],
  ] as const)('converts Metric surface dimensions from their actual unit', (source, expected) => {
    const converted = convertSurface(source, 'metric', 'imperial');
    expect(converted.unit).toBe('ft');
    expect(converted.value).toBeCloseTo(expected, 5);
  });

  it('converts every supported surface geometry field from its own unit', () => {
    const input = createDefaultTileInput();
    const fields = [
      'length',
      'width',
      'side',
      'diameter',
      'base',
      'perpendicularHeight',
      'sideA',
      'sideB',
      'outerDiameter',
      'innerDiameter',
    ] as const;
    fields.forEach((field, index) => {
      input[field] =
        index % 3 === 0
          ? { value: 12, unit: 'in' }
          : index % 3 === 1
            ? { value: 1, unit: 'ft' }
            : { value: 1 / 3, unit: 'yd' };
    });

    const converted = convertTileMeasurementSystem(input, 'metric');
    for (const field of fields) {
      expect(converted[field]).toEqual({ value: 0.3048, unit: 'm' });
    }
  });

  it.each([
    ['sq-in', 144, 0.092903],
    ['sq-ft', 1, 0.092903],
    ['sq-yd', 1, 0.836127],
  ] as const)('converts Imperial Known Area from %s', (unit, value, expected) => {
    const input = createDefaultTileInput();
    input.measureMode = 'area';
    input.knownArea = value;
    input.areaUnit = unit;
    const converted = convertTileMeasurementSystem(input, 'metric');
    expect(converted.areaUnit).toBe('sq-m');
    expect(converted.knownArea).toBeCloseTo(expected, 6);
  });

  it.each([
    ['sq-cm', 10_000],
    ['sq-m', 1],
  ] as const)('converts Metric Known Area from %s', (unit, value) => {
    const input = createDefaultTileInput();
    input.measurementSystem = 'metric';
    input.knownArea = value;
    input.areaUnit = unit;
    const converted = convertTileMeasurementSystem(input, 'imperial');
    expect(converted.areaUnit).toBe('sq-ft');
    expect(converted.knownArea).toBeCloseTo(10.76391, 5);
  });

  it('converts tile dimensions and grout from their actual units in both directions', () => {
    const inches = createDefaultTileInput();
    inches.tileLength = 12;
    inches.tileWidth = 1;
    inches.tileUnit = 'in';
    inches.groutGap = 0.125;
    expect(convertTileMeasurementSystem(inches, 'metric')).toMatchObject({
      tileLength: 304.8,
      tileWidth: 25.4,
      tileUnit: 'mm',
      groutGap: 3.175,
      groutUnit: 'mm',
    });

    const feet = { ...inches, tileLength: 1, tileWidth: 1, tileUnit: 'ft' as const };
    expect(convertTileMeasurementSystem(feet, 'metric').tileLength).toBe(304.8);

    const metric = convertTileMeasurementSystem(inches, 'metric');
    metric.tileLength = 304.8;
    metric.tileWidth = 30.48;
    metric.tileUnit = 'mm';
    metric.groutGap = 3.175;
    expect(convertTileMeasurementSystem(metric, 'imperial')).toMatchObject({
      tileLength: 12,
      tileWidth: 1.2,
      tileUnit: 'in',
      groutGap: 0.125,
      groutUnit: 'in',
    });

    metric.tileLength = 30.48;
    metric.tileUnit = 'cm';
    expect(convertTileMeasurementSystem(metric, 'imperial').tileLength).toBe(12);
  });

  it('converts optional areas from their own units and keeps undefined values undefined', () => {
    const input = createDefaultTileInput();
    input.excludedArea = 1;
    input.excludedAreaUnit = 'sq-yd';
    input.manufacturerCoverage = 15.5;
    input.manufacturerCoverageUnit = 'sq-ft';
    const metric = convertTileMeasurementSystem(input, 'metric');
    expect(metric.excludedArea).toBeCloseTo(0.836127, 6);
    expect(metric.manufacturerCoverage).toBeCloseTo(1.439997, 6);

    const restored = convertTileMeasurementSystem(metric, 'imperial');
    expect(restored.excludedArea).toBeCloseTo(9, 5);
    expect(restored.manufacturerCoverage).toBeCloseTo(15.5, 5);

    input.manufacturerCoverage = 2;
    input.manufacturerCoverageUnit = 'sq-yd';
    expect(convertTileMeasurementSystem(input, 'metric').manufacturerCoverage).toBeCloseTo(
      1.672255,
      6,
    );

    input.excludedArea = undefined;
    input.manufacturerCoverage = undefined;
    expect(convertTileMeasurementSystem(input, 'metric')).toMatchObject({
      excludedArea: undefined,
      manufacturerCoverage: undefined,
    });
  });

  it('preserves representative projects through both round-trip directions', () => {
    const imperial = createDefaultTileInput();
    imperial.length = { value: 144, unit: 'in' };
    imperial.width = { value: 4, unit: 'yd' };
    imperial.knownArea = 2.5;
    imperial.areaUnit = 'sq-yd';
    imperial.excludedArea = 144;
    imperial.excludedAreaUnit = 'sq-in';
    imperial.tileLength = 1;
    imperial.tileWidth = 0.5;
    imperial.tileUnit = 'ft';
    imperial.groutGap = 0.125;
    imperial.manufacturerCoverage = 2;
    imperial.manufacturerCoverageUnit = 'sq-yd';
    const restoredImperial = convertTileMeasurementSystem(
      convertTileMeasurementSystem(imperial, 'metric'),
      'imperial',
    );
    expect(restoredImperial.length.value).toBeCloseTo(12, 5);
    expect(restoredImperial.width.value).toBeCloseTo(12, 5);
    expect(restoredImperial.knownArea).toBeCloseTo(22.5, 5);
    expect(restoredImperial.excludedArea).toBeCloseTo(1, 5);
    expect(restoredImperial.tileLength).toBeCloseTo(12, 5);
    expect(restoredImperial.tileWidth).toBeCloseTo(6, 5);
    expect(restoredImperial.groutGap).toBeCloseTo(0.125, 5);
    expect(restoredImperial.manufacturerCoverage).toBeCloseTo(18, 5);

    const metric = convertTileMeasurementSystem(imperial, 'metric');
    metric.length = { value: 120, unit: 'cm' };
    metric.width = { value: 250, unit: 'cm' };
    const restoredMetric = convertTileMeasurementSystem(
      convertTileMeasurementSystem(metric, 'imperial'),
      'metric',
    );
    expect(restoredMetric.length.value).toBeCloseTo(1.2, 5);
    expect(restoredMetric.width.value).toBeCloseTo(2.5, 5);
  });

  it('preserves calculated results when switching systems', () => {
    const input = createDefaultTileInput();
    input.length = { value: 144, unit: 'in' };
    input.width = { value: 4, unit: 'yd' };
    input.tileLength = 1;
    input.tileWidth = 0.5;
    input.tileUnit = 'ft';
    input.groutGap = 0.125;
    input.excludedArea = 144;
    input.excludedAreaUnit = 'sq-in';
    input.boxMode = 'coverage';
    input.manufacturerCoverage = 2;
    input.manufacturerCoverageUnit = 'sq-yd';
    input.priceBasis = 'box';
    input.price = 42.75;

    const before = calculateTile(input);
    const after = calculateTile(convertTileMeasurementSystem(input, 'metric'));
    const fields: (keyof ReturnType<typeof calculateTile>)[] = [
      'grossAreaSquareFeet',
      'netAreaSquareFeet',
      'rawTiles',
      'wasteAdjustedTiles',
      'requiredTiles',
      'boxesRequired',
      'purchasedCoverageSquareFeet',
      'extraPurchasedCoverageSquareFeet',
      'estimatedCost',
    ];
    for (const field of fields) {
      expect(after[field]).toBeCloseTo(before[field] as number, 4);
    }
  });

  it('preserves NaN values for safely editable empty required fields', () => {
    const input = createDefaultTileInput();
    input.length.value = Number.NaN;
    input.knownArea = Number.NaN;
    input.tileLength = Number.NaN;
    const converted = convertTileMeasurementSystem(input, 'metric');
    expect(converted.length.value).toBeNaN();
    expect(converted.knownArea).toBeNaN();
    expect(converted.tileLength).toBeNaN();
  });
});
