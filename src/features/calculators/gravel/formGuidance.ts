import type { GravelType, ProjectType } from './types';

const MATERIAL_GUIDANCE: Record<GravelType, string> = {
  'crushed-stone': 'Compacts well for driveways and structural bases.',
  'pea-gravel': 'A smooth decorative gravel that does not compact like crushed stone.',
  'river-rock': 'Often chosen for decorative beds and drainage applications.',
  limestone: 'A commonly used compactable base material.',
  granite: 'A durable option for hard-wearing surfaces.',
  custom: 'Use a supplier-confirmed density for the selected material.',
};

export function gravelTypeGuidance(projectType: ProjectType, gravelType: GravelType): string {
  if (projectType === 'french-drain') {
    return 'Drainage projects commonly use clean, washed gravel; confirm your material specification.';
  }
  if (projectType === 'landscaping') {
    return 'Choose the material that matches your landscape design and coverage needs.';
  }
  return MATERIAL_GUIDANCE[gravelType];
}
