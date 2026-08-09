export type CalculatorCategory =
  | 'Home Improvement'
  | 'Finance'
  | 'Automotive'
  | 'Garden'
  | 'Construction'
  | 'Health'
  | 'Utilities';

export interface CalculatorListing {
  id: string;
  name: string;
  description: string;
  category: CalculatorCategory;
  href: string;
  keywords: string[];
  status: 'available' | 'coming-soon';
}

export const calculatorListings: CalculatorListing[] = [
  {
    id: 'gravel',
    name: 'Gravel Calculator',
    description: 'Calculate gravel in yards, tons, bags, and estimated material cost.',
    category: 'Home Improvement',
    href: '/gravel/',
    keywords: ['gravel', 'stone', 'driveway', 'yard', 'tons'],
    status: 'available',
  },
  {
    id: 'concrete',
    name: 'Concrete Calculator',
    description: 'Plan concrete volume, materials, and estimated cost for your project.',
    category: 'Construction',
    href: '/#popular-calculators',
    keywords: ['concrete', 'cement', 'slab', 'volume'],
    status: 'coming-soon',
  },
  {
    id: 'mulch',
    name: 'Mulch Calculator',
    description: 'Estimate the mulch you need for beds, paths, and landscaping.',
    category: 'Garden',
    href: '/#popular-calculators',
    keywords: ['mulch', 'landscaping', 'garden', 'yard'],
    status: 'coming-soon',
  },
  {
    id: 'paint',
    name: 'Paint Calculator',
    description: 'Estimate paint coverage, coats, and project supplies.',
    category: 'Home Improvement',
    href: '/#popular-calculators',
    keywords: ['paint', 'wall', 'coverage', 'room'],
    status: 'coming-soon',
  },
  {
    id: 'tile',
    name: 'Tile Calculator',
    description: 'Calculate tiles, adhesive, grout, and cuts for your space.',
    category: 'Home Improvement',
    href: '/#popular-calculators',
    keywords: ['tile', 'floor', 'bathroom', 'kitchen'],
    status: 'coming-soon',
  },
  {
    id: 'topsoil',
    name: 'Topsoil Calculator',
    description: 'Work out the soil volume your lawn or garden needs.',
    category: 'Garden',
    href: '/#popular-calculators',
    keywords: ['topsoil', 'soil', 'lawn', 'garden'],
    status: 'coming-soon',
  },
];
