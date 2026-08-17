import { describe, expect, it } from 'vitest';
import { calculatePaver } from './calculator';
import { createDefaultPaverInput } from './formDefaults';
import { convertPaverMeasurementSystem } from './formUnits';

describe('paver measurement-system conversion', () => {
  it('preserves a physical project across Imperial and Metric', () => {
    const input = createDefaultPaverInput();
    input.length.value = 20;
    input.width.value = 15;
    input.jointWidth = 0.25;
    input.estimateBase = true;
    input.estimateSand = true;
    input.baseDepth.value = 4;
    input.sandDepth.value = 1;
    const before = calculatePaver(input);
    const metric = convertPaverMeasurementSystem(input, 'metric');
    const after = calculatePaver(metric);
    expect(metric.length.value).toBeCloseTo(6.096, 6);
    expect(metric.paverLength).toBeCloseTo(152.4, 6);
    expect(metric.jointWidth).toBeCloseTo(6.35, 6);
    expect(after.projectAreaSquareFeet).toBeCloseTo(before.projectAreaSquareFeet, 5);
    expect(after.requiredPavers).toBe(before.requiredPavers);
    expect(after.baseVolumeCubicFeet).toBeCloseTo(before.baseVolumeCubicFeet!, 5);
    expect(after.sandVolumeCubicFeet).toBeCloseTo(before.sandVolumeCubicFeet!, 5);
  });

  it('round trips without changing the purchasing recommendation', () => {
    const input = createDefaultPaverInput();
    input.length.value = 20;
    input.width.value = 15;
    const metric = convertPaverMeasurementSystem(input, 'metric');
    const restored = convertPaverMeasurementSystem(metric, 'imperial');
    expect(restored.length.value).toBeCloseTo(20, 5);
    expect(restored.width.value).toBeCloseTo(15, 5);
    expect(restored.paverLength).toBeCloseTo(6, 5);
    expect(calculatePaver(restored).requiredPavers).toBe(calculatePaver(input).requiredPavers);
  });

  it('converts known area using its actual current unit', () => {
    const input = createDefaultPaverInput();
    Object.assign(input, { measureMode: 'area', knownArea: 100, areaUnit: 'sq-ft' });
    const metric = convertPaverMeasurementSystem(input, 'metric');
    expect(metric.knownArea).toBeCloseTo(9.290304, 6);
    expect(calculatePaver(metric).requiredPavers).toBe(calculatePaver(input).requiredPavers);
  });
});
