export interface FieldDefinition {
  key: string;
  sensitivity: 'standard' | 'sensitive' | 'ask_each_time';
}

export type ProfileAnswers = Record<string, string | number | boolean | null | undefined>;

const prohibited = /(ssn|social_security|bank|routing|account_number|credit_card)/i;

/** Return only fields that require a fresh answer; never accept arbitrary keys as fields. */
export function missingProfileFields(
  requiredKeys: string[],
  answers: ProfileAnswers,
  definitions: FieldDefinition[],
): string[] {
  const registry = new Map(definitions.map(field => [field.key, field]));
  return [...new Set(requiredKeys)].filter(key => {
    if (prohibited.test(key)) throw new Error(`Prohibited profile field: ${key}`);
    const definition = registry.get(key);
    if (!definition) throw new Error(`Unknown profile field: ${key}`);
    if (definition.sensitivity === 'ask_each_time') return true;
    const value = answers[key];
    return value === null || value === undefined || (typeof value === 'string' && !value.trim()) || (typeof value === 'number' && !Number.isFinite(value));
  });
}
