import { describe, expect, it } from 'vitest';
import { calculatePaint } from './calculator';
import {
  createPaintEstimateText,
  createPaintShareText,
  PAINT_CALCULATOR_URL,
} from './estimateSummary';
import { createDefaultPaintInput } from './formDefaults';

describe('paint estimate summaries', () => {
  it('includes core information and only enabled optional materials', () => {
    const input = createDefaultPaintInput();
    const basic = createPaintEstimateText(input, calculatePaint(input));
    expect(basic).toContain('Paint Project Estimate');
    expect(basic).toContain('Suggested purchase:');
    expect(basic).not.toMatch(/Ceiling paint|required.*Primer|Painted doors|Trim \/ baseboards/);

    input.includeCeiling = true;
    input.paintDoors = true;
    input.paintTrim = true;
    input.usePrimer = true;
    input.pricePerQuart = 15;
    input.pricePerGallon = 50;
    input.pricePerFiveGallons = 200;
    input.primerPricePerGallon = 30;
    const complete = createPaintEstimateText(input, calculatePaint(input));
    expect(complete).toMatch(
      /Ceiling paint required|Painted doors required|Trim \/ baseboards required|Primer required/,
    );
    expect(complete).toContain('Estimated cost:');
  });

  it('keeps a concise share summary for the canonical calculator URL', () => {
    const input = createDefaultPaintInput();
    const share = createPaintShareText(calculatePaint(input));
    expect(share).toContain('DailyUseCalc Paint Calculator');
    expect(PAINT_CALCULATOR_URL).toBe('https://dailyusecalc.com/paint/');
    expect(share).not.toContain('Estimated leftover');
  });
});
