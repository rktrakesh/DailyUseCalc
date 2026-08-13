import { surfaceConditionLabels } from './constants';
import type { PaintCalculation, PaintInput, PaintRecommendation } from './types';
export function recommendPaint(
  input: PaintInput,
  calculation: PaintCalculation,
): PaintRecommendation {
  const warnings: string[] = [];
  const guidance = [
    `The wall estimate is based on ${calculation.netWallAreaSquareFeet.toFixed(2)} ft² of net paintable wall area.`,
    'Coverage is editable because product, texture, porosity, color change, and application method affect actual yield.',
    'Container recommendations assume the selected paint is offered in quart, 1-gallon, and 5-gallon sizes; confirm availability before purchase.',
  ];
  if (input.surfaceCondition !== 'smooth')
    warnings.push(
      `${surfaceConditionLabels[input.surfaceCondition]} surfaces may cover below the entered rate; verify the product label and consider a test area.`,
    );
  if (input.allowancePercent === 0)
    warnings.push(
      'A 0% allowance leaves no extra paint for touch-ups, application loss, or measurement variation.',
    );
  if (input.usePrimer)
    warnings.push(
      'Confirm primer compatibility and coverage with the selected finish paint and substrate.',
    );
  return { guidance, warnings };
}
