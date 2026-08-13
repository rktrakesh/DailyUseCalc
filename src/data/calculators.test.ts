import { describe, expect, it } from 'vitest';
import { calculatorCategories, calculatorListings } from './calculators';

describe('calculator directory registry', () => {
  it('uses unique identifiers and represents every directory category', () => {
    const ids = calculatorListings.map(({ id }) => id);
    const listedCategories = new Set(calculatorListings.map(({ category }) => category));

    expect(new Set(ids).size).toBe(ids.length);
    for (const category of calculatorCategories) {
      expect(listedCategories.has(category.name)).toBe(true);
    }
  });

  it('only gives navigable routes to available calculators', () => {
    for (const calculator of calculatorListings) {
      if (calculator.status === 'available') {
        expect(calculator.href).toMatch(/^\/.+\/$/);
      } else {
        expect(calculator.href).toBeUndefined();
      }
    }
  });

  it('keeps the current production calculators available', () => {
    expect(
      calculatorListings
        .filter(({ status }) => status === 'available')
        .map(({ id }) => id)
        .sort(),
    ).toEqual(['concrete', 'gravel', 'mulch', 'paint']);
    expect(calculatorListings.find(({ id }) => id === 'paint')?.description).toBe(
      'Gallons, coats & coverage',
    );
    expect(calculatorListings.find(({ id }) => id === 'mulch')?.description).toBe(
      'Yards, bags & coverage',
    );
  });
});
