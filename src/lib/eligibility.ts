import type { Category, Opportunity } from './opportunities.ts';

export type Profile = { state?: string; age?: number };
export type Eligibility = 'possible' | 'ineligible' | 'unknown';

export function evaluateEligibility(item: Opportunity, profile: Profile): Eligibility {
  const { states, minAge } = item.rules;
  if (states?.length && profile.state && !states.includes(profile.state.toUpperCase())) return 'ineligible';
  if (minAge !== undefined && profile.age !== undefined && profile.age < minAge) return 'ineligible';
  if ((states?.length && !profile.state) || (minAge !== undefined && profile.age === undefined)) return 'unknown';
  return 'possible';
}

export function filterOpportunities(
  items: Opportunity[],
  filters: { query: string; category: Category | 'all'; state: string },
  now = new Date(),
): Opportunity[] {
  const query = filters.query.trim().toLocaleLowerCase();
  const state = filters.state.trim().toUpperCase();
  return items.filter(item => {
    if (item.deadline && new Date(`${item.deadline}T23:59:59Z`).getTime() < now.getTime()) return false;
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    if (state && item.rules.states?.length && !item.rules.states.includes(state)) return false;
    return !query || `${item.title} ${item.summary} ${item.provider} ${item.category}`.toLocaleLowerCase().includes(query);
  });
}
