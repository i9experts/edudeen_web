import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Loader2, Monitor, Smartphone, X } from 'lucide-react';
import { apiGetPublicStore, type PublicStoreData, type StoreData } from '@/api/services/store';
import { apiPreviewStorefrontHighlights, type StorefrontHighlightRows } from '@/api/services/product';
import type { IdentityBanner, StorefrontHighlights, StorePageFields } from '@/api/services/storeTheme';
import { useDebouncedValue } from '@/hooks/seller/useInventorySearch';
import { StorefrontProvider, resolveEdudeenStoreCfg } from '@/features/storefront/StorefrontContext';
import { StoreIdentityBanner } from '@/features/storefront/sections/StoreIdentityBanner';
import { StoreTrustStrip } from '@/features/storefront/sections/StoreTrustStrip';
import { StoreAboutView } from '@/features/storefront/sections/StoreAboutTab';
import { HighlightRows } from '@/features/storefront/sections/StorefrontHighlights';
import { EducatorCard, hasEducatorProfile } from '@/components/comman/marketplace/EducatorCard';

type Tab = 'products' | 'about';

/**
 * Preview of the buyer store page for the CURRENT (even unsaved) draft. It renders the same components the public
 * page renders (StoreIdentityBanner, StoreTrustStrip, EducatorCard, HighlightRows, StoreAboutView) and only swaps in
 * the draft values; the live numbers (followers, rating, trust) come from the real public store. Buttons do nothing.
 */
