import { useState } from 'react';
import { imgUrl } from '@/utils/cloudinaryImage';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { Star, TrendingUp, BadgeCheck, UserPlus, UserCheck, ArrowRight } from 'lucide-react';
import { apiFollowStore, type PublicStoreListItem } from '@/api/services/store';
import { useAuthGate } from '@/contexts/AuthGateContext';

// Calm, brand-tinted palettes for stores without a logo / product photos — picked per store name.
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

const MIN_REVIEWS_FOR_RATING = 3;
const MIN_SOLD_TO_SHOW = 10;

/** What the seller sells: a real bio line when it is meaningful, else the main category. */
function taglineOf(store: PublicStoreListItem): string | null {
  const bio = store.description?.trim() ?? '';
  if (bio.length >= 30) return bio;
  return store.categoryName?.trim() || null;
}

// ── Featured seller card — the seller's best-selling products up top, logo, trust numbers, Visit store ──
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
  const photos = (store.topProducts ?? []).filter(p => !!p.image).slice(0, 3);
  const tagline = taglineOf(store);
  const showRating = store.averageRating > 0 && (store.reviewCount ?? 0) >= MIN_REVIEWS_FOR_RATING;
  const showSold = (store.soldCount ?? 0) >= MIN_SOLD_TO_SHOW;

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
      {/* What this seller actually sells: up to 3 best-selling product photos */}
      <div className="relative h-[104px] bg-[#f1f3f5]" style={photos.length === 0 ? { background: tone.cover } : undefined}>
        {photos.length > 0 && (
          <div className="grid h-full gap-px bg-bone" style={{ gridTemplateColumns: `repeat(${photos.length}, minmax(0, 1fr))` }}>
            {photos.map(p => (
              <img
                key={p.id}
                loading="lazy"
                decoding="async"
                src={imgUrl(p.image, { w: 220 })}
                alt={p.name}
                width={88}
                height={104}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ))}
          </div>
        )}
        {isTopSeller && (
          <span className="absolute top-[8px] end-[8px] inline-flex items-center gap-[3px] px-[7px] py-[3px] rounded-full bg-carbon/80 backdrop-blur-sm text-white text-[12px] font-bold">
            <TrendingUp size={9} /> Top Seller
          </span>
        )}
      </div>

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
            type="button"
            onClick={handleFollow}
            disabled={followBusy}
            aria-label={following ? 'Following' : 'Follow'}
            title={following ? 'Following' : 'Follow'}
            className={clsx(
              'inline-flex h-8 w-8 items-center justify-center rounded-full border cursor-pointer transition-all duration-150 mt-[26px]',
              following
                ? 'bg-carbon/5 border-bone text-charcoal'
                : 'bg-white border-carbon/20 text-carbon hover:bg-carbon hover:text-white hover:border-carbon',
              followBusy && 'opacity-60 cursor-wait',
            )}
          >
            {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
          </button>
        </div>

        <div className="flex items-center gap-[5px] mb-[3px]">
          <p className="text-[14px] font-semibold text-carbon leading-tight truncate">
            {/* A real link (crawlable, new-tab friendly); the rest of the card still opens the store on click. */}
            <Link to={`/shop/${store.slug}`} onClick={e => e.stopPropagation()} className="text-inherit no-underline hover:underline">{store.name}</Link>
          </p>
          {isVerified && <BadgeCheck size={14} className="text-info fill-info/15 shrink-0" />}
        </div>
        {/* The tagline only exists when there is something real to say - never an empty gap. */}
        {tagline ? <p className="text-[12px] text-slate leading-snug line-clamp-1 mb-[10px]">{tagline}</p> : <div className="mb-[10px]" />}

        <div className="flex items-center gap-3 pt-[10px] border-t border-bone text-[12px] text-slate">
          {showRating && (
            <span className="flex items-center gap-[4px] text-charcoal font-medium">
              <Star size={11} className="text-brand-orange fill-brand-orange" />
              <span>{store.averageRating.toFixed(1)}</span>
              <span className="text-slate font-normal">({store.reviewCount})</span>
            </span>
          )}
          {showSold && (
            <span className="flex items-center gap-[4px]">
              <span>{(store.soldCount ?? 0).toLocaleString()}</span> <span>sold</span>
            </span>
          )}
          {store.productCount != null && (
            <span className="flex items-center gap-[4px]">
              <span>{store.productCount}</span> <span>items</span>
            </span>
          )}
        </div>

        <Link
          to={`/shop/${store.slug}`}
          onClick={e => e.stopPropagation()}
          className="mt-3 inline-flex w-full items-center justify-center gap-[6px] rounded-full bg-carbon px-4 py-[8px] text-[13px] font-semibold text-white no-underline transition-colors hover:bg-carbon/90"
        >
          Visit store <ArrowRight size={13} className="rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
}
