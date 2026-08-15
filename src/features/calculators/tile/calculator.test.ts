import { describe, expect, it } from 'vitest';
import { calculateTile } from './calculator';
import { createClearedTileInput, createDefaultTileInput } from './formDefaults';
import { validateTileInput } from './validation';

const base = () => {
  const i = createDefaultTileInput();
  i.tileLength = 12;
  i.tileWidth = 12;
  return i;
};
describe('tile calculator', () => {
  it('matches primary Imperial truth case', () => {
    const i = base();
    i.tilesPerBox = 10;
    i.priceBasis = 'box';
    i.price = 35;
    const r = calculateTile(i);
    expect(r.netAreaSquareFeet).toBe(120);
    expect(r.rawTiles).toBe(120);
    expect(r.requiredTiles).toBe(132);
    expect(r.boxesRequired).toBe(14);
    expect(r.purchasedTiles).toBe(140);
    expect(r.extraTiles).toBe(8);
    expect(r.estimatedCost).toBe(490);
  });
  it('keeps exact box boundaries exact', () => {
    const i = base();
    i.length.value = 10;
    i.width.value = 10;
    i.wastePercent = 0;
    i.tilesPerBox = 10;
    const r = calculateTile(i);
    expect(r.requiredTiles).toBe(100);
    expect(r.boxesRequired).toBe(10);
    expect(r.extraTiles).toBe(0);
  });
  it('rounds only once after waste', () => {
    const i = base();
    i.measureMode = 'area';
    i.knownArea = 100.2;
    expect(calculateTile(i).requiredTiles).toBe(111);
  });
  it('distinguishes whole-tile floating noise from genuine excess', () => {
    const i = base();
    i.measureMode = 'area';
    i.wastePercent = 0;
    i.knownArea = 100.00000000000001;
    expect(calculateTile(i).requiredTiles).toBe(100);
    i.knownArea = 100.0001;
    expect(calculateTile(i).requiredTiles).toBe(101);
  });
  it('subtracts excluded area before waste', () => {
    const i = base();
    i.length.value = 10;
    i.width.value = 8;
    i.excludedArea = 12;
    expect(calculateTile(i).netAreaSquareFeet).toBe(68);
    expect(calculateTile(i).requiredTiles).toBe(75);
  });
  it('multiplies identical areas', () => {
    const i = base();
    i.length.value = 5;
    i.width.value = 8;
    i.quantity = 3;
    i.wastePercent = 0;
    expect(calculateTile(i).requiredTiles).toBe(120);
  });
  it('matches Metric truth case', () => {
    const i = base();
    i.measurementSystem = 'metric';
    i.length = { value: 5, unit: 'm' };
    i.width = { value: 4, unit: 'm' };
    i.tileLength = 500;
    i.tileWidth = 500;
    i.tileUnit = 'mm';
    i.groutUnit = 'mm';
    i.tilesPerBox = 6;
    const r = calculateTile(i);
    expect(r.rawTiles).toBeCloseTo(80);
    expect(r.requiredTiles).toBe(88);
    expect(r.boxesRequired).toBe(15);
    expect(r.purchasedTiles).toBe(90);
    expect(r.extraTiles).toBe(2);
  });
  it('uses manufacturer coverage for box purchasing only', () => {
    const i = base();
    i.boxMode = 'coverage';
    i.manufacturerCoverage = 15.5;
    const r = calculateTile(i);
    expect(r.requiredTiles).toBe(132);
    expect(r.boxesRequired).toBe(9);
    expect(r.purchasedCoverageSquareFeet).toBe(139.5);
    expect(r.extraPurchasedCoverageSquareFeet).toBeCloseTo(7.5);
  });
  it('distinguishes manufacturer-coverage box noise from genuine excess', () => {
    const i = base();
    i.measureMode = 'area';
    i.knownArea = 120.00000000000001;
    i.boxMode = 'coverage';
    i.manufacturerCoverage = 13.2;
    expect(calculateTile(i).boxesRequired).toBe(10);
    i.knownArea = 120.0001;
    expect(calculateTile(i).boxesRequired).toBe(11);
  });
  it('uses grout gap in the installed module', () => {
    const i = base();
    i.measureMode = 'area';
    i.knownArea = 100;
    i.groutGap = 0.125;
    const r = calculateTile(i);
    expect(r.moduleAreaSquareFeet).toBeCloseTo(1.02094, 4);
    expect(r.rawTiles).toBeCloseTo(97.95, 1);
    expect(r.requiredTiles).toBe(108);
  });
  it('supports every pricing basis', () => {
    const i = base();
    i.price = 2.5;
    expect(calculateTile(i).estimatedCost).toBe(330);
    i.tilesPerBox = 10;
    i.priceBasis = 'box';
    i.price = 35;
    expect(calculateTile(i).estimatedCost).toBe(490);
    i.priceBasis = 'sq-ft';
    i.price = 3.25;
    expect(calculateTile(i).estimatedCost).toBe(429);
    i.measurementSystem = 'metric';
    i.priceBasis = 'sq-m';
    i.price = 10;
    expect(calculateTile(i).estimatedCost).toBeCloseTo(122.632, 3);
  });
  it('supports all shapes and Known Area', () => {
    for (const shape of [
      'rectangle',
      'square',
      'circle',
      'triangle',
      'trapezoid',
      'ring',
    ] as const) {
      const i = base();
      i.shape = shape;
      expect(calculateTile(i).grossAreaSquareFeet).toBeGreaterThan(0);
    }
    const i = base();
    i.measureMode = 'area';
    i.knownArea = 75;
    expect(calculateTile(i).grossAreaSquareFeet).toBe(75);
  });
  it('rejects invalid required and optional values', () => {
    const i = base();
    i.tileLength = 0;
    i.tileWidth = -1;
    i.groutGap = -1;
    i.quantity = 0;
    i.wastePercent = -1;
    i.tilesPerBox = 0;
    i.manufacturerCoverage = -1;
    i.price = -1;
    i.outerDiameter.value = 4;
    i.innerDiameter.value = 5;
    i.shape = 'ring';
    expect(validateTileInput(i).length).toBeGreaterThanOrEqual(9);
  });
  it('keeps optional fields valid and clear resets intentional defaults', () => {
    expect(validateTileInput(base())).toEqual([]);
    const i = createClearedTileInput('USD');
    expect(i.projectType).toBe('floor');
    expect(i.pattern).toBe('straight');
    expect(i.wastePercent).toBe(10);
    expect(i.tileLength).toBeNaN();
    expect(i.excludedArea).toBeUndefined();
    expect(i.price).toBeUndefined();
  });
});
