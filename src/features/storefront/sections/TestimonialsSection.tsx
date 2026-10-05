import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { apiGetPublicStoreReviews } from '@/api/services/publicStoreReviews';
import { clsx } from 'clsx';
import { useStorefront } from '../StorefrontContext';

interface TestimonialBlock {
  quote:       string;
  authorName:  string;
  authorRole?: string;
  avatarUrl?:  string;
  rating?:     number;
}

function Stars({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="flex gap-[2px]">
      {[1, 2, 3, 4, 5].map(n => <Star key={n} size={13} style={n <= rating ? { color, fill: color } : { color: '#D9D6CC' }} />)}
    </div>
  );
}

function Avatar({ t, cfg }: { t: TestimonialBlock; cfg: ReturnType<typeof useStorefront>['cfg'] }) {
  return t.avatarUrl
    ? <img src={t.avatarUrl} alt={t.authorName} className="w-8 h-8 rounded-full object-cover" />
    : <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ background: cfg.primaryColor }}>{t.authorName[0]}</div>;
}

export function TestimonialsSection({ settings, blocks: sellerBlocks }: { settings: { heading?: string }; blocks: TestimonialBlock[] }) {
  const { cfg, store } = useStorefront();

  // No seller-written quotes → fall back to this store's real buyer reviews
  // (best recent written ones). Still renders nothing if there are none.
  const [reviewBlocks, setReviewBlocks] = useState<TestimonialBlock[]>([]);
  const needsFallback = sellerBlocks.length === 0;
  useEffect(() => {
    if (!needsFallback || !store?.storeId) return;
    let cancelled = false;
    apiGetPublicStoreReviews(store.storeId, { limit: 6, minRating: 4 })
      .then(res => {
        if (cancelled) return;
        setReviewBlocks((res.data?.reviews ?? [])
          .filter(r => r.comment.trim())
          .map(r => ({
            quote:      r.comment,
            authorName: r.customerName,
            authorRole: r.isVerifiedPurchase ? 'Verified buyer' : undefined,
            avatarUrl:  r.avatarUrl ?? undefined,
            rating:     r.rating ?? undefined,
          })));
      })
      .catch(() => { /* fallback is best-effort — section just stays hidden */ });
    return () => { cancelled = true; };
  }, [needsFallback, store?.storeId]);

  const blocks = needsFallback ? reviewBlocks : sellerBlocks;
  if (blocks.length === 0) return null;

  const heading = settings.heading && (
    <h2 className="font-bold mb-5 text-center" style={{ color: cfg.textColor, fontSize: Math.round(20 * cfg.typeScaleFactor) }}>{settings.heading}</h2>
  );

  if (cfg.testimonialStyle === 'minimal') {
    // A plain centered quote list — no card chrome at all, deliberately
    // distinct from 'cards' rather than just the global `cardStyle` at 'flat'
    // (layout changes too: single column, generous vertical rhythm, divider
    // lines instead of grid cells).
    return (
      <div className="px-4 sm:px-6 lg:px-10" style={{ paddingTop: 32 * cfg.sectionSpacingScale, paddingBottom: 32 * cfg.sectionSpacingScale }}>
        {heading}
        <div className="max-w-[720px] mx-auto flex flex-col divide-y" style={{ borderColor: `${cfg.textColor}14` }}>
          {blocks.map((t, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3 py-6 first:pt-0 last:pb-0">
              {t.rating != null && <Stars rating={t.rating} color={cfg.primaryColor} />}
              <p className="text-[15px] leading-relaxed italic" style={{ color: cfg.textColor }}>“{t.quote}”</p>
              <div className="flex flex-col items-center gap-1">
                <Avatar t={t} cfg={cfg} />
                <p className="text-[12.5px] font-semibold" style={{ color: cfg.textColor }}>{t.authorName}</p>
                {t.authorRole && <p className="text-[11px] opacity-60" style={{ color: cfg.textColor }}>{t.authorRole}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Independent from `productCardStyle` — a seller can give product cards an
  // elevated look while keeping testimonial cards flat, or vice versa.
  const chrome =
    cfg.testimonialCardStyle === 'flat'     ? '' :
    cfg.testimonialCardStyle === 'elevated' ? 'shadow-[0_2px_10px_rgba(20,15,10,0.08)]' :
    /* outlined */                             'border border-bone';

  return (
    <div className="px-4 sm:px-6 lg:px-10" style={{ paddingTop: 32 * cfg.sectionSpacingScale, paddingBottom: 32 * cfg.sectionSpacingScale }}>
      {heading}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mx-auto" style={{ maxWidth: Math.round(1100 * cfg.containerWidthScale) }}>
        {blocks.map((t, i) => (
          <div key={i} className={clsx('bg-white p-5 flex flex-col gap-3', chrome)} style={{ borderRadius: cfg.testimonialCardRadiusPx }}>
            {t.rating != null && <Stars rating={t.rating} color={cfg.primaryColor} />}
            <p className="text-[13.5px] leading-relaxed" style={{ color: cfg.textColor }}>“{t.quote}”</p>
            <div className="flex items-center gap-2 mt-auto">
              <Avatar t={t} cfg={cfg} />
              <div>
                <p className="text-[12.5px] font-semibold" style={{ color: cfg.textColor }}>{t.authorName}</p>
                {t.authorRole && <p className="text-[11px] opacity-60" style={{ color: cfg.textColor }}>{t.authorRole}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
