import type { ConcreteBagPresetId } from './types';

export interface ConcreteBagPreset {
  id: ConcreteBagPresetId;
  label: string;
  weightPounds?: number;
  yieldCubicFeet?: number;
}

export const CONCRETE_BAG_PRESETS: readonly ConcreteBagPreset[] = [
  { id: '40-lb', label: '40 lb', weightPounds: 40, yieldCubicFeet: 0.3 },
  { id: '50-lb', label: '50 lb', weightPounds: 50, yieldCubicFeet: 0.375 },
  { id: '60-lb', label: '60 lb', weightPounds: 60, yieldCubicFeet: 0.45 },
  { id: '80-lb', label: '80 lb', weightPounds: 80, yieldCubicFeet: 0.6 },
  { id: '30-kg', label: '30 kg', weightPounds: 66.1387, yieldCubicFeet: 0.5 },
  { id: 'custom', label: 'Custom' },
];

export function concreteBagPreset(id: ConcreteBagPresetId) {
  return CONCRETE_BAG_PRESETS.find((preset) => preset.id === id)!;
}
