type Part = string | null | undefined;

/** Comma-joined address: blank parts and repeats (case-insensitive) are skipped, so line 2 never echoes line 1 or the city twice. */
export function formatAddress(parts: Part[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const v = (p ?? '').trim();
    if (!v) continue;
    const key = v.replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out.join(', ');
}

/** Street + city + state (+ zip) for an address object. */
export function formatAddressLine(a: { addressLine1?: Part; addressLine2?: Part; city?: Part; state?: Part; zipCode?: Part } | null | undefined): string {
  if (!a) return '';
  return formatAddress([a.addressLine1, a.addressLine2, a.city, a.state, a.zipCode]);
}

/** Phone with the middle digits hidden ("+92 3•• ••••567"): first 3 and last 3 digits stay; very short numbers keep the last 2. */
export function maskPhone(raw: Part): string {
  const shown = formatPhone(raw);
  const total = (shown.match(/\d/g) ?? []).length;
  if (!total) return shown;
  const head = total >= 8 ? 3 : 0;
  const tail = total >= 8 ? 3 : 2;
  let i = 0;
  return shown.replace(/\d/g, d => (i++ < head || i > total - tail ? d : '•'));
}

/** One phone format everywhere: Pakistani numbers as "+92 300 1234567"; anything else is shown as typed. */
export function formatPhone(raw: Part): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  const digits = v.replace(/\D/g, '');
  let national = '';
  if (/^92\d{10}$/.test(digits)) national = digits.slice(2);
  else if (/^0\d{10}$/.test(digits)) national = digits.slice(1);
  else if (/^\d{10}$/.test(digits) && v.replace(/[\s()-]/g, '').length === 10) national = digits;
  return national ? `+92 ${national.slice(0, 3)} ${national.slice(3)}` : v;
}
