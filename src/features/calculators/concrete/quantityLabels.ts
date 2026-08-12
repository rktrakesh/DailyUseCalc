import type { ConcreteMode } from './types';

const quantityNouns: Record<ConcreteMode, [singular: string, plural: string]> = {
  slab: ['slab', 'slabs'],
  'circular-pad': ['pad', 'pads'],
  column: ['column', 'columns'],
  'post-hole': ['hole', 'holes'],
};

export function concreteQuantityUnit(mode: ConcreteMode, quantity: number) {
  const [singular, plural] = quantityNouns[mode];
  return quantity === 1 ? singular : plural;
}
