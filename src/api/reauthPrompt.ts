/**
 * Lets the HTTP client ask the admin for their password when the API answers 403 REAUTH_REQUIRED
 * (money-sensitive admin actions). The ReauthProvider that is mounted registers its modal here.
 */
type Prompt = () => Promise<string | null>;
let prompt: Prompt | null = null;

export function registerReauthPrompt(fn: Prompt | null) { prompt = fn; }
export function promptReauth(): Promise<string | null> {
  return (prompt ? prompt() : Promise.resolve(null)).then(t => { if (t) remember(t); return t; });
}

// The API keeps a confirmed password valid for 5 minutes, so a run of actions (bulk approve, several payouts)
// asks once. Held in memory only (never storage), dropped a minute before the server would, and on sign-out.
const REMEMBER_MS = 4 * 60_000;
let remembered: { token: string; at: number } | null = null;
function remember(token: string) { remembered = { token, at: Date.now() }; }
export function rememberedReauth(): string | null {
  if (!remembered) return null;
  if (Date.now() - remembered.at > REMEMBER_MS) { remembered = null; return null; }
  return remembered.token;
}
export function forgetReauth() { remembered = null; }
if (typeof window !== 'undefined') window.addEventListener('edudeen:auth-logout', forgetReauth);
