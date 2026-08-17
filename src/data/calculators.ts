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
  href?: string;
  keywords: string[];
  status: 'available' | 'coming-soon';
}

export const calculatorCategories: Array<{
  name: CalculatorCategory;
  id: string;
  icon: 'home' | 'finance' | 'automotive' | 'garden' | 'construction' | 'health' | 'utilities';
}> = [
  { name: 'Construction', id: 'construction', icon: 'construction' },
  { name: 'Home Improvement', id: 'home-improvement', icon: 'home' },
  { name: 'Garden', id: 'garden', icon: 'garden' },
  { name: 'Automotive', id: 'automotive', icon: 'automotive' },
  { name: 'Finance', id: 'finance', icon: 'finance' },
  { name: 'Health', id: 'health', icon: 'health' },
  { name: 'Utilities', id: 'utilities', icon: 'utilities' },
];

export const calculatorListings: CalculatorListing[] = [
  {
    id: 'gravel',
    name: 'Gravel Calculator',
    description: 'Yards · tons · bags · cost',
    category: 'Construction',
    href: '/gravel/',
    keywords: ['gravel', 'stone', 'driveway', 'yard', 'tons'],
    status: 'available',
  },
  {
    id: 'concrete',
    name: 'Concrete Calculator',
    description: 'Volume · bags · weight · cost',
    category: 'Construction',
    href: '/concrete/',
    keywords: ['concrete', 'cement', 'slab', 'volume'],
    status: 'available',
  },
  {
    id: 'mulch',
    name: 'Mulch Calculator',
    category: 'Garden',
    href: '/mulch/',
    description: 'Yards, bags & coverage',
    keywords: ['mulch', 'landscaping', 'garden', 'yard'],
    status: 'available',
  },
  {
    id: 'topsoil',
    name: 'Topsoil Calculator',
    category: 'Garden',
    href: '/topsoil/',
    description: 'Yards, bags, weight & cost',
    keywords: ['topsoil', 'soil', 'garden', 'lawn', 'yard', 'bags'],
    status: 'available',
  },
  {
    id: 'sand',
    name: 'Sand Calculator',
    category: 'Construction',
    href: '/sand/',
    description: 'Volume, tons, bags & cost',
    keywords: ['sand', 'pavers', 'sandbox', 'tons', 'bags', 'bulk'],
    status: 'available',
  },
  {
    id: 'paver',
    name: 'Paver Calculator',
    category: 'Construction',
    href: '/paver/',
    description: 'Pavers, waste, base & cost',
    keywords: ['paver', 'patio', 'walkway', 'driveway', 'base', 'sand'],
    status: 'available',
  },
  {
    id: 'paint',
    name: 'Paint Calculator',
    category: 'Home Improvement',
    description: 'Gallons, coats & coverage',
    href: '/paint/',
    keywords: ['paint', 'wall', 'coverage', 'room'],
    status: 'available',
  },
  {
    id: 'tile',
    name: 'Tile Calculator',
    category: 'Home Improvement',
    href: '/tile/',
    description: 'Tiles, boxes, waste & cost',
    keywords: ['tile', 'floor', 'bathroom', 'kitchen'],
    status: 'available',
  },
  ...[
    [
      'rebar',
      'Rebar Calculator',
      'Construction',
      'Length · weight · cost',
      ['rebar', 'steel', 'reinforcement'],
    ],
    [
      'footing',
      'Footing Calculator',
      'Construction',
      'Size · concrete · rebar',
      ['footing', 'foundation'],
    ],
    ['block', 'Block Calculator', 'Construction', 'Blocks · mortar · cost', ['block', 'masonry']],
    [
      'flooring',
      'Flooring Calculator',
      'Home Improvement',
      'Area · materials · cost',
      ['flooring', 'floor', 'area'],
    ],
    [
      'drywall',
      'Drywall Calculator',
      'Home Improvement',
      'Sheets · screws · cost',
      ['drywall', 'sheetrock'],
    ],
    [
      'lawn-area',
      'Lawn Area Calculator',
      'Garden',
      'Area · seed · cost',
      ['lawn', 'grass', 'seed'],
    ],
    ['soil', 'Soil Calculator', 'Garden', 'Volume · weight', ['soil', 'garden', 'volume']],
    [
      'gas-mileage',
      'Gas Mileage Calculator',
      'Automotive',
      'MPG · distance · fuel',
      ['gas', 'mileage', 'mpg'],
    ],
    [
      'fuel-cost',
      'Fuel Cost Calculator',
      'Automotive',
      'Fuel · distance · cost',
      ['fuel', 'trip', 'cost'],
    ],
    [
      'tire-size',
      'Tire Size Calculator',
      'Automotive',
      'Diameter · speed · fit',
      ['tire', 'wheel', 'size'],
    ],
    [
      'trip-cost',
      'Trip Cost Calculator',
      'Automotive',
      'Distance · fuel · cost',
      ['trip', 'travel', 'fuel'],
    ],
    [
      'mortgage',
      'Mortgage Calculator',
      'Finance',
      'Payment · interest · term',
      ['mortgage', 'home', 'loan'],
    ],
    [
      'loan',
      'Loan Calculator',
      'Finance',
      'Payment · interest · term',
      ['loan', 'payment', 'interest'],
    ],
    [
      'savings',
      'Savings Calculator',
      'Finance',
      'Deposits · growth · goal',
      ['savings', 'money', 'goal'],
    ],
    [
      'compound-interest',
      'Compound Interest Calculator',
      'Finance',
      'Principal · rate · growth',
      ['compound', 'interest', 'investment'],
    ],
    ['bmi', 'BMI Calculator', 'Health', 'Height · weight · BMI', ['bmi', 'body', 'weight']],
    [
      'calorie',
      'Calorie Calculator',
      'Health',
      'Energy · activity · goal',
      ['calorie', 'energy', 'diet'],
    ],
    [
      'body-fat',
      'Body Fat Calculator',
      'Health',
      'Measurements · estimate',
      ['body fat', 'fitness'],
    ],
    [
      'ideal-weight',
      'Ideal Weight Calculator',
      'Health',
      'Height · reference range',
      ['ideal', 'weight', 'height'],
    ],
    ['age', 'Age Calculator', 'Utilities', 'Years · months · days', ['age', 'birthday', 'date']],
    [
      'date',
      'Date Calculator',
      'Utilities',
      'Dates · duration · difference',
      ['date', 'days', 'duration'],
    ],
    [
      'percentage',
      'Percentage Calculator',
      'Utilities',
      'Percent · change · difference',
      ['percentage', 'percent', 'change'],
    ],
    [
      'unit-converter',
      'Unit Converter',
      'Utilities',
      'Length · weight · volume',
      ['unit', 'conversion', 'measurement'],
    ],
  ].map(([id, name, category, description, keywords]) => ({
    id: id as string,
    name: name as string,
    category: category as CalculatorCategory,
    description: description as string,
    keywords: keywords as string[],
    status: 'coming-soon' as const,
  })),
];
