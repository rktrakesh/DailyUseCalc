import { describe, expect, it } from 'vitest';
import { calculateGravel, recommendGravel, validateGravelInput } from '.';
import { convertLength } from '../../../lib/units/measurements';
import type { GravelInput } from './types';

const baseInput: GravelInput = {
	projectType: 'driveway',
	gravelType: 'crushed-stone',
	length: { value: 20, unit: 'ft' },
	width: { value: 12, unit: 'ft' },
	depth: { value: 4, unit: 'in' },
	allowancePercent: 10,
	bagSizeCubicFeet: 0.5,
	truckCapacityCubicYards: 12,
};

describe('measurement conversion', () => {
	it('converts across imperial and metric units', () => {
		expect(convertLength(24, 'in', 'ft')).toBe(2);
		expect(convertLength(1, 'm', 'ft')).toBeCloseTo(3.28084, 4);
	});
});

describe('gravel calculation', () => {
	it('calculates volume, allowance, weight, bags, and truckloads', () => {
		const result = calculateGravel(baseInput);
		expect(result.surfaceAreaSquareFeet).toBe(240);
		expect(result.volumeCubicFeet).toBeCloseTo(80);
		expect(result.volumeCubicYards).toBeCloseTo(2.96296, 4);
		expect(result.adjustedVolumeCubicYards).toBeCloseTo(3.25926, 4);
		expect(result.recommendedOrderCubicYards).toBe(4);
		expect(result.estimatedWeightTons).toBeCloseTo(4.56296, 4);
		expect(result.bagCount).toBe(176);
		expect(result.truckLoads).toBe(1);
	});

	it('uses provided material pricing without inventing a price', () => {
		const result = calculateGravel({ ...baseInput, pricePerCubicYard: 45, deliveryFee: 55 });
		expect(result.estimatedCost).toBe(235);
	});

	it('keeps equivalent metric dimensions consistent', () => {
		const result = calculateGravel({
			...baseInput,
			length: { value: 6.096, unit: 'm' },
			width: { value: 3.6576, unit: 'm' },
			depth: { value: 10.16, unit: 'cm' },
		});
		expect(result.volumeCubicYards).toBeCloseTo(2.96296, 3);
	});
});

describe('validation and recommendations', () => {
	it('rejects incomplete numeric input', () => {
		const issues = validateGravelInput({ ...baseInput, length: { value: 0, unit: 'ft' }, allowancePercent: -1 });
		expect(issues.map((issue) => issue.field)).toContain('length');
		expect(issues.map((issue) => issue.field)).toContain('allowancePercent');
	});

	it('explains practical rounding and flags shallow driveways', () => {
		const shallowInput = { ...baseInput, depth: { value: 3, unit: 'in' as const } };
		const calculation = calculateGravel(shallowInput);
		const recommendation = recommendGravel(shallowInput, calculation);
		expect(recommendation.explanation).toContain('round up to 3 yd³');
		expect(recommendation.warnings).toEqual(expect.arrayContaining([expect.stringContaining('shallow for a driveway')]));
	});
});
