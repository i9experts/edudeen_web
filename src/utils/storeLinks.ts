/**
 * App-store links. A link counts only when it is a public https URL; internal-test
 * / beta links (Play internal testing, TestFlight) are ignored so the site never
 * shows a link the public cannot open. Until a public URL exists the badges are
 * shown as non-clickable "Coming soon".
 */
export function publicStoreUrl(raw?: string | null): string {
  const v = (raw ?? '').trim();
  if (!/^https:\/\/\S+$/i.test(v)) return '';
  if (/internaltest|testflight|internal-test|\/apps\/testing\//i.test(v)) return '';
  return v;
}

/** Why a link typed by an admin is not accepted ('' = fine or empty). */
export function storeUrlProblem(raw?: string | null): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  if (!/^https:\/\/\S+$/i.test(v)) return 'Enter a full link starting with https://';
  if (!publicStoreUrl(v)) return 'This looks like a test/beta link (internal test or TestFlight). Use the public store link.';
  return '';
}

const env = import.meta.env as Record<string, string | undefined>;
export const ENV_GOOGLE_PLAY_URL = publicStoreUrl(env.VITE_GOOGLE_PLAY_URL);
export const ENV_APP_STORE_URL = publicStoreUrl(env.VITE_APP_STORE_URL);
