/**
 * Store profile rules (name, tagline, description, contact phone/e-mail, logo, cover).
 * Mirror of the API: edudeen_api/src/store/store-page.util.ts (text + phone) and src/common/store-image.util.ts
 * (images). The API is the authority; this file only gives sellers the same answer before they press Save.
 * Seller panel = English only, so messages are not in ur.ts.
 */
export const STORE_LIMITS = { name: 60, tagline: 100, description: 1000 } as const;
export type StoreTextField = keyof typeof STORE_LIMITS;
export type StoreField = StoreTextField | 'contactPhone' | 'contactEmail';

export const STORE_PHONE_PLACEHOLDER = '+92 3XX XXXXXXX';
export const STORE_PHONE_ERROR = 'Enter a valid Pakistani phone number, e.g. +92 3XX XXXXXXX (mobile) or 042 XXXXXXXX (landline).';
export const STORE_EMAIL_ERROR = 'Enter a valid e-mail address, e.g. support@yourstore.com.';

/** Pakistani mobile or landline -> E.164 `+92...`, else null. Same rules as the API. */
export function normalizeStorePhone(raw: string): string | null {
  const s = raw.trim();
  if (!s || !/^\+?[\d\s\-()]+$/.test(s)) return null;
  let d = s.replace(/\D/g, '');
  if (s.startsWith('+')) {
    if (!d.startsWith('92')) return null;
    d = d.slice(2);
  } else if (d.startsWith('0092')) d = d.slice(4);
  else if (d.startsWith('92') && d.length >= 11) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  else return null;
  if (/^3\d{9}$/.test(d)) return `+92${d}`;
  if (/^[24-9]\d{8,9}$/.test(d)) return `+92${d}`;
  return null;
}

/**
 * Error text for one field, or null. `original` = the value already saved: an UNCHANGED value is never flagged
 * (a legacy store with a long description or a free-text phone can still save its other fields).
 */
export function storeFieldError(field: StoreField, value: string, original = ''): string | null {
  const v = value.trim();
  const unchanged = v === original.trim();
  if (field === 'name') {
    if (v.length < 2) return 'Store name must be at least 2 characters.';
    return !unchanged && v.length > STORE_LIMITS.name ? `Store name can be at most ${STORE_LIMITS.name} characters.` : null;
  }
  if (field === 'tagline' || field === 'description') {
    const max = STORE_LIMITS[field];
    return !unchanged && v.length > max ? `${field === 'tagline' ? 'Tagline' : 'Description'} can be at most ${max} characters.` : null;
  }
  if (!v || unchanged) return null; // empty = cleared, unchanged = legacy value kept
  if (field === 'contactPhone') return normalizeStorePhone(v) ? null : STORE_PHONE_ERROR;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254 ? null : STORE_EMAIL_ERROR;
}

// ── Images ────────────────────────────────────────────────────────────────────
export const STORE_IMAGE_RULES = {
  logo: { label: 'logo', maxBytes: 2 * 1024 * 1024, minW: 400, minH: 400, ratio: 1, tolerance: 0.1, hint: 'Square, min 400x400, max 2MB', purpose: 'store_logo' },
  cover: { label: 'cover', maxBytes: 5 * 1024 * 1024, minW: 1600, minH: 400, ratio: 4, tolerance: 0.1, hint: '1600x400 (4:1), max 5MB', purpose: 'store_cover' },
} as const;
export type StoreImageKind = keyof typeof STORE_IMAGE_RULES;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

/** Type, size and dimensions of a picked file. Returns an error message, or null when it is fine. The server re-checks all three. */
export async function checkStoreImage(file: File, kind: StoreImageKind): Promise<string | null> {
  const r = STORE_IMAGE_RULES[kind];
  if (!ALLOWED_TYPES.includes(file.type)) return `The ${r.label} must be a JPG, PNG or WebP image.`;
  if (file.size > r.maxBytes) return `This ${r.label} is ${(file.size / 1048576).toFixed(1)}MB. The maximum is ${r.maxBytes / 1048576}MB.`;
  const d = await readDimensions(file);
  if (!d) return `This ${r.label} could not be read. Try saving it again as JPG or PNG.`;
  if (d.width < r.minW || d.height < r.minH) return `This ${r.label} is ${d.width}x${d.height}. It must be at least ${r.minW}x${r.minH}.`;
  if (Math.abs(d.width / d.height - r.ratio) / r.ratio > r.tolerance) {
    return `This ${r.label} is ${d.width}x${d.height}. ${r.ratio === 1 ? 'It must be square.' : 'It must be wide, 4:1 (for example 1600x400).'}`;
  }
  return null;
}
