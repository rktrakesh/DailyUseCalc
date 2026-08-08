export type LengthUnit = 'ft' | 'in' | 'yd' | 'm' | 'cm';

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
