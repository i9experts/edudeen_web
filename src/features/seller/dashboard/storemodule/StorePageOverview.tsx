import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  ExternalLink, Copy, Check, Store as StoreIcon, ShieldCheck, ShoppingCart, Loader2, Star, Megaphone, Palette, Image as ImageIcon, Type, LayoutTemplate, GraduationCap,
} from 'lucide-react';
import { Button, Input, Textarea, Select, Toggle, ImageUpload } from '@/components/comman/ui';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { useToast } from '@/contexts/ToastContext';
import {
  apiUpdateStore, apiUpdatePinnedProducts, apiUpdateAnnouncementBar, apiGetPublicStoreProducts,
  type PublicStoreProduct, type StoreAnnouncementType,
} from '@/api/services/store';
import { apiGetStoreTheme, apiUpdateStoreThemeColors, apiUpdateIdentityBanner, apiPublishStoreTheme } from '@/api/services/storeTheme';
import { getStorePagePath, getStorefrontUrl } from '@/utils/storefrontUrl';
import { STORE_ACCENT_SWATCHES, storeCoverGradient } from '@/features/storefront/StorefrontContext';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { apiGetFinanceDashboard } from '@/api/services/finance';
import { useDebouncedValue } from '@/hooks/seller/useInventorySearch';
import { commissionPctFromFee, formatPct } from '@/features/seller/store/Dashboard/Operations/finance/commissionCopy';

const MAX_FEATURED = 8;
const ANNOUNCEMENT_TYPES: { value: StoreAnnouncementType; label: string }[] = [
  { value: 'info',     label: 'News' },
  { value: 'sale',     label: 'Sale' },
  { value: 'coupon',   label: 'Coupon code' },
  { value: 'holiday',  label: 'Holiday / closed' },
  { value: 'shipping', label: 'Delivery' },
];

interface Draft {
  name: string;
  tagline: string;
  description: string;
  logo: string;
  coverImage: string;
  accent: string;
  bannerLayout: 'standard' | 'compact';
  showFollowerCount: boolean;
  showProductCount: boolean;
  announcementOn: boolean;
  announcementMessage: string;
  announcementType: StoreAnnouncementType;
  announcementCtaLabel: string;
  announcementCtaLink: string;
  featured: string[];
  // Teacher profile (one item per line for the lists)
  eduHeadline: string;
  eduQualifications: string;
  eduExperience: string;
  eduSubjects: string;
  eduInstitutions: string;
  eduLevels: string;
}

const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);

