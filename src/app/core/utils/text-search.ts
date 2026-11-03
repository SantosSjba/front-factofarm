const SEPARATORS = /[\s\-_.,/]+/;

/**
 * Coincidencia tolerante a separadores, igual que el API (`textSearchFilter`):
 * "3 gel" o "3gel" encuentran "3-GEL". Las palabras deben
 * aparecer en el mismo orden.
 */
export function matchesTextSearch(text: string | null | undefined, query: string): boolean {
  const parts = query
    .trim()
    .toLowerCase()
    .replace(/(\d)(\p{L})/gu, '$1 $2')
    .replace(/(\p{L})(\d)/gu, '$1 $2')
    .split(SEPARATORS)
    .filter(Boolean);
  if (!parts.length) return true;
  const haystack = (text ?? '').toLowerCase();
  let from = 0;
  for (const part of parts) {
    const at = haystack.indexOf(part, from);
    if (at < 0) return false;
    from = at + part.length;
  }
  return true;
}
