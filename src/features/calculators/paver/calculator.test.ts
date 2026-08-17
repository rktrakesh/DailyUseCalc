import { describe, expect, it } from 'vitest';
import { MAX_PURCHASE_QUOTIENT } from '../../../lib/calculators/rounding';
import { calculatePaver } from './calculator';
import { createDefaultPaverInput } from './formDefaults';

describe('paver calculator engine', () => {
  it('calculates a 20 ft by 15 ft project with 6 by 9 in pavers', () => {
    const input = createDefaultPaverInput();
    input.length.value = 20;
    input.width.value = 15;
    input.wastePercent = 0;
    const result = calculatePaver(input);
    expect(result.projectAreaSquareFeet).toBeCloseTo(300, 10);
    expect(result.paverFaceAreaSquareFeet).toBeCloseTo(0.375, 10);
    expect(result.rawPavers).toBeCloseTo(800, 10);
    expect(result.requiredPavers).toBe(800);
  });

  it('applies waste once before final whole-paver rounding', () => {
    const input = createDefaultPaverInput();
    input.length.value = 20;
    input.width.value = 15;
    expect(calculatePaver(input).requiredPavers).toBe(840);
  });

  it('rounds a genuine 800.01 requirement upward', () => {
    const input = createDefaultPaverInput();
    Object.assign(input, {
      measureMode: 'area',
      knownArea: 800.01,
      areaUnit: 'sq-ft',
      paverPreset: 'custom',
      paverLength: 12,
      paverWidth: 12,
      wastePercent: 0,
    });
    expect(calculatePaver(input).requiredPavers).toBe(801);
  });

  it.each([
    [100, 0, 100],
    [100, 10, 110],
  ])('calculates known area %s with %s percent waste', (area, waste, expected) => {
    const input = createDefaultPaverInput();
    Object.assign(input, {
      measureMode: 'area',
      knownArea: area,
      paverPreset: 'custom',
      paverLength: 12,
      paverWidth: 12,
      wastePercent: waste,
    });
    expect(calculatePaver(input).requiredPavers).toBe(expected);
  });

  it('calculates a 10 ft diameter circle', () => {
    const input = createDefaultPaverInput();
    Object.assign(input, {
      shape: 'circle',
      paverPreset: 'custom',
      paverLength: 12,
      paverWidth: 12,
      wastePercent: 0,
    });
    input.diameter.value = 10;
    const result = calculatePaver(input);
    expect(result.projectAreaSquareFeet).toBeCloseTo(Math.PI * 25, 10);
    expect(result.requiredPavers).toBe(79);
  });

  it('calculates optional base and bedding sand only when enabled', () => {
    const input = createDefaultPaverInput();
    Object.assign(input, { measureMode: 'area', knownArea: 300, wastePercent: 0 });
    expect(calculatePaver(input).baseVolumeCubicFeet).toBeUndefined();
    expect(calculatePaver(input).sandVolumeCubicFeet).toBeUndefined();
    input.estimateBase = true;
    input.estimateSand = true;
    input.baseDepth.value = 4;
    input.sandDepth.value = 1;
    const result = calculatePaver(input);
    expect(result.baseVolumeCubicFeet).toBeCloseTo(100, 10);
    expect(result.baseVolumeCubicFeet! / 27).toBeCloseTo(3.7037037037, 10);
    expect(result.sandVolumeCubicFeet).toBeCloseTo(25, 10);
    expect(result.sandVolumeCubicFeet! / 27).toBeCloseTo(0.9259259259, 10);
  });

  it('calculates material cost from final whole pavers', () => {
    const input = createDefaultPaverInput();
    Object.assign(input, {
      measureMode: 'area',
      knownArea: 300,
      estimateCost: true,
      pricePerPaver: 1.25,
    });
    const result = calculatePaver(input);
    expect(result.requiredPavers).toBe(840);
    expect(result.estimatedCost).toBe(1050);
  });

  it('uses joint spacing for effective modular coverage', () => {
    const input = createDefaultPaverInput();
    Object.assign(input, {
      measureMode: 'area',
      knownArea: 100,
      paverPreset: 'custom',
      paverLength: 12,
      paverWidth: 12,
      jointWidth: 0.25,
      wastePercent: 0,
    });
    const result = calculatePaver(input);
    expect(result.effectiveCoverageSquareFeet).toBeCloseTo((12.25 * 12.25) / 144, 12);
  });

  it('accepts the maximum supported whole-paver quotient', () => {
    const input = createDefaultPaverInput();
    Object.assign(input, {
      measureMode: 'area',
      knownArea: MAX_PURCHASE_QUOTIENT,
      paverPreset: 'custom',
      paverLength: 12,
      paverWidth: 12,
      wastePercent: 0,
    });
    expect(calculatePaver(input).requiredPavers).toBe(MAX_PURCHASE_QUOTIENT);
  });
});
