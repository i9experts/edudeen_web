/** Display-only: capitalises the first letter of every word ("ali raza" -> "Ali Raza"). Existing capitals are kept ("McDonald"). */
export function titleCaseName(raw: string | null | undefined): string {
  return (raw ?? '').trim().replace(/\s+/g, ' ').replace(/(^|[\s'-])(\p{Ll})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}
