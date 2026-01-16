/**
 * Normalize string by removing accents and converting to lowercase
 * Useful for accent-insensitive search
 */
export function normalizeString(str: string): string {
  return str
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase();
}

/**
 * Check if text contains query (accent and case insensitive)
 */
export function matchesQuery(text: string, query: string): boolean {
  const normalizedText = normalizeString(text);
  const normalizedQuery = normalizeString(query);
  return normalizedText.includes(normalizedQuery);
}
