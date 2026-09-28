export type Category = 'settlement' | 'refund' | 'grant' | 'freebie' | 'coupon';

export interface Opportunity {
  id: string;
  title: string;
  category: Category;
  summary: string;
  provider: string;
  location: string;
  url: string;
  amount: string;
  deadline: string | null;
  requirements: string[];
  rules: { states?: string[]; minAge?: number };
}

// Illustrative records only. No application links are enabled until source verification exists.
export const sampleOpportunities: Opportunity[] = [
  { id: 'sample-1', title: 'Consumer refund', category: 'refund', summary: 'A sample refund listing showing how verified opportunities will appear.', provider: 'Sample source', location: 'United States', url: '', amount: 'Varies', deadline: null, requirements: ['Check purchase history'], rules: {} },
  { id: 'sample-2', title: 'Community assistance grant', category: 'grant', summary: 'A sample local grant with basic location and age criteria.', provider: 'Sample source', location: 'Colorado', url: '', amount: 'Up to $500', deadline: null, requirements: ['Colorado resident', 'At least 18 years old'], rules: { states: ['CO'], minAge: 18 } },
  { id: 'sample-3', title: 'Product replacement', category: 'freebie', summary: 'A sample replacement program for a qualifying product.', provider: 'Sample source', location: 'United States', url: '', amount: 'Replacement', deadline: null, requirements: ['Proof of purchase'], rules: {} },
  { id: 'sample-4', title: 'Class action settlement', category: 'settlement', summary: 'A sample settlement with a location requirement.', provider: 'Sample source', location: 'California', url: '', amount: 'Varies', deadline: null, requirements: ['California resident', 'Check class membership'], rules: { states: ['CA'] } },
  { id: 'sample-5', title: 'Everyday savings offer', category: 'coupon', summary: 'A sample discount to demonstrate the savings category.', provider: 'Sample source', location: 'United States', url: '', amount: 'Save 15%', deadline: null, requirements: ['Check offer terms'], rules: {} },
];
