import { describe, expect, it } from 'vitest';
import { calculateConcrete, createDefaultConcreteInput, recommendConcrete } from '.';
import { LARGE_BAGGED_QUANTITY_WARNING, READY_MIX_COMPARISON_VOLUME_YD3 } from './recommendations';
import type { ConcreteInput, ConcreteMode } from './types';

const thinWarning =
  'This is a very thin concrete layer. Confirm the planned thickness with a qualified professional.';

function warningsFor(concreteMode: ConcreteMode, thickness: ConcreteInput['thickness']): string[] {
  const input = { ...createDefaultConcreteInput(), concreteMode, thickness };
  return recommendConcrete(input, calculateConcrete(input)).warnings;
}

describe('concrete recommendations', () => {
  function inputForAdjustedVolume(
    cubicYards: number,
    bagPreset: ConcreteInput['bagPreset'],
  ): ConcreteInput {
    return {
      ...createDefaultConcreteInput(),
      length: { value: cubicYards * 27, unit: 'ft' },
      width: { value: 1, unit: 'ft' },
      thickness: { value: 1, unit: 'ft' },
      allowancePercent: 0,
      bagPreset,
    };
  }

  it.each(['slab', 'circular-pad'] as ConcreteMode[])(
    'warns for equivalent thin imperial and metric %s thicknesses',
    (concreteMode) => {
      expect(warningsFor(concreteMode, { value: 2, unit: 'in' })).toContain(thinWarning);
      expect(warningsFor(concreteMode, { value: 5.08, unit: 'cm' })).toContain(thinWarning);
      expect(warningsFor(concreteMode, { value: 0.1667, unit: 'ft' })).toContain(thinWarning);
    },
  );

  it.each(['slab', 'circular-pad'] as ConcreteMode[])(
    'does not warn for equivalent acceptable imperial and metric %s thicknesses',
    (concreteMode) => {
      expect(warningsFor(concreteMode, { value: 4, unit: 'in' })).not.toContain(thinWarning);
      expect(warningsFor(concreteMode, { value: 10.16, unit: 'cm' })).not.toContain(thinWarning);
    },
  );

  it.each(['column', 'post-hole'] as ConcreteMode[])(
    'does not apply the thin-layer warning to %s',
    (concreteMode) => {
      expect(warningsFor(concreteMode, { value: 2, unit: 'in' })).not.toContain(thinWarning);
      expect(warningsFor(concreteMode, { value: 5.08, unit: 'cm' })).not.toContain(thinWarning);
    },
  );

  it('does not suggest a ready-mix comparison below the volume threshold', () => {
    const input = inputForAdjustedVolume(READY_MIX_COMPARISON_VOLUME_YD3 - 0.01, '40-lb');
    expect(recommendConcrete(input, calculateConcrete(input)).warnings).not.toContain(
      LARGE_BAGGED_QUANTITY_WARNING,
    );
  });

  it.each(['40-lb', '30-kg'] as const)(
    'suggests the same ready-mix comparison at the threshold with %s bags',
    (bagPreset) => {
      const input = inputForAdjustedVolume(READY_MIX_COMPARISON_VOLUME_YD3, bagPreset);
      expect(recommendConcrete(input, calculateConcrete(input)).warnings).toContain(
        LARGE_BAGGED_QUANTITY_WARNING,
      );
    },
  );
});
