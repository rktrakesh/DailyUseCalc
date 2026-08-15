import { describe, expect, it } from 'vitest';
import { DEFAULT_ADVANCED_OPTIONS_EXPANDED, hasAdvancedOptionIssue } from './advancedOptions';

describe('Gravel Advanced Options disclosure policy', () => {
  it('starts collapsed', () => {
    expect(DEFAULT_ADVANCED_OPTIONS_EXPANDED).toBe(false);
  });

  it('reveals hidden Advanced Options for an advanced validation issue', () => {
    expect(
      hasAdvancedOptionIssue([
        { field: 'truckCapacityCubicYards', message: 'Use a larger truck capacity.' },
      ]),
    ).toBe(true);
    expect(hasAdvancedOptionIssue([{ field: 'length', message: 'Enter a length.' }])).toBe(false);
  });
});
