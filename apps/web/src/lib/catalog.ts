import type { Opportunity, Category } from '@lo-lyfe/core';
import type { SupabaseClient } from '@supabase/supabase-js';

interface RuleRow {
  rule_type: string;
  rule_value: unknown;
  reviewer_approved: boolean;
}
interface CatalogRow {
  id: string;
  title: string;
  summary: string;
  category: Category;
  claim_url: string;
  deadline: string;
  payout_description: string | null;
  proof_required: string[];
  sources: { name: string } | { name: string }[] | null;
  eligibility_rules: RuleRow[];
}

export function mapPublishedRow(row: CatalogRow): Opportunity {
  const rules: Opportunity['rules'] = {};
  for (const rule of row.eligibility_rules ?? []) {
    if (!rule.reviewer_approved || !rule.rule_value || typeof rule.rule_value !== 'object') continue;
    const value = rule.rule_value as Record<string, unknown>;
    if (rule.rule_type === 'state' && Array.isArray(value.states)) {
      rules.states = value.states.filter((state): state is string => typeof state === 'string');
    }
    if (rule.rule_type === 'min_age' && typeof value.age === 'number') rules.minAge = value.age;
  }
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    category: row.category,
    url: row.claim_url,
    deadline: row.deadline,
    amount: row.payout_description ?? 'Varies',
    provider: (Array.isArray(row.sources) ? row.sources[0]?.name : row.sources?.name) ?? 'Verified source',
    location: rules.states?.join(', ') ?? 'Check official terms',
    requirements: row.proof_required ?? [],
    rules,
  };
}

export async function loadPublishedCatalog(client: SupabaseClient): Promise<Opportunity[]> {
  const { data, error } = await client.from('opportunities')
    .select('id,title,summary,category,claim_url,deadline,payout_description,proof_required,sources(name),eligibility_rules(rule_type,rule_value,reviewer_approved)')
    .eq('status', 'published')
    .not('reviewed_at', 'is', null)
    .gte('deadline', new Date().toISOString().slice(0, 10))
    .order('deadline', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => mapPublishedRow(row as CatalogRow));
}
