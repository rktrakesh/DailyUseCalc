import type { MulchInput } from './types';

export function mulchGuidance(input: MulchInput) {
  const guidance: Record<MulchInput['projectType'], string> = {
    'garden-bed':
      'Many landscape beds use a moderate mulch layer, but the right depth depends on the material, soil, plants, and existing mulch.',
    'trees-shrubs':
      'Keep mulch away from direct contact with trunks and stems; avoid piling it into a mulch volcano.',
    walkway:
      'Choose a depth and material appropriate for foot traffic, drainage, edging, and expected settling.',
    'play-area':
      'This estimate is not a fall-protection design. Surfacing depth depends on the product, equipment fall height, manufacturer guidance, maintenance, and applicable safety requirements.',
    landscaping:
      'Confirm site grade, existing material, desired finished depth, and supplier quantities before ordering.',
    other: 'Confirm the appropriate material and installed depth for your specific project.',
  };
  return guidance[input.projectType];
}
