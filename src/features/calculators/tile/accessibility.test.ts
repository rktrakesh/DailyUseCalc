import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createValidationAssociation } from './validationAccessibility';

const renderField = (id: string, message?: string) => {
  const association = createValidationAssociation(id, message);
  return renderToStaticMarkup(
    createElement(
      'div',
      null,
      createElement('label', { htmlFor: id }, 'Test field'),
      createElement('input', association.control),
      message && createElement('span', association.error, message),
    ),
  );
};

describe('Tile validation accessibility', () => {
  it.each([
    ['tile-length', 'Enter a value greater than zero.'],
    ['tile-inner-diameter', 'Inner diameter must be smaller than outer diameter.'],
    ['tile-excluded-area', 'Excluded area must be greater than zero and smaller than gross area.'],
    ['tile-tiles-per-box', 'Tiles per box must be a whole number of 1 or more.'],
    ['tile-price', 'Price cannot be negative.'],
  ])('associates %s with its rendered error message', (id, error) => {
    const html = renderField(id, error);

    expect(html).toContain(`id="${id}"`);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain(`aria-describedby="${id}-error"`);
    expect(html).toContain(`id="${id}-error"`);
    expect(html).toContain(error);
  });

  it('omits stale error state and association for a valid field', () => {
    const html = renderField('tile-length');

    expect(html).toContain('aria-invalid="false"');
    expect(html).not.toContain('aria-describedby');
    expect(html).not.toContain('tile-length-error');
  });
});
