import type { SandInput } from './types';

export function sandGuidance(input: SandInput) {
  const project: Record<SandInput['projectType'], string> = {
    'paver-bedding':
      'For pavers, this estimates bedding or fill sand from area and depth; joint or polymeric sand requires a separate product-specific calculation.',
    sandbox: 'Confirm play sand is suitable, washed, and intended for play areas.',
    landscaping: 'Confirm finished grade, drainage, and compaction needs.',
    topdressing: 'Use a shallow, even depth appropriate for the lawn and sand grading.',
    'pool-base': 'Follow the pool manufacturer and installer requirements for base preparation.',
    backfill: 'Confirm drainage, lift depth, and compaction requirements for the site.',
    'concrete-mortar':
      'Use the mix design or product instructions; this calculator estimates loose sand quantity only.',
    other: 'Confirm material type, depth, and installation requirements for the project.',
  };
  const material: Record<SandInput['sandType'], string> = {
    'all-purpose': 'All-purpose sand grading varies by supplier.',
    'concrete-sharp': 'Sharp sand is commonly used where a coarse, angular material is specified.',
    masonry: 'Masonry sand is typically finer; confirm it matches the intended mix or finish.',
    play: 'Use material specifically sold and approved for play areas.',
    fill: 'Fill sand suitability depends on drainage and compaction requirements.',
    'paver-bedding': 'Bedding sand and joint sand serve different purposes.',
    other: 'Confirm the custom material specification with the supplier.',
  };
  return `${project[input.projectType]} ${material[input.sandType]} Sand density and weight are estimates; moisture, grading, compaction, and supplier material can change actual weight.`;
}
