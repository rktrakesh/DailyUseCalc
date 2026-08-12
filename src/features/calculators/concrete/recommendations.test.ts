import { describe, expect, it } from 'vitest';
import { calculateConcrete, createDefaultConcreteInput, recommendConcrete } from '.';
import type { ConcreteInput, ConcreteMode } from './types';

const thinWarning =
  'This is a very thin concrete layer. Confirm the planned thickness with a qualified professional.';

function warningsFor(concreteMode: ConcreteMode, thickness: ConcreteInput['thickness']): string[] {
  const input = { ...createDefaultConcreteInput(), concreteMode, thickness };
  return recommendConcrete(input, calculateConcrete(input)).warnings;
}

describe('concrete recommendations', () => {
  it.each(['slab', 'circular-pad'] as ConcreteMode[])(
    'warns for equivalent thin imperial and metric %s thicknesses',
    (concreteMode) => {
      expect(warningsFor(concreteMode, { value: 2, unit: 'in' })).toContain(thinWarning);
      expect(warningsFor(concreteMode, { value: 5.08, unit: 'cm' })).toContain(thinWarning);
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
});
