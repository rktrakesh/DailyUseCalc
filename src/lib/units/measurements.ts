export type LengthUnit = 'ft' | 'in' | 'yd' | 'm' | 'cm';
export type AreaUnit = 'ft²' | 'yd²' | 'm²' | 'cm²';
export type VolumeUnit = 'ft³' | 'yd³' | 'm³';

const FEET_PER_UNIT: Record<LengthUnit, number> = {
  ft: 1,
  in: 1 / 12,
  yd: 3,
  m: 3.280839895,
  cm: 0.03280839895,
};

export function toFeet(value: number, unit: LengthUnit): number {
  return value * FEET_PER_UNIT[unit];
}

export function fromFeet(value: number, unit: LengthUnit): number {
  return value / FEET_PER_UNIT[unit];
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  return fromFeet(toFeet(value, from), to);
}

export const CUBIC_FEET_PER_CUBIC_YARD = 27;
export const CUBIC_FEET_PER_CUBIC_METER = 35.3146667215;

export function cubicFeetToCubicYards(cubicFeet: number): number {
  return cubicFeet / CUBIC_FEET_PER_CUBIC_YARD;
}

export function cubicFeetToCubicMeters(cubicFeet: number): number {
  return cubicFeet / CUBIC_FEET_PER_CUBIC_METER;
}

export function areaToSquareFeet(value: number, unit: AreaUnit): number {
  const factors: Record<AreaUnit, number> = {
    'ft²': 1,
    'yd²': 9,
    'm²': 10.763910417,
    'cm²': 0.0010763910417,
  };
  return value * factors[unit];
}

export function volumeToCubicFeet(value: number, unit: VolumeUnit): number {
  const factors: Record<VolumeUnit, number> = {
    'ft³': 1,
    'yd³': 27,
    'm³': CUBIC_FEET_PER_CUBIC_METER,
  };
  return value * factors[unit];
}
