import { describe, expect, it } from 'vitest';
import { MAX_PURCHASE_QUOTIENT } from '../../../lib/calculators/rounding';
import { createDefaultPaverInput } from './formDefaults';
import { validatePaverInput } from './validation';

const valid = () => {
  const input = createDefaultPaverInput();
  input.length.value = 20;
  input.width.value = 15;
  return input;
};

describe('paver validation', () => {
  it('requires contextual geometry values', () => {
    const input = createDefaultPaverInput();
    expect(validatePaverInput(input).map((issue) => issue.field)).toEqual(['length', 'width']);
    input.shape = 'circle';
    expect(validatePaverInput(input).map((issue) => issue.field)).toEqual(['diameter']);
    input.measureMode = 'area';
    expect(validatePaverInput(input).map((issue) => issue.field)).toEqual(['knownArea']);
  });

  it('validates custom paver size, waste, and joint width', () => {
    const input = valid();
    Object.assign(input, { paverLength: 0, paverWidth: -1, wastePercent: 101, jointWidth: -0.1 });
    expect(validatePaverInput(input).map((issue) => issue.field)).toEqual([
      'paverLength',
      'paverWidth',
      'wastePercent',
      'jointWidth',
    ]);
  });

  it('validates enabled advanced estimates and ignores disabled stored depths', () => {
    const input = valid();
    input.baseDepth.value = Number.NaN;
    input.sandDepth.value = 0;
    expect(validatePaverInput(input)).toEqual([]);
    input.estimateBase = true;
    input.estimateSand = true;
    input.estimateCost = true;
    expect(validatePaverInput(input).map((issue) => issue.field)).toEqual([
      'baseDepth',
      'sandDepth',
      'pricePerPaver',
    ]);
    input.pricePerPaver = -1;
    expect(validatePaverInput(input).some((issue) => issue.field === 'pricePerPaver')).toBe(true);
    input.pricePerPaver = 0;
    expect(validatePaverInput(input).some((issue) => issue.field === 'pricePerPaver')).toBe(false);
  });

  it('rejects nonfinite values', () => {
    const input = valid();
    input.length.value = Number.POSITIVE_INFINITY;
    input.wastePercent = Number.NaN;
    expect(validatePaverInput(input).map((issue) => issue.field)).toContain('length');
    expect(validatePaverInput(input).map((issue) => issue.field)).toContain('wastePercent');
  });

  it('rejects unsupported derived purchasing quantities before calculation', () => {
    const input = valid();
    Object.assign(input, {
      measureMode: 'area',
      knownArea: MAX_PURCHASE_QUOTIENT + 1,
      areaUnit: 'sq-ft',
      paverPreset: 'custom',
      paverLength: 12,
      paverWidth: 12,
      wastePercent: 0,
    });
    expect(validatePaverInput(input)).toContainEqual({
      field: 'purchasing',
      message: 'This project produces too many pavers for a reliable estimate.',
    });
  });
});
