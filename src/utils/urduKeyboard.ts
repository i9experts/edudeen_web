/**
 * Phonetic Urdu typing (the way InPage's phonetic keyboard works): press the English key that sounds like the
 * Urdu letter. Lower case gives the common letter, Shift gives its heavier / related partner
 * (t = ت, T = ٹ · d = د, D = ڈ · r = ر, R = ڑ · s = س, S = ش · k = ک, K = خ · h = ہ, H = ھ …).
 */
export const URDU_PHONETIC: Record<string, string> = {
  a: 'ا', A: 'آ',
  b: 'ب', B: 'ب',
  c: 'چ', C: 'ث',
  d: 'د', D: 'ڈ',
  e: 'ع', E: 'ء',
  f: 'ف', F: 'ف',
  g: 'گ', G: 'غ',
  h: 'ہ', H: 'ھ',
  i: 'ی', I: 'ئ',
  j: 'ج', J: 'ژ',
  k: 'ک', K: 'خ',
  l: 'ل', L: 'ل',
  m: 'م', M: 'م',
  n: 'ن', N: 'ں',
  o: 'و', O: 'ؤ',
  p: 'پ', P: 'پ',
  q: 'ق', Q: 'ق',
  r: 'ر', R: 'ڑ',
  s: 'س', S: 'ش',
  t: 'ت', T: 'ٹ',
  u: 'ُ', U: 'ِ', // pesh, zer
  v: 'ح', V: 'ح',
  w: 'ط', W: 'ظ',
  x: 'ص', X: 'ض',
  y: 'ے', Y: 'ۓ',
  z: 'ز', Z: 'ذ',
};

/** The Urdu punctuation marks. Typed after a digit they stay as typed so times like 00:01.500 can still be written. */
const PUNCTUATION: Record<string, string> = { ',': '،', '.': '۔', '?': '؟', ';': '؛' };

/** What typing `key` should insert, or null to let the browser type it normally (digits, space, Urdu keys, …). */
export function phoneticChar(key: string, previousChar: string): string | null {
  if (key.length !== 1) return null;
  if (URDU_PHONETIC[key]) return URDU_PHONETIC[key];
  if (PUNCTUATION[key]) return /\d/.test(previousChar) ? null : PUNCTUATION[key];
  return null;
}

/** Rows of the on-screen keyboard (English key → the Urdu letter it types). */
export const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] as const;
