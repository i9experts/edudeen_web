import { TokenStorage } from '@/api/services/auth';

/**
 * True when a signed-in buyer (role "user") is browsing. Seller-recruitment
 * CTAs ("Start selling", "Start creating", "Sell on Edudeen") are hidden for
 * them — a buyer account can't open a store, so those links only confuse.
 */
export function isBuyerSession(): boolean {
  return TokenStorage.isLoggedIn() && TokenStorage.getUser<{ role?: string }>()?.role === 'user';
}

export function useIsBuyer(): boolean {
  return isBuyerSession();
}
