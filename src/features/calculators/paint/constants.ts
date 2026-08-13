export const US_GALLON_LITERS = 3.785411784;
export const SQUARE_FEET_PER_SQUARE_METER = 10.763910417;
export const DEFAULT_PAINT_COVERAGE = 400;
export const DEFAULT_PRIMER_COVERAGE = 400;
export const DEFAULT_FINISH_COATS = 2;
export const DEFAULT_ALLOWANCE_PERCENT = 10;
export const PAINT_CONTAINERS = [
  { sizeGallons: 5, label: '5 gal' },
  { sizeGallons: 1, label: '1 gal' },
  { sizeGallons: 0.25, label: '1 qt' },
] as const;
export const surfaceConditionLabels = {
  smooth: 'Previously painted / smooth',
  'new-drywall': 'New drywall',
  porous: 'Porous / rough',
  textured: 'Textured surface',
} as const;
