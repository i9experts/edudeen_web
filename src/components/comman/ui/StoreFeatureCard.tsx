import { useState } from 'react';
import { imgUrl } from '@/utils/cloudinaryImage';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { Star, Users, TrendingUp, BadgeCheck, PackageCheck, UserPlus, UserCheck } from 'lucide-react';
import { apiFollowStore, type PublicStoreListItem } from '@/api/services/store';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { CoverImage } from './CoverImage';

// Calm, brand-tinted palettes for stores without their own cover/logo — picked per store name so a row of
// new stores doesn't look like the same loud gradient repeated.
const STORE_TONES = [
  { cover: 'linear-gradient(135deg,#174771 0%,#2b6a8f 100%)', tile: '#e6eef5', ink: '#174771' },
  { cover: 'linear-gradient(135deg,#1f5d4a 0%,#3a8a6c 100%)', tile: '#e5f2ec', ink: '#1f5d4a' },
  { cover: 'linear-gradient(135deg,#5a3d7a 0%,#8460a6 100%)', tile: '#efe9f6', ink: '#5a3d7a' },
  { cover: 'linear-gradient(135deg,#8a5a14 0%,#c28a2e 100%)', tile: '#f7efdf', ink: '#8a5a14' },
  { cover: 'linear-gradient(135deg,#7a2f3f 0%,#a95468 100%)', tile: '#f6e8eb', ink: '#7a2f3f' },
];
function toneFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return STORE_TONES[h % STORE_TONES.length];
}
function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'S';
}

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
  const tone = toneFor(store.name || store.slug || '');

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
        'relative shrink-0 w-[240px] sm:w-[264px] text-start bg-white rounded-2xl border border-bone overflow-hidden cursor-pointer group shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_10px_24px_-8px_rgba(16,24,40,0.18)] hover:border-carbon/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
        className,
      )}
    >
      {/* Cover */}
      <CoverImage
        src={store.coverImage}
        alt={`${store.name} cover`}
        imgClassName="transition-transform duration-500 group-hover:scale-105"
        className="h-[76px]"
        // No cover photo → a calm single-hue gradient (per store), not the loud default one.
        fallbackClassName=""
        fallbackStyle={{ background: tone.cover }}
      >
        {isTopSeller && (
          <span className="absolute top-[8px] end-[8px] inline-flex items-center gap-[3px] px-[7px] py-[3px] rounded-full bg-carbon/80 backdrop-blur-sm text-white text-[12px] font-bold">
            <TrendingUp size={9} /> Top Seller
          </span>
        )}
      </CoverImage>

      {/* Body */}
      <div className="relative px-4 pb-4 -mt-6">
        <div className="flex items-end justify-between mb-2">
          <div className="w-12 h-12 rounded-xl bg-white border border-bone p-[2px] shadow-sm">
            <div className="w-full h-full rounded-[10px] flex items-center justify-center overflow-hidden" style={store.logo ? undefined : { background: tone.tile }}>
              {store.logo
                ? <img loading="lazy" decoding="async" src={imgUrl(store.logo, { w: 160 })} alt={`${store.name} logo`} width={64} height={64} className="w-full h-full object-cover" />
                : <span className="text-[15px] font-bold tracking-wide" style={{ color: tone.ink }}>{initialsOf(store.name)}</span>}
            </div>
          </div>
          <button
            onClick={handleFollow}
            disabled={followBusy}
            className={clsx(
              'inline-flex items-center gap-[5px] px-[11px] py-[5px] rounded-full text-[12px] font-semibold border cursor-pointer transition-all duration-150 mb-[2px] mt-[26px]',
              following
                ? 'bg-carbon/5 border-bone text-charcoal'
                : 'bg-white border-carbon/20 text-carbon hover:bg-carbon hover:text-white hover:border-carbon',
              followBusy && 'opacity-60 cursor-wait',
            )}
          >
            {following ? <UserCheck size={11} /> : <UserPlus size={11} />}
            {following ? 'Following' : 'Follow'}
          </button>
        </div>

        <div className="flex items-center gap-[5px] mb-[3px]">
          <p className="text-[14px] font-semibold text-carbon leading-tight truncate">
            {/* A real link (crawlable, new-tab friendly); the rest of the card still opens the store on click. */}
            <Link to={`/shop/${store.slug}`} onClick={e => e.stopPropagation()} className="text-inherit no-underline hover:underline">{store.name}</Link>
          </p>
          {isVerified && <BadgeCheck size={14} className="text-info fill-info/15 shrink-0" />}
        </div>
        {/* The bio line only exists when the store wrote one - never an empty gap. */}
        {store.description?.trim() ? <p className="text-[12px] text-slate leading-snug line-clamp-1 mb-[10px]">{store.description.trim()}</p> : <div className="mb-[10px]" />}

        <div className="flex items-center gap-3 pt-[10px] border-t border-bone">
          <span className="flex items-center gap-[4px] text-[12px] text-charcoal font-medium">
            {store.averageRating > 0
              ? <><Star size={11} className="text-brand-orange fill-brand-orange" />{store.averageRating.toFixed(1)}</>
              : <span className="px-[6px] py-[1px] rounded-full bg-success-bg text-success text-[12px] font-semibold">New</span>}
          </span>
          {store.followersCount > 0 && (
            <>
              <span className="w-px h-3 bg-bone" />
              <span className="flex items-center gap-[4px] text-[12px] text-slate">
                <Users size={11} />
                {store.followersCount.toLocaleString()}
              </span>
            </>
          )}
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