export function StorePagePreview({ storeId, store, page, identity, highlights, listedCount, onClose, scrollable }: {
  storeId: string;
  store: StoreData;
  page: StorePageFields;
  identity: Pick<IdentityBanner, 'layout' | 'showFollowerCount' | 'showProductCount'>;
  highlights: StorefrontHighlights;
  listedCount: number;
  /** Set when shown as the full-screen sheet below lg. */
  onClose?: () => void;
  /** Beside the form (lg+): keep the panel inside the viewport; the panel scrolls, not the page. */
  scrollable?: boolean;
}) {
  const [device, setDevice] = useState<'phone' | 'desktop'>('phone');
  const [tab, setTab] = useState<Tab>('products');

  // Live numbers + trust from the real public store (404 for a store that is not live yet: fall back to the workspace store).
  const [live, setLive] = useState<PublicStoreData | null>(null);
  const [liveDone, setLiveDone] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiGetPublicStore(store.slug)
      .then(res => { if (!cancelled) setLive(res.data ?? null); })
      .catch(() => { if (!cancelled) setLive(null); })
      .finally(() => { if (!cancelled) setLiveDone(true); });
    return () => { cancelled = true; };
  }, [store.slug]);

  // Highlight rows for the unsaved choices.
  const hlKey = useDebouncedValue(JSON.stringify(highlights), 400);
  const [rows, setRows] = useState<StorefrontHighlightRows | null>(null);
  const [rowsState, setRowsState] = useState<'loading' | 'error' | 'ready'>('loading');
  useEffect(() => {
    let cancelled = false;
    setRowsState('loading');
    apiPreviewStorefrontHighlights(storeId, JSON.parse(hlKey) as StorefrontHighlights)
      .then(res => { if (!cancelled) { setRows(res.data); setRowsState('ready'); } })
      .catch(() => { if (!cancelled) setRowsState('error'); });
    return () => { cancelled = true; };
  }, [storeId, hlKey]);

  const view = useMemo(() => {
    const base = (live ?? {}) as Partial<PublicStoreData>;
    return {
      ...base,
      storeId,
      slug: store.slug,
      baseCurrency: store.baseCurrency,
      createdAt: base.createdAt ?? (store as unknown as { createdAt?: string }).createdAt ?? '',
      badges: base.badges ?? [],
      sellerType: base.sellerType ?? store.sellerType ?? null,
      followersCount: base.followersCount ?? Number((store as unknown as { followersCount?: number }).followersCount ?? 0),
      reviewCount: base.reviewCount ?? 0,
      averageRating: base.averageRating ?? 0,
      // Draft values:
      name: page.name || 'Your store',
      tagline: page.tagline,
      description: page.description,
      logo: page.logo,
      coverImage: page.coverImage,
      aboutBio: page.aboutBio,
      educatorProfile: page.educatorProfile,
      gradesServed: page.gradesServed,
      subjects: page.subjects,
      teachingLanguages: page.teachingLanguages,
      returnPolicy: base.returnPolicy ?? store.returnPolicy ?? null,
    } as PublicStoreData;
  }, [live, store, storeId, page]);

  const providerValue = useMemo(() => ({
    store: view,
    theme: null,
    cfg: resolveEdudeenStoreCfg(null),
    resolveLink: () => ({}),
    goToMainApp: () => {}, // preview only: clicking does nothing
  }), [view]);

  const sheet = !!onClose;
  const hasRows = !!rows && (rows.featured.length || rows.newArrivals.length || rows.bestSellers.length);

  return (
    <div className={clsx('flex flex-col', sheet && 'h-full')}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate">Preview · what buyers see after you publish</p>
        <div className="flex items-center gap-2">
          {!sheet && (
            <div className="flex rounded-lg border border-bone overflow-hidden" role="group" aria-label="Preview size">
              {([['phone', 'Phone', Smartphone], ['desktop', 'Desktop', Monitor]] as const).map(([v, label, Icon]) => (
                <button key={v} type="button" aria-pressed={device === v} onClick={() => setDevice(v)}
                  className={clsx('flex items-center gap-1 px-2.5 py-1 text-[12px] border-none cursor-pointer', device === v ? 'bg-carbon text-white' : 'bg-white text-charcoal')}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
          )}
          {sheet && (
            <button type="button" onClick={onClose} aria-label="Close preview" className="size-11 -me-2 flex items-center justify-center rounded-lg bg-transparent border-none cursor-pointer text-charcoal">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className={clsx(
        'rounded-2xl border border-bone bg-white overflow-hidden mx-auto',
        sheet ? 'w-full flex-1 overflow-y-auto' : device === 'phone' ? 'w-[390px] max-w-full' : 'w-full',
        scrollable && 'max-h-[calc(100vh-290px)] overflow-y-auto',
      )}>
        {!liveDone ? (
          <p className="p-4 text-[12.5px] text-slate flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Loading preview…</p>
        ) : (
          <StorefrontProvider value={providerValue}>
            <StoreIdentityBanner
              store={view}
              flags={identity}
              total={listedCount}
              primaryColor={providerValue.cfg.primaryColor}
            />
            <StoreTrustStrip store={view} />
            <div role="tablist" className="flex gap-1 border-b border-bone bg-white px-3">
              {(['products', 'about'] as const).map(t => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                  className={clsx('px-4 py-3 min-h-[44px] text-[14px] font-semibold bg-transparent border-0 border-b-2 -mb-px cursor-pointer',
                    tab === t ? 'border-brand-royal text-brand-royal' : 'border-transparent text-slate')}>
                  {t === 'products' ? 'Products' : 'About'}
                </button>
              ))}
            </div>

            {tab === 'about' ? (
              <div className="p-3">
                <StoreAboutView data={{ name: view.name, aboutBio: view.aboutBio, educatorProfile: view.educatorProfile, returnPolicy: view.returnPolicy, verifiedEducator: (view.badges ?? []).includes('verified_educator') }} />
              </div>
            ) : (
              <>
                {hasEducatorProfile(view.educatorProfile) && (
                  <div className="px-3 pt-4">
                    <EducatorCard profile={view.educatorProfile} verified={(view.badges ?? []).includes('verified_educator')} name={view.name} />
                  </div>
                )}
                {rowsState === 'loading' && !rows ? (
                  <p className="p-4 text-[12.5px] text-slate flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Loading highlights…</p>
                ) : rowsState === 'error' ? (
                  <p className="p-4 text-[12.5px] text-error">Could not load the highlight rows.</p>
                ) : rows ? <HighlightRows data={rows} /> : null}
                {!hasRows && rowsState !== 'loading' && rowsState !== 'error' && (
                  <p className="p-4 text-[12.5px] text-slate">No highlight rows yet. Pick 2+ featured products or switch a row on.</p>
                )}
                <div className="px-4 py-3 border-t border-bone text-[12px] text-slate">All your products appear below these rows.</div>
              </>
            )}
          </StorefrontProvider>
        )}
      </div>
    </div>
  );
}
