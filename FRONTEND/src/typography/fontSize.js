export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 20;
export const DEFAULT_FONT_SIZE = 14;

export function normalizeFontSize(value, fallback = DEFAULT_FONT_SIZE) {
  if (value === '' || value == null || !Number.isFinite(Number(value))) return fallback;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(Number(value))));
}
