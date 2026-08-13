import { formatMoney } from '../gravel/currencies';
import { gallonsToLiters, squareFeetToSquareMeters } from './calculator';
import type { PaintCalculation, PaintInput } from './types';

export const PAINT_CALCULATOR_URL = 'https://dailyusecalc.com/paint/';

const number = (value: number, digits = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);

const paintLine = (label: string, gallons: number) =>
  `${label}: ${number(gallons)} gal (${number(gallonsToLiters(gallons))} L)`;

export function createPaintEstimateText(input: PaintInput, calculation: PaintCalculation) {
  const lines = [
    'Paint Project Estimate',
    '',
    'Project: Room / Walls',
    `Net wall area: ${number(calculation.netWallAreaSquareFeet)} sq ft (${number(squareFeetToSquareMeters(calculation.netWallAreaSquareFeet))} sq m)`,
    paintLine('Wall paint required', calculation.wall.requiredGallons),
    `Suggested purchase: ${calculation.wall.purchase.display}`,
    `Estimated leftover: ${number(calculation.wall.purchase.leftoverGallons)} gal`,
  ];

  if (calculation.ceiling)
    lines.push(paintLine('Ceiling paint required', calculation.ceiling.requiredGallons));
  if (calculation.doors)
    lines.push(paintLine('Painted doors required', calculation.doors.requiredGallons));
  if (calculation.trim)
    lines.push(paintLine('Trim / baseboards required', calculation.trim.requiredGallons));
  if (calculation.primer)
    lines.push(paintLine('Primer required', calculation.primer.requiredGallons));
  if (calculation.estimatedTotalCost !== undefined)
    lines.push(
      `Estimated cost: ${formatMoney(calculation.estimatedTotalCost, input.currency, undefined, 2)}`,
    );

  return lines.join('\n');
}

export function createPaintShareText(calculation: PaintCalculation) {
  return [
    'DailyUseCalc Paint Calculator',
    paintLine('Required wall paint', calculation.wall.requiredGallons),
    `Suggested purchase: ${calculation.wall.purchase.display}`,
  ].join('\n');
}
