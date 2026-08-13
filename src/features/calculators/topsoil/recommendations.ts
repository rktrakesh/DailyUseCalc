import type { TopsoilInput } from './types';

export function topsoilGuidance(input: TopsoilInput) {
  const project: Record<TopsoilInput['projectType'], string> = {
    'garden-bed':
      'Choose depth and soil composition for the existing soil, plants, drainage, and finished grade.',
    'new-lawn':
      'New lawns may require more soil depending on existing subsoil, grading, drainage, and the planned turf installation.',
    topdressing:
      'Lawn topdressing is generally much shallower than filling a bed; use the actual depth planned for the site.',
    'raised-bed':
      'Raised-bed depth depends on crops, root space, drainage, and what is beneath the bed.',
    'flower-bed':
      'Confirm the depth and soil blend for the existing soil and the flowers you plan to grow.',
    'vegetable-garden':
      'Vegetable beds may use topsoil and compost blends; confirm the blend and depth for existing soil and crop needs.',
    landscaping:
      'Confirm finished grade, drainage, compaction, and supplier quantities before ordering.',
    other:
      'Confirm the material, finished depth, and site preparation appropriate for your project.',
  };
  const soil: Record<TopsoilInput['soilType'], string> = {
    screened:
      'Screened topsoil has larger rocks, roots, and debris removed, but screening does not guarantee nutrient content or texture.',
    unscreened:
      'Unscreened topsoil may contain rocks, roots, clods, or debris; confirm suitability with the supplier.',
    'compost-blend':
      'Topsoil and compost blend ratios vary by supplier; confirm the blend is suitable for the project.',
    'garden-soil':
      'Garden-soil composition varies; check whether the product is intended for in-ground or raised beds.',
    other:
      'Confirm the product composition, intended use, and supplied quantity with the supplier.',
  };
  return `${project[input.projectType]} ${soil[input.soilType]}`;
}
