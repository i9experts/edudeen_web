/**
 * Lets the HTTP client ask the admin for their password when the API answers 403 REAUTH_REQUIRED
 * (money-sensitive admin actions). The ReauthProvider that is mounted registers its modal here.
 */
type Prompt = () => Promise<string | null>;
let prompt: Prompt | null = null;

export function registerReauthPrompt(fn: Prompt | null) { prompt = fn; }
export function promptReauth(): Promise<string | null> { return prompt ? prompt() : Promise.resolve(null); }
