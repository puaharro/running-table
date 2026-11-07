export const favoritesKey = "nxtgo:favorites:v1";
export function parseFavorites(value: string | null): string[] {
  if (value === null) return [];
  const parsed: unknown = JSON.parse(value);
  if (
    !Array.isArray(parsed) ||
    parsed.length > 500 ||
    parsed.some((id) => typeof id !== "string" || !/^[a-z0-9-]{1,160}$/.test(id))
  )
    throw new Error("收藏資料格式無效");
  return [...new Set(parsed)];
}
export function toggleFavorite(storage: Pick<Storage, "getItem" | "setItem">, id: string) {
  const ids = parseFavorites(storage.getItem(favoritesKey));
  const next = ids.includes(id) ? ids.filter((saved) => saved !== id) : [...ids, id];
  // Validate before writing; a failed write must never be reported as saved.
  parseFavorites(JSON.stringify(next));
  storage.setItem(favoritesKey, JSON.stringify(next));
  return next;
}