function Section({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-bone bg-white p-5">
      <div className="flex items-start gap-2.5 mb-4">
        <span className="size-8 rounded-lg bg-brand-pale-orange text-brand-orange flex items-center justify-center shrink-0">{icon}</span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-carbon m-0 font-sans">{title}</h2>
          {hint && <p className="text-[12.5px] text-slate mt-0.5">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * "Customize your store" — marketplace-style light customisation (like an
 * Etsy shop): banner & logo, name / headline / about, one accent colour from
 * an on-brand set, banner size, a shop announcement and up to 8 featured
 * products. The page itself always keeps Edudeen's design, cart and checkout.
 */
export function StorePageOverview() {
  const navigate = useNavigate();
  const toast = useToast();
  const { store, storeId, refetch } = useStoreWorkspace();

  const [initial, setInitial] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [products, setProducts] = useState<PublicStoreProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Seed the form from the store + its live theme (accent / banner options).
  useEffect(() => {
    if (!store || !storeId) return;
    let cancelled = false;
    apiGetStoreTheme(storeId)
      .then(res => res.data)
      .catch(() => null)
      .then(theme => {
        if (cancelled) return;
        const accentHex = theme?.theme?.primaryColor?.toLowerCase();
        const accent = STORE_ACCENT_SWATCHES.find(s => s.hex.toLowerCase() === accentHex)?.hex ?? STORE_ACCENT_SWATCHES[0].hex;
        const ib = theme?.identityBanner;
        const a = store.announcementBar;
        const seeded: Draft = {
          name: store.name ?? '',
          tagline: store.tagline ?? '',
          description: store.description ?? '',
          logo: store.logo ?? '',
          coverImage: store.coverImage ?? '',
          accent,
          bannerLayout: ib?.layout === 'compact' ? 'compact' : 'standard',
          showFollowerCount: ib?.showFollowerCount !== false,
          showProductCount: ib?.showProductCount !== false,
          announcementOn: !!a?.isActive && !!a?.message,
          announcementMessage: a?.message ?? '',
          announcementType: (a?.type as StoreAnnouncementType) ?? 'info',
          announcementCtaLabel: a?.ctaLabel ?? '',
          announcementCtaLink: a?.ctaLink ?? '',
          featured: store.pinnedProductIds ?? [],
          eduHeadline: store.educatorProfile?.headline ?? '',
          eduQualifications: (store.educatorProfile?.qualifications ?? []).join('\n'),
          eduExperience: store.educatorProfile?.experienceYears != null ? String(store.educatorProfile.experienceYears) : '',
          eduSubjects: (store.educatorProfile?.subjects ?? []).join('\n'),
          eduInstitutions: (store.educatorProfile?.institutions ?? []).join('\n'),
          eduLevels: (store.educatorProfile?.teachingLevels ?? []).join('\n'),
        };
        setInitial(seeded);
        setDraft(seeded);
      });
    return () => { cancelled = true; };
  }, [store, storeId]);

  // Featured-product picker: first 50 listed products, then server-side search
  // as the seller types so any listed product can be featured. `knownProducts`
  // remembers everything seen so picked items still preview after a new search.
  const [productQuery, setProductQuery] = useState('');
  const debouncedProductQuery = useDebouncedValue(productQuery.trim(), 300);
  const [productsLoading, setProductsLoading] = useState(true);
  const [listedTotal, setListedTotal] = useState<number | null>(null);
  const [knownProducts, setKnownProducts] = useState<Record<string, PublicStoreProduct>>({});
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setProductsLoading(true);
    apiGetPublicStoreProducts(storeId, { page: 1, limit: 50, search: debouncedProductQuery || undefined })
      .then(res => {
        if (cancelled) return;
        const list = res.data?.products ?? [];
        setProducts(list);
        setKnownProducts(prev => ({ ...prev, ...Object.fromEntries(list.map(p => [p._id, p])) }));
        if (!debouncedProductQuery) setListedTotal(res.data?.pagination?.total ?? list.length);
      })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, debouncedProductQuery]);

  // Real commission rate for the "earnings" line (0 → "No commission").
  const [commissionPct, setCommissionPct] = useState<number | null>(null);
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    apiGetFinanceDashboard(storeId)
      .then(d => { if (!cancelled) setCommissionPct(commissionPctFromFee(d?.feeBreakdown?.transactionFee)); })
      .catch(() => { /* line falls back to neutral copy */ });
    return () => { cancelled = true; };
  }, [storeId]);
  const listedCount = listedTotal ?? products.length;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => (d ? { ...d, [key]: value } : d));
  const changed = (keys: (keyof Draft)[]) => !!draft && !!initial && keys.some(k => JSON.stringify(draft[k]) !== JSON.stringify(initial[k]));
  const dirty = changed(Object.keys(draft ?? {}) as (keyof Draft)[]);

  const slug = store?.slug ?? '';
  const pageUrl = slug ? getStorefrontUrl(slug) : '';

  const toggleFeatured = (id: string) => {
    if (!draft) return;
    if (draft.featured.includes(id)) set('featured', draft.featured.filter(x => x !== id));
    else if (draft.featured.length < MAX_FEATURED) set('featured', [...draft.featured, id]);
    else toast.error(`You can feature up to ${MAX_FEATURED} products.`);
  };

  const save = async () => {
    if (!draft || !storeId) return;
    if (!draft.name.trim()) { toast.error('Store name is required.'); return; }
    if (draft.announcementOn && !draft.announcementMessage.trim()) { toast.error('Write the announcement message or switch it off.'); return; }
    setSaving(true);
    try {
      const jobs: Promise<unknown>[] = [];
      if (changed(['name', 'tagline', 'description', 'logo', 'coverImage'])) {
        jobs.push(apiUpdateStore({
          storeId, name: draft.name.trim(), tagline: draft.tagline.trim(), description: draft.description.trim(),
          logo: draft.logo, coverImage: draft.coverImage || null,
        }));
      }
      if (changed(['accent', 'bannerLayout', 'showFollowerCount', 'showProductCount'])) {
        jobs.push((async () => {
          await apiUpdateStoreThemeColors(storeId, { primaryColor: draft.accent });
          await apiUpdateIdentityBanner(storeId, {
            layout: draft.bannerLayout, showFollowerCount: draft.showFollowerCount, showProductCount: draft.showProductCount,
          });
          await apiPublishStoreTheme(storeId);
        })());
      }
      if (changed(['announcementOn', 'announcementMessage', 'announcementType', 'announcementCtaLabel', 'announcementCtaLink'])) {
        jobs.push(apiUpdateAnnouncementBar(storeId, {
          isActive: draft.announcementOn,
          message: draft.announcementMessage.trim() || null,
          type: draft.announcementType,
          ctaLabel: draft.announcementCtaLabel.trim() || null,
          ctaLink: draft.announcementCtaLink.trim() || null,
        }));
      }
      if (changed(['featured'])) jobs.push(apiUpdatePinnedProducts(storeId, draft.featured));
      if (changed(['eduHeadline', 'eduQualifications', 'eduExperience', 'eduSubjects', 'eduInstitutions', 'eduLevels'])) {
        const years = draft.eduExperience.trim() === '' ? null : Number(draft.eduExperience);
        if (years != null && (!Number.isInteger(years) || years < 0 || years > 70)) throw new Error('Years teaching must be a whole number from 0 to 70.');
        jobs.push(apiUpdateStore({
          storeId,
          educatorProfile: {
            headline: draft.eduHeadline.trim() || null,
            qualifications: lines(draft.eduQualifications),
            experienceYears: years,
            subjects: lines(draft.eduSubjects),
            institutions: lines(draft.eduInstitutions),
            teachingLevels: lines(draft.eduLevels),
          },
        }));
      }
      await Promise.all(jobs);
      setInitial(draft);
      refetch();
      toast.success('Store page updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your changes.');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (!pageUrl) return;
    navigator.clipboard.writeText(pageUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  const featuredProducts = useMemo(
    () => (draft?.featured ?? []).map(id => knownProducts[id]).filter(Boolean) as PublicStoreProduct[],
    [draft?.featured, knownProducts],
  );

  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={!slug} onClick={() => window.open(getStorePagePath(slug), '_blank', 'noopener')}>
        <ExternalLink size={13} className="inline align-middle mr-1" /> View store page
      </Button>
      <Button variant="primary" size="sm" disabled={!dirty || saving} onClick={save}>
        {saving ? <Loader2 size={13} className="inline align-middle mr-1 animate-spin" /> : null} Save changes
      </Button>
    </div>
  );

  return (
    <div>
      <StorePageHeader title="Customize your store" subtitle="Make your Edudeen store page your own — buyers still shop and pay through Edudeen." actions={actions} />

      {!draft ? (
        <div className="px-4 md:px-8 py-10 flex items-center gap-2 text-slate text-[13px]"><Loader2 size={15} className="animate-spin" /> Loading your store…</div>
      ) : (
        <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
          {/* ── Settings ── */}
          <div className="flex flex-col gap-5 min-w-0">
            <Section icon={<ImageIcon size={15} />} title="Banner & logo" hint="A wide banner (about 1600 × 400) and a square logo work best.">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-4">
                <div>
                  <p className="text-[12px] font-medium text-charcoal mb-1.5">Banner photo</p>
                  <ImageUpload value={draft.coverImage ? [draft.coverImage] : []} onChange={urls => set('coverImage', urls[0] ?? '')} maxFiles={1} />
                  <p className="text-[11px] text-slate mt-1">No photo? Your accent colour makes a gradient banner.</p>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-charcoal mb-1.5">Logo</p>
                  <ImageUpload value={draft.logo ? [draft.logo] : []} onChange={urls => set('logo', urls[0] ?? '')} maxFiles={1} />
                </div>
              </div>
            </Section>

            <Section icon={<Type size={15} />} title="Name & story" hint="Tell buyers who you are and what you teach.">
              <div className="flex flex-col gap-3.5">
                <Input label="Store name" value={draft.name} maxLength={60} onChange={e => set('name', e.target.value)} />
                <Input label="Headline" placeholder="e.g. Joyful Quran & Arabic resources for young learners" value={draft.tagline} maxLength={90} onChange={e => set('tagline', e.target.value)} />
                <Textarea label="About your store" rows={4} maxLength={600} placeholder="Your teaching background, what makes your resources special, who they're for…" value={draft.description} onChange={e => set('description', e.target.value)} />
                <p className="text-[11px] text-slate -mt-2 text-right">{draft.description.length}/600</p>
              </div>
            </Section>

            <Section icon={<GraduationCap size={15} />} title="About you as a teacher" hint="Shown on your store and every product page. Edudeen can add a Verified Educator badge once it checks these.">
              <div className="flex flex-col gap-3.5">
                <Input label="One line about you" placeholder="e.g. Primary teacher, 12 years teaching Quran and Arabic" value={draft.eduHeadline} maxLength={160} onChange={e => set('eduHeadline', e.target.value)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Textarea label="Qualifications (one per line)" rows={3} placeholder={'B.Ed, University of Karachi\nIjazah in Hafs'} value={draft.eduQualifications} onChange={e => set('eduQualifications', e.target.value)} />
                  <Textarea label="Subjects you teach (one per line)" rows={3} placeholder={'Quran & Tajweed\nArabic'} value={draft.eduSubjects} onChange={e => set('eduSubjects', e.target.value)} />
                  <Textarea label="Where you've taught (one per line)" rows={3} placeholder={'Beaconhouse, Lahore\nOnline tutoring'} value={draft.eduInstitutions} onChange={e => set('eduInstitutions', e.target.value)} />
                  <Textarea label="Levels you teach (one per line)" rows={3} placeholder={'Primary\nO Level'} value={draft.eduLevels} onChange={e => set('eduLevels', e.target.value)} />
                </div>
                <Input label="Years teaching" type="number" min={0} max={70} value={draft.eduExperience} onChange={e => set('eduExperience', e.target.value)} className="max-w-[160px]" />
              </div>
            </Section>

            <Section icon={<Palette size={15} />} title="Accent colour" hint="Used for your banner, buttons and badges. The rest of the page keeps Edudeen's look.">
              <div className="flex flex-wrap gap-3">
                {STORE_ACCENT_SWATCHES.map(s => {
                  const active = draft.accent.toLowerCase() === s.hex.toLowerCase();
                  return (
                    <button
                      key={s.hex}
                      type="button"
                      onClick={() => set('accent', s.hex)}
                      aria-pressed={active}
                      className={clsx('flex items-center gap-2 rounded-full border pl-1.5 pr-3 py-1.5 bg-white cursor-pointer transition-colors', active ? 'border-carbon' : 'border-bone hover:border-slate')}
                    >
                      <span className="size-6 rounded-full flex items-center justify-center" style={{ background: s.hex }}>
                        {active && <Check size={13} className="text-white" />}
                      </span>
                      <span className="text-[12.5px] font-medium text-charcoal">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section icon={<LayoutTemplate size={15} />} title="Banner style">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {([['standard', 'Large', 'Big banner, more presence'], ['compact', 'Compact', 'Short banner, products sooner']] as const).map(([value, label, sub]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('bannerLayout', value)}
                    className={clsx('text-left rounded-xl border p-3 cursor-pointer transition-colors', draft.bannerLayout === value ? 'border-brand-orange bg-brand-pale-orange' : 'border-bone bg-white hover:border-slate')}
                  >
                    <span className={clsx('block rounded-md mb-2', value === 'standard' ? 'h-10' : 'h-5')} style={{ background: storeCoverGradient(draft.accent) }} />
                    <span className="block text-[13px] font-semibold text-charcoal">{label}</span>
                    <span className="block text-[11.5px] text-slate">{sub}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center justify-between gap-3 text-[13px] text-charcoal">Show follower count <Toggle checked={draft.showFollowerCount} onChange={v => set('showFollowerCount', v)} /></label>
                <label className="flex items-center justify-between gap-3 text-[13px] text-charcoal">Show product count <Toggle checked={draft.showProductCount} onChange={v => set('showProductCount', v)} /></label>
              </div>
            </Section>

            <Section icon={<Megaphone size={15} />} title="Store announcement" hint="A short message across the top of your store — a sale, new arrivals, holiday hours.">
              <label className="flex items-center justify-between gap-3 text-[13px] text-charcoal mb-3">Show announcement <Toggle checked={draft.announcementOn} onChange={v => set('announcementOn', v)} /></label>
              {draft.announcementOn && (
                <div className="flex flex-col gap-3">
                  <Input label="Message" placeholder="e.g. 15% off all Quran workbooks this week" maxLength={120} value={draft.announcementMessage} onChange={e => set('announcementMessage', e.target.value)} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Select label="Type" value={draft.announcementType} onChange={e => set('announcementType', e.target.value as StoreAnnouncementType)}>
                      {ANNOUNCEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </Select>
                    <Input label="Button text (optional)" placeholder="Shop now" maxLength={24} value={draft.announcementCtaLabel} onChange={e => set('announcementCtaLabel', e.target.value)} />
                    <Input label="Button link (optional)" placeholder="https://…" value={draft.announcementCtaLink} onChange={e => set('announcementCtaLink', e.target.value)} />
                  </div>
                </div>
              )}
            </Section>

            <Section icon={<Star size={15} />} title={`Featured products (${draft.featured.length}/${MAX_FEATURED})`} hint="Pick your best sellers — they show in a row above all your products, in the order you pick them.">
              {(listedCount > products.length || productQuery) && (
                <Input
                  placeholder="Search your listed products…"
                  value={productQuery}
                  onChange={e => setProductQuery(e.target.value)}
                  className="mb-3"
                />
              )}
              {productsLoading && products.length === 0 ? (
                <p className="text-[12.5px] text-slate flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Loading products…</p>
              ) : products.length === 0 && debouncedProductQuery ? (
                <p className="text-[12.5px] text-slate">No listed products match “{debouncedProductQuery}”.</p>
              ) : products.length === 0 ? (
                <p className="text-[12.5px] text-slate">
                  No listed products yet. <button onClick={() => navigate(`/store/${storeId}/products/add`)} className="bg-transparent border-none p-0 text-brand-orange font-semibold underline cursor-pointer">Add a product</button> — make sure "List on Edudeen" is on.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {products.map(p => {
                    const order = draft.featured.indexOf(p._id);
                    const picked = order >= 0;
                    return (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => toggleFeatured(p._id)}
                        className={clsx('relative text-left rounded-xl border overflow-hidden bg-white cursor-pointer transition-colors', picked ? 'border-brand-orange ring-2 ring-brand-orange/25' : 'border-bone hover:border-slate')}
                      >
                        <span className="block aspect-square bg-cream">
                          {p.images?.[0]
                            ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                            : <ProductCoverFallback name={p.name} size="xs" className="w-full h-full" />}
                        </span>
                        <span className="block px-2 py-1.5 text-[11.5px] font-medium text-charcoal line-clamp-2">{p.name}</span>
                        {picked && (
                          <span className="absolute top-1.5 right-1.5 size-6 rounded-full bg-brand-orange text-white text-[11px] font-bold flex items-center justify-center">{order + 1}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Section>
          </div>

          {/* ── Live preview ── */}
          <aside className="lg:sticky lg:top-[104px] flex flex-col gap-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate">Preview</p>
            <div className="rounded-2xl overflow-hidden border border-bone bg-white">
              {draft.announcementOn && draft.announcementMessage.trim() && (
                <div className="px-3 py-1.5 text-center text-[11.5px] font-semibold text-white" style={{ background: draft.accent }}>
                  {draft.announcementMessage}{draft.announcementCtaLabel ? ` · ${draft.announcementCtaLabel} →` : ''}
                </div>
              )}
              <div className={clsx('relative', draft.bannerLayout === 'compact' ? 'h-[110px]' : 'h-[170px]')} style={draft.coverImage ? undefined : { background: storeCoverGradient(draft.accent) }}>
                {draft.coverImage && <img src={draft.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute left-3 bottom-3 right-3 flex items-end gap-3">
                  <span className="size-12 rounded-xl bg-white border-2 border-white/80 overflow-hidden flex items-center justify-center shrink-0">
                    {draft.logo ? <img src={draft.logo} alt="" className="w-full h-full object-cover" /> : <StoreIcon size={20} style={{ color: draft.accent }} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-serif text-[18px] text-white leading-tight truncate">{draft.name || 'Your store'}</span>
                    <span className="block text-[11px] text-white/85 truncate">{draft.tagline || draft.description || 'Add a headline'}</span>
                    <span className="block text-[10.5px] text-white/75 mt-0.5">
                      {[draft.showFollowerCount && 'Followers', draft.showProductCount && `${listedCount} products`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </div>
              </div>
              {featuredProducts.length > 0 && (
                <div className="px-3 py-3 border-t border-bone">
                  <p className="text-[12px] font-bold text-carbon mb-2">Featured</p>
                  <div className="flex gap-2 overflow-hidden">
                    {featuredProducts.slice(0, 4).map(p => (
                      <span key={p._id} className="w-[72px] shrink-0">
                        <span className="block aspect-square rounded-md overflow-hidden bg-cream">
                          {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <ProductCoverFallback name={p.name} size="xs" className="w-full h-full" />}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="px-3 py-3 border-t border-bone">
                <p className="text-[12px] font-bold text-carbon">All products</p>
                <p className="text-[11px] text-slate">{listedCount} listed · Edudeen cart & checkout</p>
              </div>
            </div>

            <div className="rounded-2xl border border-bone bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate mb-1.5">Your store link</p>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[13px] text-carbon font-semibold truncate">{pageUrl.replace(/^https?:\/\//, '') || '…'}</span>
                <button onClick={copyLink} disabled={!pageUrl} aria-label="Copy store link" className="shrink-0 size-7 rounded-md border border-bone bg-white flex items-center justify-center cursor-pointer hover:bg-cream disabled:opacity-50">
                  {copied ? <Check size={13} className="text-success" /> : <Copy size={13} className="text-slate" />}
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 text-[12px] text-slate">
                <span className="flex items-center gap-1.5"><ShoppingCart size={13} className="text-brand-orange" /> Buyers check out through Edudeen</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-brand-orange" /> {commissionPct === 0 ? 'No commission — earnings paid monthly' : commissionPct ? `${formatPct(commissionPct)} commission — earnings paid monthly` : 'Earnings paid monthly'}</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
