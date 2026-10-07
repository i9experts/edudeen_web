import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenStorage, type AppRole } from '@/api/services/auth';
import { resolveSellerDestinationRemote } from '@/utils/sellerRouting';

/** The one handler every "Sell on Edudeen" / "Start Selling" CTA in the app
 *  should call — never a raw `navigate('/onboard')`. "Sell on Edudeen"
 *  always means seller intent, so:
 *  - Not logged in           → straight to seller registration, role
 *    pre-selected (the CTA itself IS the role choice — never ask again).
 *  - Logged in as buyer      → same seller-registration destination. This
 *    creates/logs into a separate seller account (Edudeen's seller/buyer
 *    accounts are already independent per-email documents) without ever
 *    touching the buyer session/account that's currently active.
 *  - Logged in as seller     → resolve their REAL store state from the
 *    backend and land exactly where they belong (onboarding / verification
 *    / dashboard) instead of assuming.
 *  - Logged in as admin (edge case) → same as buyer, falls through to
 *    seller registration; there's no legitimate "admin becomes seller"
 *    product flow to special-case here. */
export function useSellEntry() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const go = useCallback(async () => {
    const user = TokenStorage.getUser<{ role?: AppRole }>();
    const role = user?.role;

    if (!TokenStorage.isLoggedIn() || role !== 'seller') {
      navigate('/become-a-seller');
      return;
    }

    setLoading(true);
    try {
      const destination = await resolveSellerDestinationRemote();
      navigate(destination);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return { go, loading };
}
