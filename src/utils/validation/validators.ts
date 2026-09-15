// ── Edudeen Central Validation System ─────────────────────────────────────────
// Pure validator functions — return null (valid) or an error string (invalid).
// Use factories for validators that need parameters (minLength, matchesField…).
// ───────────────────────────────────────────────────────────────────────────────

export type Validator<T = unknown> = (value: string, data: T) => string | null;

// ── Required ──────────────────────────────────────────────────────────────────
export function required<T>(fieldName: string): Validator<T> {
  return (v) => (v.trim().length > 0 ? null : `${fieldName} is required.`);
}

// ── Email ─────────────────────────────────────────────────────────────────────
export function email<T>(msg = 'Enter a valid email address.'): Validator<T> {
  return (v) => {
    if (!v.trim()) return null; // use required() separately for presence check
    return /^\S+@\S+\.\S+$/.test(v) ? null : msg;
  };
}

// ── Phone (international format) ──────────────────────────────────────────────
export function phone<T>(msg = 'Enter a valid phone number.'): Validator<T> {
  return (v) => {
    if (!v.trim()) return null;
    return /^\+?[\d\s\-()]{7,15}$/.test(v) ? null : msg;
  };
}

// ── Min length ────────────────────────────────────────────────────────────────
export function minLength<T>(n: number, fieldName = 'This field'): Validator<T> {
  return (v) => {
    if (!v) return null;
    return v.length >= n ? null : `${fieldName} must be at least ${n} characters.`;
  };
}

// ── Max length ────────────────────────────────────────────────────────────────
export function maxLength<T>(n: number, fieldName = 'This field'): Validator<T> {
  return (v) => {
    if (!v) return null;
    return v.length <= n ? null : `${fieldName} must be at most ${n} characters.`;
  };
}

// ── Password strength (8+ chars, uppercase, number, special char) ────────────
export function password<T>(msg = 'Password must be at least 8 characters.'): Validator<T> {
  return (v) => {
    if (!v) return null;
    if (v.length < 8) return msg;
    return null;
  };
}

export function passwordStrong<T>(): Validator<T> {
  return (v) => {
    if (!v) return null;
    if (v.length < 8)                       return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(v))                   return 'Include at least one uppercase letter.';
    if (!/[0-9]/.test(v))                   return 'Include at least one number.';
    if (!/[^A-Za-z0-9]/.test(v))            return 'Include at least one special character.';
    return null;
  };
}

// ── Match another field (e.g. confirmPassword) ────────────────────────────────
export function matchesField<T>(
  otherField: keyof T,
  msg: string,
): Validator<T> {
  return (v, data) => {
    if (!v) return null;
    return v === String((data as Record<string, unknown>)[otherField as string] ?? '') ? null : msg;
  };
}

// ── Numeric only ─────────────────────────────────────────────────────────────
export function numeric<T>(msg = 'Only numbers are allowed.'): Validator<T> {
  return (v) => {
    if (!v.trim()) return null;
    return /^\d+$/.test(v) ? null : msg;
  };
}

// ── Exact length ─────────────────────────────────────────────────────────────
export function exactLength<T>(n: number, fieldName = 'This field'): Validator<T> {
  return (v) => {
    if (!v) return null;
    return v.length === n ? null : `${fieldName} must be exactly ${n} characters.`;
  };
}

// ── URL ──────────────────────────────────────────────────────────────────────
export function url<T>(msg = 'Enter a valid URL.'): Validator<T> {
  return (v) => {
    if (!v.trim()) return null;
    try { new URL(v); return null; } catch { return msg; }
  };
}

// ── Min value ────────────────────────────────────────────────────────────────
export function minValue<T>(min: number, fieldName = 'Value'): Validator<T> {
  return (v) => {
    if (!v.trim()) return null;
    const n = Number(v);
    return !isNaN(n) && n >= min ? null : `${fieldName} must be at least ${min}.`;
  };
}

// ── Max value ────────────────────────────────────────────────────────────────
export function maxValue<T>(max: number, fieldName = 'Value'): Validator<T> {
  return (v) => {
    if (!v.trim()) return null;
    const n = Number(v);
    return !isNaN(n) && n <= max ? null : `${fieldName} must be at most ${max}.`;
  };
}

// ── Price (non-negative, max 2 decimal places) ───────────────────────────────
export function price<T>(msg = 'Enter a valid price.'): Validator<T> {
  return (v) => {
    if (!v.trim()) return null;
    return /^\d+(\.\d{1,2})?$/.test(v) && Number(v) >= 0 ? null : msg;
  };
}

// ── Quantity (positive integer) ──────────────────────────────────────────────
export function quantity<T>(msg = 'Enter a valid quantity.'): Validator<T> {
  return (v) => {
    if (!v.trim()) return null;
    return /^[1-9]\d*$/.test(v) ? null : msg;
  };
}

// ── Slug (lowercase, numbers, hyphens only) ──────────────────────────────────
export function slug<T>(msg = 'Only lowercase letters, numbers, and hyphens allowed.'): Validator<T> {
  return (v) => {
    if (!v.trim()) return null;
    return /^[a-z0-9-]+$/.test(v) ? null : msg;
  };
}
