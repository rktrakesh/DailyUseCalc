import { describe, expect, it } from 'vitest';
import { paverAnalyticsParameters } from './analytics';
import { createDefaultPaverInput } from './formDefaults';

describe('paver analytics metadata', () => {
  it('contains only approved categorical metadata', () => {
    const input = createDefaultPaverInput();
    input.length.value = 20;
    input.width.value = 15;
    input.pricePerPaver = 1.25;
    expect(paverAnalyticsParameters(input)).toEqual({
      calculator_id: 'paver',
      calculator_name: 'Paver Calculator',
      project_type: 'patio',
      unit_system: 'imperial',
    });
  });
});
