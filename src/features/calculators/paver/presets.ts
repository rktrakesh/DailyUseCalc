import type { PaverPresetId } from './types';

export interface PaverPreset {
  id: Exclude<PaverPresetId, 'custom'>;
  label: string;
  lengthInches: number;
  widthInches: number;
}

export const paverPresets: readonly PaverPreset[] = [
  { id: '4x8', label: '4 × 8 in', lengthInches: 4, widthInches: 8 },
  { id: '6x6', label: '6 × 6 in', lengthInches: 6, widthInches: 6 },
  { id: '6x9', label: '6 × 9 in', lengthInches: 6, widthInches: 9 },
  { id: '8x8', label: '8 × 8 in', lengthInches: 8, widthInches: 8 },
  { id: '12x12', label: '12 × 12 in', lengthInches: 12, widthInches: 12 },
  { id: '16x16', label: '16 × 16 in', lengthInches: 16, widthInches: 16 },
  { id: '24x24', label: '24 × 24 in', lengthInches: 24, widthInches: 24 },
] as const;

export function getPaverPreset(id: PaverPresetId) {
  return paverPresets.find((preset) => preset.id === id);
}
