import { createContext, useContext } from 'react';

export interface ReauthApi {
  /** Opens the password modal. Resolves with a short-lived reauth token, or null if cancelled. */
  confirm: () => Promise<string | null>;
}

export const ReauthCtx = createContext<ReauthApi>({ confirm: async () => null });

export function useReauth() {
  return useContext(ReauthCtx);
}