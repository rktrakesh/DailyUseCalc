import type { GravelInput, ValidationIssue } from './types';

function isPositiveNumber(value: number): boolean {
	return Number.isFinite(value) && value > 0;
}

export function validateGravelInput(input: GravelInput): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	if (!isPositiveNumber(input.length.value)) issues.push({ field: 'length', message: 'Enter a length greater than zero.' });
	if (!isPositiveNumber(input.width.value)) issues.push({ field: 'width', message: 'Enter a width greater than zero.' });
	if (!isPositiveNumber(input.depth.value)) issues.push({ field: 'depth', message: 'Enter a depth greater than zero.' });
	if (!Number.isFinite(input.allowancePercent) || input.allowancePercent < 0 || input.allowancePercent > 50) {
		issues.push({ field: 'allowancePercent', message: 'Allowance must be between 0% and 50%.' });
	}
	if (input.gravelType === 'custom' && !isPositiveNumber(input.customDensityTonsPerYard ?? 0)) {
		issues.push({ field: 'customDensityTonsPerYard', message: 'Enter a custom density greater than zero.' });
	}
	if (input.pricePerCubicYard !== undefined && (!Number.isFinite(input.pricePerCubicYard) || input.pricePerCubicYard < 0)) {
		issues.push({ field: 'pricePerCubicYard', message: 'Price cannot be negative.' });
	}
	if (input.deliveryFee !== undefined && (!Number.isFinite(input.deliveryFee) || input.deliveryFee < 0)) {
		issues.push({ field: 'deliveryFee', message: 'Delivery fee cannot be negative.' });
	}
	if (input.bagSizeCubicFeet !== undefined && !isPositiveNumber(input.bagSizeCubicFeet)) {
		issues.push({ field: 'bagSizeCubicFeet', message: 'Bag size must be greater than zero.' });
	}
	if (input.bagPrice !== undefined && (!Number.isFinite(input.bagPrice) || input.bagPrice < 0)) {
		issues.push({ field: 'bagPrice', message: 'Bag price cannot be negative.' });
	}
	if (input.truckCapacityCubicYards !== undefined && !isPositiveNumber(input.truckCapacityCubicYards)) {
		issues.push({ field: 'truckCapacityCubicYards', message: 'Truck capacity must be greater than zero.' });
	}
	return issues;
}
