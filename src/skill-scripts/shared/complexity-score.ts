export type ComplexityScoreResult =
  | { valid: true; value: number }
  | { valid: false; reason: 'non-integer' }
  | { valid: false; reason: 'out-of-range'; value: number };

export const validateComplexityScore = (value: string): ComplexityScoreResult => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, reason: 'non-integer' };
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (parsed < 1 || parsed > 10) {
    return { valid: false, reason: 'out-of-range', value: parsed };
  }

  return { valid: true, value: parsed };
};

export const parseComplexityScore = (value: string): number | undefined => {
  const result = validateComplexityScore(value);
  return result.valid ? result.value : undefined;
};
