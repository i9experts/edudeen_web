interface AddressLike {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

/** Joins address parts, skipping blanks and any part an earlier part already contains
 *  ("House 5, Karachi" + city "Karachi" would otherwise read "House 5, Karachi, Karachi"). */
export function joinAddressParts(parts: (string | null | undefined)[]): string {
  const kept: string[] = [];
  for (const raw of parts) {
    const p = raw?.trim();
    if (p && !kept.some(k => k.toLowerCase().includes(p.toLowerCase()))) kept.push(p);
  }
  return kept.join(', ');
}

/** Two display lines for a saved address: the street, then city/state/zip without repeating
 *  anything the street line already says. */
export function addressLines(addr: AddressLike): { street: string; region: string } {
  const street = joinAddressParts([addr.addressLine1, addr.addressLine2]);
  const region = joinAddressParts([street, addr.city, addr.state]).slice(street.length).replace(/^,\s*/, '');
  return { street, region: [region, addr.zipCode?.trim()].filter(Boolean).join(' ') };
}
