import { toFeet } from '../../../lib/units/measurements';
import type { ConcreteCalculation, ConcreteInput, ConcreteRecommendation } from './types';

const guidance = {
  slab: 'Measure the full slab footprint and use the planned concrete thickness.',
  'circular-pad': 'Measure the diameter across the widest point and use the planned thickness.',
  column: 'Use the finished concrete diameter and full concrete height.',
  'post-hole': 'This estimate assumes the full cylindrical hole is filled with concrete.',
} as const;

export function recommendConcrete(
  input: ConcreteInput,
  calculation: ConcreteCalculation,
): ConcreteRecommendation {
  const warnings: string[] = [];
  const thicknessInches = toFeet(input.thickness.value, input.thickness.unit) * 12;
  if (input.allowancePercent === 0)
    warnings.push(
      'A 0% allowance leaves no extra concrete for spillage, uneven forms, or measurement variation.',
    );
  if (input.allowancePercent > 25)
    warnings.push(
      'The selected allowance is unusually high; confirm that it matches your project plan.',
    );
  if (
    (input.concreteMode === 'slab' || input.concreteMode === 'circular-pad') &&
    thicknessInches < 3
  )
    warnings.push(
      'This is a very thin concrete layer. Confirm the planned thickness with a qualified professional.',
    );
  if (calculation.bagCount > 500)
    warnings.push(
      'This project requires many bags. Compare bagged concrete with ready-mix delivery.',
    );
  if (input.bagPreset === 'custom')
    warnings.push('Confirm the custom yield against the concrete bag manufacturer’s instructions.');
  return {
    modeGuidance: guidance[input.concreteMode],
    supplierGuidance:
      'Confirm delivery minimums, load limits, and delivery requirements with your ready-mix supplier.',
    warnings,
    explanation: `Your measured volume is ${calculation.volumeCubicYards.toFixed(2)} yd³. Adding ${input.allowancePercent}% brings it to ${calculation.adjustedVolumeCubicYards.toFixed(2)} yd³, so we round up to ${calculation.recommendedOrderCubicYards.toFixed(1)} yd³.`,
  };
}
