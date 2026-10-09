import {
  createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode,
} from 'react';
import {
  apiGetWishlist, apiAddToWishlist, apiRemoveFromWishlist, apiGetWishlistItem, apiClearWishlist,
  type WishlistListItem,
} from '@/api/services/wishlist';
import { TokenStorage } from '@/api/services/auth';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { useToast } from '@/contexts/ToastContext';

export interface WishlistContextValue {
  wishlistItems:      WishlistListItem[];
  wishlistCount:      number;
  loading:            boolean;
  wishlisting:        string | null;   // variantId currently being toggled
  isWishlisted:       (productId: string, variantId: string) => boolean;
  addToWishlist:      (productId: string, variantId: string) => Promise<void>;
  removeFromWishlist: (productId: string, variantId: string) => Promise<void>;
  toggleWishlist:     (productId: string, variantId: string) => Promise<void>;
  clearWishlist:      () => Promise<void>;
  clearing:           boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function useWishlistContext() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlistContext must be used inside WishlistProvider');
  return ctx;
}

function wKey(productId: string, variantId: string) {
  return `${productId}::${variantId}`;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { requireAuth } = useAuthGate();
  const toast = useToast();
  const [wishlistItems, setWishlistItems] = useState<WishlistListItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [wishlisting,   setWishlisting]   = useState<string | null>(null);
  const [clearing,      setClearing]      = useState(false);
  const [wishlistedKeys, setWishlistedKeys] = useState(() => new Set<string>());

  // Maps "productId::variantId" → wishlistId (needed for removal)
  const idMap = useRef(new Map<string, string>());

  // Bumped on every fetch so a slow response from before a logout/login can
  // never overwrite the newer account's wishlist.
  const fetchSeq = useRef(0);

  const resetWishlist = useCallback(() => {
    fetchSeq.current++;
    setWishlistItems([]);
    setWishlistedKeys(new Set());
    idMap.current.clear();
    setLoading(false);
  }, []);

  const fetchWishlist = useCallback(() => {
    if (!TokenStorage.isLoggedIn() || TokenStorage.isStaffSession()) { resetWishlist(); return; }
    const seq = ++fetchSeq.current;
    setLoading(true);
    apiGetWishlist()
      .then(res => {
        if (seq !== fetchSeq.current) return;
        const items = res.data ?? [];
        setWishlistItems(items);
        const keys = new Set<string>();
        items.forEach(item => {
          (item.variants ?? []).forEach(v => keys.add(wKey(item.product._id, v._id)));
        });
        setWishlistedKeys(keys);
      })
      .catch(() => {})
      .finally(() => { if (seq === fetchSeq.current) setLoading(false); });
  }, [resetWishlist]);

  // Initial fetch, then re-fetch on every sign-in and clear on sign-out —
  // previously this only ran once on mount, so signing out and back in
  // (no page reload) left the wishlist empty until a manual refresh.
  useEffect(() => {
    fetchWishlist();
    window.addEventListener('edudeen:auth-login', fetchWishlist);
    window.addEventListener('edudeen:auth-logout', resetWishlist);
    return () => {
      fetchSeq.current++;
      window.removeEventListener('edudeen:auth-login', fetchWishlist);
      window.removeEventListener('edudeen:auth-logout', resetWishlist);
    };
  }, [fetchWishlist, resetWishlist]);

  const isWishlisted = useCallback(
    (productId: string, variantId: string) => wishlistedKeys.has(wKey(productId, variantId)),
    [wishlistedKeys],
  );

  const addToWishlist = useCallback(async (productId: string, variantId: string) => {
    // Same guard as CartContext.addToCart — a guest tapping the wishlist
    // heart never reaches apiAddToWishlist, so the 401 that would otherwise
    // hard-redirect to /login never fires; requireAuth re-runs this call
    // once they sign in via the prompt.
    requireAuth(async () => {
      const k = wKey(productId, variantId);
      setWishlisting(variantId);
      // Optimistic
      setWishlistedKeys(prev => new Set(prev).add(k));
      try {
        const res = await apiAddToWishlist(productId, variantId);
        idMap.current.set(k, res.data.wishlist._id);
        // The "already in wishlist" branch of this endpoint re-fetches the
        // product/variant by id and can come back null if either was since
        // deleted/unlisted — unlike the initial GET /wishlist list, which
        // already filters those out server-side. Skip pushing a broken item
        // into state rather than crash every consumer that reads
        // item.product.* downstream.
        if (res.data.product && res.data.variant) {
          setWishlistItems(prev => {
            if (prev.some(i => i.product._id === productId)) return prev;
            return [...prev, { product: res.data.product, variants: [res.data.variant] }];
          });
        }
        toast.success('Added to wishlist');
      } catch (err) {
        setWishlistedKeys(prev => { const s = new Set(prev); s.delete(k); return s; });
        toast.error(err instanceof Error ? err.message : 'Failed to add to wishlist.');
      } finally {
        setWishlisting(null);
      }
    }, 'Sign in to save items to your wishlist.');
  }, [requireAuth, toast]);

  const removeFromWishlist = useCallback(async (productId: string, variantId: string) => {
    const k = wKey(productId, variantId);
    setWishlisting(variantId);

    // Snapshot the removed item (and its position) from inside the updater
    // itself, rather than reading the `wishlistItems` state variable in this
    // closure — this callback's deps are `[]`, so that variable can be stale.
    // On failure below, this is what lets rollback restore the *item*, not
    // just the key — a partial rollback (heart shows wishlisted again, but
    // the Wishlist page still doesn't list it) is exactly the desync bug
    // this replaces.
    let removedItem: WishlistListItem | undefined;
    let removedIndex = -1;

    // Optimistic
    setWishlistedKeys(prev => { const s = new Set(prev); s.delete(k); return s; });
    setWishlistItems(prev => {
      const idx = prev.findIndex(i => i.product._id === productId);
      if (idx !== -1) { removedItem = prev[idx]; removedIndex = idx; }
      return prev.filter(i => i.product._id !== productId);
    });

    try {
      let wishlistId = idMap.current.get(k);
      if (!wishlistId) {
        const r = await apiGetWishlistItem(productId, variantId);
        wishlistId = r.data?.wishlist?._id;
        // Backend found no matching wishlist entry — it's already not
        // wishlisted server-side, so the optimistic removal above was
        // correct; nothing left to do (and nothing to roll back).
        if (!wishlistId) return;
        idMap.current.set(k, wishlistId);
      }
      await apiRemoveFromWishlist(wishlistId);
      toast.success('Removed from wishlist');
    } catch (err) {
      // Roll back both pieces of state together, restoring the item as
      // close to its original position as possible.
      setWishlistedKeys(prev => new Set(prev).add(k));
      if (removedItem) {
        const restored = removedItem;
        setWishlistItems(prev => {
          if (prev.some(i => i.product._id === productId)) return prev;
          const next = [...prev];
          next.splice(Math.min(removedIndex, next.length), 0, restored);
          return next;
        });
      }
      toast.error(err instanceof Error ? err.message : 'Failed to remove from wishlist.');
    } finally {
      setWishlisting(null);
    }
  }, [toast]);

  const toggleWishlist = useCallback(async (productId: string, variantId: string) => {
    if (wishlistedKeys.has(wKey(productId, variantId))) {
      await removeFromWishlist(productId, variantId);
    } else {
      await addToWishlist(productId, variantId);
    }
  }, [wishlistedKeys, addToWishlist, removeFromWishlist]);

  const clearWishlist = useCallback(async () => {
    const prevItems = wishlistItems;
    const prevKeys  = wishlistedKeys;
    setClearing(true);
    // Optimistic
    setWishlistItems([]);
    setWishlistedKeys(new Set());
    idMap.current.clear();
    try {
      await apiClearWishlist();
      toast.success('Wishlist cleared');
    } catch (err) {
      // Rollback
      setWishlistItems(prevItems);
      setWishlistedKeys(prevKeys);
      toast.error(err instanceof Error ? err.message : 'Failed to clear wishlist.');
      throw err;
    } finally {
      setClearing(false);
    }
  }, [wishlistItems, wishlistedKeys, toast]);

  const value = useMemo<WishlistContextValue>(() => ({
    wishlistItems,
    wishlistCount: wishlistItems.length,
    loading,
    wishlisting,
    clearing,
    isWishlisted,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    clearWishlist,
  }), [wishlistItems, loading, wishlisting, clearing, isWishlisted, addToWishlist, removeFromWishlist, toggleWishlist, clearWishlist]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}
