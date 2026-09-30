import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isBuyerSession } from '@/hooks/auth/useIsBuyer';

/**
 * Seller-recruitment pages (For Sellers, Pricing, store-builder Products and
 * Solutions) are for visitors and sellers. A signed-in buyer can't open a
 * store, so they're sent back to the shop instead.
 */
export function NotForBuyers({ children }: { children: ReactNode }) {
  if (isBuyerSession()) return <Navigate to="/" replace />;
  return <>{children}</>;
}
