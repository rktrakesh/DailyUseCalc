import { toFeet } from '../../../lib/units/measurements';
import type { GravelCalculation, GravelInput, GravelRecommendation, GravelType, ProjectType } from './types';

const DEPTH_GUIDANCE: Record<ProjectType, string> = {
	driveway: 'Most residential driveways need a compacted gravel layer of about 4–6 inches; local soil and vehicle loads can require more.',
	walkway: 'Walkways commonly use about 2–3 inches of gravel over a prepared base.',
	patio: 'A patio base is commonly built with roughly 4 inches of compacted base material.',
	landscaping: 'Decorative landscaping is often spread 2–3 inches deep to cover soil evenly.',
	'french-drain': 'French drains need enough depth to surround the pipe and support drainage; confirm the trench design for your property.',
	'shed-base': 'A shed base commonly uses 4–6 inches of compacted gravel on a level, prepared area.',
	other: 'Choose a depth that matches the project, base condition, and material supplier guidance.',
};

const MATERIAL_GUIDANCE: Record<GravelType, string> = {
	'crushed-stone': 'Crushed stone compacts well and is a common choice for driveways and structural bases.',
	'pea-gravel': 'Pea gravel is smooth and decorative, but its rounded shape does not lock together like crushed stone.',
	'river-rock': 'River rock is often used for decorative beds and drainage, where a rounded finish is preferred.',
	limestone: 'Limestone compacts well and is commonly used as a durable base material.',
	'granite': 'Granite gravel is durable and can be suitable where a hard-wearing aggregate is needed.',
	custom: 'Use a supplier-confirmed density for custom material so the weight estimate stays useful.',
};

export function recommendGravel(input: GravelInput, calculation: GravelCalculation): GravelRecommendation {
	const depthInches = toFeet(input.depth.value, input.depth.unit) * 12;
	const warnings: string[] = [];
	if (input.projectType === 'driveway' && depthInches < 4) {
		warnings.push('This depth may be shallow for a driveway. Many driveways need at least 4 inches of compacted gravel, depending on soil and vehicle load.');
	}
	if (input.allowancePercent === 0) {
		warnings.push('No allowance is included. A small allowance can help cover uneven ground, compaction, and handling loss.');
	}
	if (input.gravelType === 'pea-gravel' && input.projectType === 'driveway') {
		warnings.push('Pea gravel can shift under vehicle traffic. Consider a material that compacts and interlocks for a driveway surface.');
	}
	return {
		depthGuidance: DEPTH_GUIDANCE[input.projectType],
		materialGuidance: MATERIAL_GUIDANCE[input.gravelType],
		warnings,
		explanation: `Your measured volume is ${calculation.volumeCubicYards.toFixed(2)} yd³. Adding ${input.allowancePercent}% brings it to ${calculation.adjustedVolumeCubicYards.toFixed(2)} yd³, so we round up to ${calculation.recommendedOrderCubicYards} yd³ for a practical order.`,
	};
}
