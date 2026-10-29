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
      {/* What this seller sells: up to 3 best-selling covers as fixed-size tiles (never full-bleed, so nothing gets cropped oddly) */}
      <div className="relative flex h-[124px] items-center justify-center gap-[10px] px-4" style={{ background: photos.length === 0 ? tone.cover : `linear-gradient(180deg, ${tone.tile} 0%, #f7f8fa 100%)` }}>
        {photos.map(p => (
          <div key={p.id} className="h-[92px] w-[68px] shrink-0 overflow-hidden rounded-[6px] bg-white shadow-[0_4px_10px_-2px_rgba(16,24,40,0.25)] ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-[2px]">
            <img
              loading="lazy"
              decoding="async"
              src={imgUrl(p.image, { w: 200 })}
              alt={p.name}
              width={68}
              height={92}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
        {photos.length === 0 && (
          <span className="text-[34px] font-bold tracking-wide text-white/90" aria-hidden="true">{initialsOf(store.name)}</span>
        )}
        {isTopSeller && (
          <span className="absolute top-[8px] end-[8px] inline-flex items-center gap-[3px] px-[7px] py-[3px] rounded-full bg-carbon/80 backdrop-blur-sm text-white text-[12px] font-bold">
            <TrendingUp size={9} /> Top Seller
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-3">
        <div className="mb-[10px] flex items-center gap-[10px]">
          <div className="h-10 w-10 shrink-0 rounded-xl border border-bone bg-white p-[2px]">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[9px]" style={store.logo ? undefined : { background: tone.tile }}>
              {store.logo
                ? <img loading="lazy" decoding="async" src={imgUrl(store.logo, { w: 120 })} alt={`${store.name} logo`} width={40} height={40} className="h-full w-full object-cover" />
                : <span className="text-[13px] font-bold tracking-wide" style={{ color: tone.ink }}>{initialsOf(store.name)}</span>}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-[5px]">
              <p className="truncate text-[14px] font-semibold leading-tight text-carbon">
                {/* A real link (crawlable, new-tab friendly); the rest of the card still opens the store on click. */}
                <Link to={`/shop/${store.slug}`} onClick={e => e.stopPropagation()} className="text-inherit no-underline hover:underline">{store.name}</Link>
              </p>
              {isVerified && <BadgeCheck size={14} className="shrink-0 fill-info/15 text-info" />}
            </div>
            {tagline && <p className="mt-[2px] line-clamp-1 text-[12px] leading-snug text-slate">{tagline}</p>}
          </div>
          <button
            type="button"
            onClick={handleFollow}
            disabled={followBusy}
            aria-label={following ? 'Following' : 'Follow'}
            title={following ? 'Following' : 'Follow'}
            className={clsx(
              'inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-150',
              following
                ? 'border-bone bg-carbon/5 text-charcoal'
                : 'border-carbon/20 bg-white text-carbon hover:border-carbon hover:bg-carbon hover:text-white',
              followBusy && 'cursor-wait opacity-60',
            )}
          >
            {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
          </button>
        </div>

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
