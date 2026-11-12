import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Star, Users, BadgeCheck, Award, Store } from 'lucide-react';
import { CoverImage } from '@/components/comman/ui';
import { storeCoverGradient } from '../StorefrontContext';
import { TRUST_MIN_SAMPLES } from '@/utils/sellerTrust';

const SELLER_TYPE_LABEL: Record<string, string> = {
  educator:       'Education Specialist',
  creator:        'Content Creator',
  retailer:       'Bookshop & Supplies',
  brand_business: 'Brand / Business',
  freelancer:     'Freelancer',
};

function StoreBadges({ badges, sellerType }: { badges: string[]; sellerType: string | null }) {
  const items: { label: string; icon: ReactNode; cls: string }[] = [];
  const safeBadges = badges ?? [];

  if (safeBadges.includes('top_seller'))
    items.push({ label: 'Top Seller', icon: <Award size={10} />, cls: 'bg-amber-100 text-amber-700 border-amber-200' });
  if (safeBadges.includes('verified'))
    items.push({ label: 'Verified', icon: <BadgeCheck size={10} />, cls: 'bg-blue-50 text-blue-600 border-blue-200' });
  if (safeBadges.includes('featured'))
    items.push({ label: 'Featured', icon: <Star size={10} />, cls: 'bg-purple-50 text-purple-600 border-purple-200' });

  const specialistLabel = sellerType ? SELLER_TYPE_LABEL[sellerType] : null;
  if (specialistLabel)
    items.push({ label: specialistLabel, icon: <BadgeCheck size={10} />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' });

  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-[5px] mt-[8px]">
      {items.map(b => (
        <span key={b.label} className={clsx('inline-flex items-center gap-[3px] px-[7px] py-[3px] rounded-full text-[12px] font-semibold border', b.cls)}>
          {b.icon}{b.label}
        </span>
      ))}
    </div>
  );
}

export interface IdentityBannerStore {
  name: string;
  logo: string | null;
  coverImage: string | null;
  tagline: string | null;
  description?: string | null;
  badges?: string[];
  sellerType?: string | null;
  reviewCount?: number;
  averageRating?: number;
  followersCount?: number;
}

export interface IdentityBannerFlags {
  layout?: 'standard' | 'compact' | 'immersive';
  showBadges?: boolean;
  showFollowerCount?: boolean;
  showProductCount?: boolean;
  showRating?: boolean;
  descriptionMaxLines?: number | null;
}

/**
 * The store page's identity banner (cover, logo, name, headline, counts). ONE component used by the public store page
 * and by the seller's Customize-store preview, so they cannot drift. Buttons (Follow / Message) and the banner carousel
 * are passed in by the caller; the preview passes none.
 */
export function StoreIdentityBanner({ store, flags, total, primaryColor, background, actions }: {
  store: IdentityBannerStore;
  flags?: IdentityBannerFlags | null;
  /** Listed-product count shown next to the followers. */
  total: number;
  primaryColor: string;
  /** Replaces the cover photo (store banner carousel). */
  background?: ReactNode;
  actions?: ReactNode;
}) {
  const bannerLayout = flags?.layout ?? 'standard';
  const showBadges        = flags?.showBadges        !== false;
  const showFollowerCount = flags?.showFollowerCount !== false;
  const showProductCount  = flags?.showProductCount  !== false;
  const showRating        = flags?.showRating        !== false;
  const descriptionClampCls = flags?.descriptionMaxLines
    ? { 1: 'line-clamp-1', 2: 'line-clamp-2', 3: 'line-clamp-3' }[Math.min(flags.descriptionMaxLines, 3)]
    : '';

  return (
    <CoverImage
      className={clsx(
        'flex',
        bannerLayout === 'compact' ? 'min-h-[150px] sm:min-h-[180px] items-end' :
        bannerLayout === 'immersive' ? 'min-h-[320px] sm:min-h-[380px] lg:min-h-[440px] items-center' :
        'min-h-[210px] sm:min-h-[240px] lg:min-h-[270px] items-end',
      )}
      src={store.coverImage}
      loading="eager"
      overlay
      overlayClassName={bannerLayout === 'immersive' ? 'bg-black/50' : 'bg-black/40'}
      fallbackClassName=""
      fallbackStyle={{ background: storeCoverGradient(primaryColor) }}
      backgroundOverride={background}
    >
      <div className={clsx('px-4 sm:px-6 lg:px-10 w-full max-w-[1480px] mx-auto', bannerLayout === 'compact' ? 'py-3 sm:py-4' : 'py-4 sm:py-5')}>
        <div className={clsx(
          'flex gap-5 sm:gap-6',
          bannerLayout === 'immersive' ? 'flex-col items-center text-center' : 'flex-col sm:flex-row items-start sm:items-center',
        )}>
          <div className={clsx(
            'rounded-[18px] bg-white flex items-center justify-center shrink-0 outline outline-2 outline-white/40',
            bannerLayout === 'compact' ? 'w-[52px] h-[52px]' : bannerLayout === 'immersive' ? 'w-[96px] h-[96px] sm:w-[108px] sm:h-[108px]' : 'w-[60px] h-[60px] sm:w-[72px] sm:h-[72px]',
          )}>
            {store.logo
              ? <img loading="lazy" decoding="async" src={store.logo} alt={store.name} className="w-full h-full rounded-[18px] object-cover" />
              : <Store size={bannerLayout === 'compact' ? 24 : 36} style={{ color: primaryColor }} />}
          </div>

          <div className={clsx('flex-1 min-w-0', bannerLayout === 'immersive' && 'flex-none max-w-2xl')}>
            <h1 className={clsx('font-bold text-white mb-[4px] leading-tight', bannerLayout === 'compact' ? 'text-[17px]' : bannerLayout === 'immersive' ? 'text-[28px] sm:text-[34px]' : 'text-[19px] sm:text-[22px]')}>{store.name}</h1>
            {store.tagline && bannerLayout !== 'compact' && (
              <p className="text-[12.5px] sm:text-[13.5px] text-[rgba(255,255,255,0.85)] font-medium -mt-[2px] mb-[4px]">{store.tagline}</p>
            )}
            {showBadges && <div className={clsx(bannerLayout === 'immersive' && 'flex justify-center')}><StoreBadges badges={store.badges ?? []} sellerType={store.sellerType ?? null} /></div>}
            {store.description && bannerLayout !== 'compact' && (
              <p className={clsx('text-[12px] sm:text-[13px] text-[rgba(255,255,255,0.8)] mt-[6px] mb-[4px] max-w-2xl', descriptionClampCls || 'line-clamp-1')}>{store.description}</p>
            )}
            <div className={clsx('flex items-center gap-[5px] text-[12px] text-[rgba(255,255,255,0.7)] mt-[6px]', bannerLayout === 'immersive' && 'justify-center')}>
              {showRating && (store.reviewCount ?? 0) >= TRUST_MIN_SAMPLES && (
                <>
                  <Star size={13} className="fill-current" style={{ color: primaryColor }} />
                  <span>{(store.averageRating ?? 0).toFixed(1)} ({(store.reviewCount ?? 0).toLocaleString()} reviews)</span>
                  <span className="mx-1">·</span>
                </>
              )}
              {showFollowerCount && (
                <>
                  <Users size={13} />
                  <span>{(store.followersCount ?? 0).toLocaleString()} followers</span>
                </>
              )}
              {showProductCount && (
                <>
                  <span className="mx-1">·</span>
                  <span>{total} products</span>
                </>
              )}
            </div>
          </div>

          {actions && <div className="flex flex-wrap gap-2 items-center justify-center shrink-0 sm:flex-row">{actions}</div>}
        </div>
      </div>
    </CoverImage>
  );
}
