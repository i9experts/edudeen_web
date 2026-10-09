import { useState } from 'react';
import { clsx } from 'clsx';
import { Star, Users, Store, TrendingUp, BadgeCheck, PackageCheck, UserPlus, UserCheck } from 'lucide-react';
import { apiFollowStore, type PublicStoreListItem } from '@/api/services/store';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { CoverImage } from './CoverImage';
import { EDUDEEN_DEFAULT_COVER_GRADIENT } from '@/features/storefront/StorefrontContext';

// ── Featured seller card — cover, avatar, badges, rating/followers/products, follow ──
export function StoreFeatureCard({ store, onClick, className }: {
  store: PublicStoreListItem;
  onClick: (slug: string) => void;
  className?: string;
}) {
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const { requireAuth } = useAuthGate();
  const isVerified = store.badges?.includes('verified');
  const isTopSeller = store.badges?.includes('top_seller');

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (followBusy) return;
    requireAuth(async () => {
      setFollowBusy(true);
      try {
        const res = await apiFollowStore(store.storeId);
        setFollowing(res.data.following);
      } catch { /* non-critical — button just stays in prior state */ }
      finally { setFollowBusy(false); }
    }, 'Sign in to follow this store.');
  };

  return (
    <div
      onClick={() => onClick(store.slug)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onClick(store.slug); }}
      className={clsx(
        'relative shrink-0 w-[240px] sm:w-[264px] text-start bg-white rounded-2xl border border-bone overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-[4px] hover:border-brand-orange/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
        className,
      )}
    >
      {/* Cover */}
      <CoverImage
        src={store.coverImage}
        imgClassName="transition-transform duration-500 group-hover:scale-105"
        className="h-[88px]"
        // No cover photo → the same Edudeen default gradient the store page uses.
        fallbackClassName=""
        fallbackStyle={{ background: EDUDEEN_DEFAULT_COVER_GRADIENT }}
      >
        {isTopSeller && (
          <span className="absolute top-[8px] end-[8px] inline-flex items-center gap-[3px] px-[7px] py-[3px] rounded-full bg-carbon/80 backdrop-blur-sm text-white text-[9.5px] font-bold">
            <TrendingUp size={9} /> Top Seller
          </span>
        )}
      </CoverImage>

      {/* Body */}
      <div className="relative px-4 pb-4 -mt-7">
        <div className="flex items-end justify-between mb-2">
          <div className="w-14 h-14 rounded-2xl bg-white border border-bone p-[3px]">
            <div className="w-full h-full rounded-[13px] bg-brand-pale-orange flex items-center justify-center overflow-hidden">
              {store.logo
                ? <img loading="lazy" decoding="async" src={store.logo} alt="" className="w-full h-full object-cover" />
                : <Store size={22} className="text-brand-orange" />}
            </div>
          </div>
          <button
            onClick={handleFollow}
            disabled={followBusy}
            className={clsx(
              'inline-flex items-center gap-[5px] px-[11px] py-[6px] rounded-full text-[12px] font-semibold border cursor-pointer transition-all duration-150 mb-[2px]',
              following
                ? 'bg-carbon/5 border-bone text-charcoal'
                : 'bg-brand-orange border-brand-orange text-white hover:bg-brand-deep-orange',
              followBusy && 'opacity-60 cursor-wait',
            )}
          >
            {following ? <UserCheck size={11} /> : <UserPlus size={11} />}
            {following ? 'Following' : 'Follow'}
          </button>
        </div>

        <div className="flex items-center gap-[5px] mb-[3px]">
          <p className="text-[13.5px] font-bold text-carbon leading-tight truncate">{store.name}</p>
          {isVerified && <BadgeCheck size={14} className="text-info fill-info/15 shrink-0" />}
        </div>
        {/* Always reserve the line so cards without a description stay the same height. */}
        <p className="text-[12px] text-slate leading-snug line-clamp-1 mb-[10px] min-h-[1.375em]">{store.description || ' '}</p>

        <div className="flex items-center gap-3 pt-[10px] border-t border-bone">
          <span className="flex items-center gap-[4px] text-[12px] text-charcoal font-medium">
            <Star size={11} className="text-brand-orange fill-brand-orange" />
            {store.averageRating > 0 ? store.averageRating.toFixed(1) : 'New'}
          </span>
          <span className="w-px h-3 bg-bone" />
          <span className="flex items-center gap-[4px] text-[12px] text-slate">
            <Users size={11} />
            {store.followersCount.toLocaleString()}
          </span>
          <span className="w-px h-3 bg-bone" />
          <span className="flex items-center gap-[4px] text-[12px] text-slate">
            <PackageCheck size={11} />
            {store.productCount != null ? `${store.productCount} items` : 'Shop'}
          </span>
        </div>
      </div>
    </div>
  );
}
