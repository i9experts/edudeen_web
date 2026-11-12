import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  ExternalLink, Copy, Check, ShieldCheck, ShoppingCart, Loader2, Star, Megaphone, Image as ImageIcon, Layers, Type, LayoutTemplate,
  GraduationCap, Eye, CircleCheck, Circle, BarChart3, GalleryHorizontal,
} from 'lucide-react';
import { Button, Input, Textarea, Toggle, ImageUpload } from '@/components/comman/ui';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { useToast } from '@/contexts/ToastContext';
import { apiGetPublicStoreProducts } from '@/api/services/store';
import { BannerUpload } from '@/components/comman/ui/BannerUpload';
import {
  apiGetStoreTheme, apiGetStoreThemeDraft, apiPublishStoreTheme, apiUpdateIdentityBanner, apiUpdateStorePageDraft,
  apiUpdateStorefrontHighlights, type StorefrontHighlights, type StorePageFields,
} from '@/api/services/storeTheme';
import { getStorePagePath, getStorefrontUrl } from '@/utils/storefrontUrl';
import { storeCoverGradient } from '@/features/storefront/StorefrontContext';
import { apiGetFinanceDashboard } from '@/api/services/finance';
import { parseIntroVideo, VIDEO_URL_ERROR } from '@/utils/videoEmbed';
import { StoreHighlightsEditor } from './StoreHighlightsEditor';
import { StoreSectionsCard } from './StoreSectionsCard';
import { StoreBannerSummary } from './StoreBannerSummary';
import { StoreInsightsCard } from './StoreInsightsCard';
import { StorePagePreview } from './StorePagePreview';
import { storePageCompleteness } from './storePageCompleteness';
import { commissionPctFromFee, formatPct } from '@/features/seller/store/Dashboard/Operations/finance/commissionCopy';
import { useLeaveGuard, timeAgo } from '@/features/seller/store/Dashboard/StoreSection/products/ProductWizard';

// ── Working copy ──────────────────────────────────────────────────────────────
interface Form {
  name: string;
  tagline: string;
  description: string;
  aboutBio: string;
  logo: string;
  coverImage: string;
  // Teacher profile (one item per line for the lists)
  eduHeadline: string;
  eduQualifications: string;
  eduExperience: string;
  eduSubjects: string;
  eduInstitutions: string;
  eduLevels: string;
  eduVideo: string;
}
interface Identity { bannerLayout: 'standard' | 'compact'; showFollowerCount: boolean; showProductCount: boolean }
interface Work { form: Form; identity: Identity; highlights: StorefrontHighlights }

const EMPTY_HL: StorefrontHighlights = { featuredProductIds: [], showNewArrivals: false, showBestSellers: false };
const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function formFromPage(p: StorePageFields): Form {
  const ep = p.educatorProfile;
  return {
    name: p.name ?? '', tagline: p.tagline ?? '', description: p.description ?? '', aboutBio: p.aboutBio ?? '',
    logo: p.logo ?? '', coverImage: p.coverImage ?? '',
    eduHeadline: ep?.headline ?? '',
    eduQualifications: (ep?.qualifications ?? []).join('\n'),
    eduExperience: ep?.experienceYears != null ? String(ep.experienceYears) : '',
    eduSubjects: (ep?.subjects ?? []).join('\n'),
    eduInstitutions: (ep?.institutions ?? []).join('\n'),
    eduLevels: (ep?.teachingLevels ?? []).join('\n'),
    eduVideo: ep?.introVideoUrl ?? '',
  };
}

/** Form → what the API stores. `years` is null when empty OR invalid (the form shows the error and blocks saving). */
function pageFromForm(f: Form): StorePageFields {
  const yearsRaw = f.eduExperience.trim();
  const years = yearsRaw === '' || !Number.isInteger(Number(yearsRaw)) ? null : Number(yearsRaw);
  const empty = !f.eduHeadline.trim() && !lines(f.eduQualifications).length && !lines(f.eduSubjects).length && !lines(f.eduInstitutions).length
    && !lines(f.eduLevels).length && years == null && !f.eduVideo.trim();
  return {
    name: f.name.trim(),
    tagline: f.tagline.trim() || null,
    description: f.description.trim() || null,
    aboutBio: f.aboutBio.trim() || null,
    logo: f.logo || null,
    coverImage: f.coverImage || null,
    educatorProfile: empty ? null : {
      headline: f.eduHeadline.trim() || null,
      qualifications: lines(f.eduQualifications),
      experienceYears: years,
      subjects: lines(f.eduSubjects),
      institutions: lines(f.eduInstitutions),
      teachingLevels: lines(f.eduLevels),
      introVideoUrl: parseIntroVideo(f.eduVideo)?.url ?? null,
    },
  };
}

function Section({ id, icon, title, hint, children }: { id?: string; icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-bone bg-white p-5 scroll-mt-44">
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

const TABS = [
  { id: 'sp-tab-banner', label: 'Banner & logo' },
  { id: 'sp-tab-story', label: 'Story' },
  { id: 'sp-tab-teacher', label: 'Teacher' },
  { id: 'sp-tab-highlights', label: 'Highlights' },
] as const;

/** Scroll to a section/field and focus its first control. */
function goTo(anchor: string) {
  const el = document.getElementById(anchor);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const target = el.matches('input,textarea,button,select') ? el : el.querySelector<HTMLElement>('input,textarea,select,button');
  target?.focus({ preventScroll: true });
}

/**
 * "Customize your store". ONE draft: banner photo, logo, name, headline, short intro, About text, teacher profile,
 * banner style and highlight rows all save to the theme draft together and go live only on Publish (one transaction
 * on the API). The announcement bar, Sections (collections) and policies/FAQ are instant Store settings elsewhere.
 */
export function StorePageOverview() {
  const toast = useToast();
  const { store, storeId, refetch } = useStoreWorkspace();

  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [saved, setSaved] = useState<Work | null>(null);
  const [published, setPublished] = useState<Work | null>(null);
  const [cur, setCur] = useState<Work | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState<'save' | 'publish' | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => {
    if (!storeId) return;
    setLoadState('loading');
    Promise.all([apiGetStoreThemeDraft(storeId), apiGetStoreTheme(storeId).catch(() => null)])
      .then(([draftRes, liveRes]) => {
        const d = draftRes.data;
        const ident = (ib?: { layout?: string; showFollowerCount?: boolean; showProductCount?: boolean } | null): Identity => ({
          bannerLayout: ib?.layout === 'compact' ? 'compact' : 'standard',
          showFollowerCount: ib?.showFollowerCount !== false,
          showProductCount: ib?.showProductCount !== false,
        });
        const savedWork: Work = { form: formFromPage(d.storePage), identity: ident(d.identityBanner), highlights: d.storefront ?? EMPTY_HL };
        const liveIdent = liveRes?.data?.identityBanner ? ident(liveRes.data.identityBanner) : savedWork.identity;
        setSaved(savedWork);
        setCur(savedWork);
        setPublished({ form: formFromPage(d.publishedStorePage), identity: liveIdent, highlights: d.publishedStorefront ?? EMPTY_HL });
        setSavedAt(d.storePageSavedAt ? new Date(d.storePageSavedAt) : null);
        setLoadState('ready');
      })
      .catch(() => setLoadState('error'));
  }, [storeId]);
  useEffect(() => { load(); }, [load]);

  // Deep links such as /storebuilder#sp-about (Settings, setup checklist): jump to that field once the form has rendered.
  const { hash } = useLocation();
  useEffect(() => {
    if (loadState !== 'ready' || !hash.startsWith('#sp-')) return;
    const id = hash.slice(1);
    const t = setTimeout(() => goTo(id), 150);
    return () => clearTimeout(t);
  }, [loadState, hash]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);

  // Listed-product count + finance fee line (unchanged behaviour).
  const [listedCount, setListedCount] = useState(0);
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    apiGetPublicStoreProducts(storeId, { page: 1, limit: 1 })
      .then(res => { if (!cancelled) setListedCount(res.data?.pagination?.total ?? res.data?.products?.length ?? 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [storeId]);
  const [commissionPct, setCommissionPct] = useState<number | null>(null);
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    apiGetFinanceDashboard(storeId)
      .then(d => { if (!cancelled) setCommissionPct(commissionPctFromFee(d?.platformFeeBreakdown?.platformFee ?? d?.feeBreakdown?.transactionFee)); })
      .catch(() => { /* line falls back to neutral copy */ });
    return () => { cancelled = true; };
  }, [storeId]);

  const setForm = <K extends keyof Form>(key: K, value: Form[K]) => setCur(c => (c ? { ...c, form: { ...c.form, [key]: value } } : c));
  const setIdentity = <K extends keyof Identity>(key: K, value: Identity[K]) => setCur(c => (c ? { ...c, identity: { ...c.identity, [key]: value } } : c));

  const dirty = !!cur && !!saved && !same(cur, saved);
  const unpublished = !!cur && !!published && !same(cur, published);
  const { dialog: leaveDialog } = useLeaveGuard(dirty);

  // Field errors (they block Save draft / Publish).
  const f = cur?.form;
  const nameError = f && !f.name.trim() ? 'Store name is required.' : null;
  const videoError = f && f.eduVideo.trim() && !parseIntroVideo(f.eduVideo) ? VIDEO_URL_ERROR : null;
  const yearsRaw = f?.eduExperience.trim() ?? '';
  const yearsError = yearsRaw !== '' && (!Number.isInteger(Number(yearsRaw)) || Number(yearsRaw) < 0 || Number(yearsRaw) > 70) ? 'Years teaching must be a whole number from 0 to 70.' : null;
  const aboutError = f && f.aboutBio.length > 1500 ? 'Keep the About text to 1500 characters.' : null;
  const hasError = !!(nameError || videoError || yearsError || aboutError);

  const page = useMemo(() => (cur ? pageFromForm(cur.form) : null), [cur]);
  const items = useMemo(() => (page && cur ? storePageCompleteness(page, cur.highlights.featuredProductIds.length) : []), [page, cur]);
  const doneCount = items.filter(i => i.done).length;

  /** Writes only the parts that changed since the last save; each part that succeeds counts as saved even if a later one fails. */
  const saveParts = async () => {
    if (!cur || !saved || !storeId) return;
    if (!same(cur.form, saved.form)) {
      const res = await apiUpdateStorePageDraft(storeId, pageFromForm(cur.form));
      setSaved(s => (s ? { ...s, form: cur.form } : s));
      setSavedAt(res.data?.storePageSavedAt ? new Date(res.data.storePageSavedAt) : new Date());
    }
    if (!same(cur.identity, saved.identity)) {
      await apiUpdateIdentityBanner(storeId, {
        layout: cur.identity.bannerLayout, showFollowerCount: cur.identity.showFollowerCount, showProductCount: cur.identity.showProductCount,
      });
      setSaved(s => (s ? { ...s, identity: cur.identity } : s));
    }
    if (!same(cur.highlights, saved.highlights)) {
      await apiUpdateStorefrontHighlights(storeId, cur.highlights);
      setSaved(s => (s ? { ...s, highlights: cur.highlights } : s));
    }
  };

  const saveDraft = async () => {
    if (hasError) return;
    setBusy('save');
    try {
      await saveParts();
      toast.success('Draft saved. Buyers see it after you publish.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the draft.');
    } finally { setBusy(null); }
  };

  const publish = async () => {
    if (hasError || !cur) return;
    setBusy('publish');
    try {
      await saveParts();
      await apiPublishStoreTheme(storeId!);
      setSaved(cur); setPublished(cur); setSavedAt(null);
      refetch();
      toast.success('Published. Your store page is updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not publish.');
    } finally { setBusy(null); }
  };

  const discard = () => { if (saved) setCur(saved); };

  const slug = store?.slug ?? '';
  const pageUrl = slug ? getStorefrontUrl(slug) : '';
  const copyLink = () => {
    if (!pageUrl) return;
    navigator.clipboard.writeText(pageUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  const status = hasError ? { text: 'Fix the highlighted fields to save.', tone: 'text-error' }
    : dirty ? { text: 'Unsaved changes', tone: 'text-brand-orange' }
    : unpublished ? { text: savedAt ? `Draft saved ${timeAgo(savedAt.getTime(), now)} · buyers do not see it yet` : 'Draft saved · buyers do not see it yet', tone: 'text-slate' }
    : { text: 'Live: buyers see exactly this', tone: 'text-success' };

  const tabsNav = (
    <nav aria-label="Sections of this page" className="px-4 md:px-8 flex gap-1 overflow-x-auto scrollbar-none border-t border-bone">
      {TABS.map(t => (
        <button key={t.id} type="button" onClick={() => goTo(t.id)}
          className="px-3 py-2.5 min-h-[44px] text-[13px] font-semibold whitespace-nowrap text-slate hover:text-brand-royal bg-transparent border-none cursor-pointer">
          {t.label}
        </button>
      ))}
    </nav>
  );

  return (
    <div>
      <StorePageHeader
        title="Customize your store"
        subtitle="Make your Edudeen store page your own — buyers still shop and pay through Edudeen."
        tabs={loadState === 'ready' ? tabsNav : undefined}
      />
      {leaveDialog}

      {loadState === 'loading' || !cur || !saved || !published || !f || !page ? (
        loadState === 'error' ? (
          <div className="px-4 md:px-8 py-10 flex items-center gap-3 text-[13px] text-slate">
            <span>Could not load your store page.</span>
            <Button variant="outline" size="sm" onClick={load}>Try again</Button>
          </div>
        ) : (
          <div className="px-4 md:px-8 py-10 flex items-center gap-2 text-slate text-[13px]"><Loader2 size={15} className="animate-spin" /> Loading your store…</div>
        )
      ) : (
        <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
          {/* ── Settings ── */}
          <div className="flex flex-col gap-5 min-w-0">
            {/* Completeness */}
            <section aria-label="Store page completeness" className="rounded-2xl border border-bone bg-white p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="text-[15px] font-bold text-carbon m-0 font-sans">Store page completeness</h2>
                <span className="text-[13px] font-semibold text-carbon" aria-live="polite">{doneCount}/{items.length}</span>
              </div>
              <div className="h-2 rounded-full bg-mist overflow-hidden mb-3" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={doneCount} aria-label="Store page completeness">
                <div className="h-full bg-brand-royal transition-[width] duration-300" style={{ width: `${Math.round((doneCount / Math.max(items.length, 1)) * 100)}%` }} />
              </div>
              <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                {items.map(it => (
                  <li key={it.key}>
                    <button type="button" onClick={() => goTo(it.anchor)} className="w-full flex items-center gap-2 text-start py-2 min-h-[44px] bg-transparent border-none cursor-pointer">
                      {it.done ? <CircleCheck size={16} className="text-success shrink-0" /> : <Circle size={16} className="text-slate shrink-0" />}
                      <span className="min-w-0">
                        <span className={clsx('block text-[13px] font-medium', it.done ? 'text-slate line-through' : 'text-carbon')}>{it.label}</span>
                        {!it.done && <span className="block text-[12px] text-slate">{it.hint}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {storeId && (
              <Section icon={<BarChart3 size={15} />} title="How your store page is doing" hint="Visits, new followers and clicks on your highlight rows. Not affected by Publish.">
                <StoreInsightsCard storeId={storeId} />
              </Section>
            )}

            <Section id="sp-tab-banner" icon={<ImageIcon size={15} />} title="Banner & logo" hint="A wide banner (about 1600 × 400) and a square logo work best.">
              <div className="grid grid-cols-1 gap-4">
                <div id="sp-banner" className="scroll-mt-44">
                  <p className="text-[12px] font-medium text-charcoal mb-1.5">Banner photo</p>
                  <BannerUpload value={f.coverImage} onChange={url => setForm('coverImage', url)} />
                  <p className="text-[12px] text-slate mt-1">No photo? Edudeen's default gradient is used.</p>
                </div>
                <div id="sp-logo" className="scroll-mt-44">
                  <p className="text-[12px] font-medium text-charcoal mb-1.5">Logo</p>
                  <ImageUpload value={f.logo ? [f.logo] : []} onChange={urls => setForm('logo', urls[0] ?? '')} maxFiles={1} />
                </div>
              </div>
            </Section>

            {storeId && (
              <Section icon={<GalleryHorizontal size={15} />} title="Banner slides" hint="A rotating banner at the top of your store. Slides go live as soon as you save them in Marketing, not with Publish.">
                <StoreBannerSummary storeId={storeId} />
              </Section>
            )}

            <Section icon={<LayoutTemplate size={15} />} title="Banner style">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {([['standard', 'Large', 'Big banner, more presence'], ['compact', 'Compact', 'Short banner, products sooner']] as const).map(([value, label, sub]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setIdentity('bannerLayout', value)}
                    className={clsx('text-start rounded-xl border p-3 cursor-pointer transition-colors', cur.identity.bannerLayout === value ? 'border-brand-orange bg-brand-pale-orange' : 'border-bone bg-white hover:border-slate')}
                  >
                    <span className={clsx('block rounded-md mb-2', value === 'standard' ? 'h-10' : 'h-5')} style={{ background: storeCoverGradient() }} />
                    <span className="block text-[13px] font-semibold text-charcoal">{label}</span>
                    <span className="block text-[12px] text-slate">{sub}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center justify-between gap-3 text-[13px] text-charcoal">Show follower count <Toggle label="Show follower count" checked={cur.identity.showFollowerCount} onChange={v => setIdentity('showFollowerCount', v)} /></label>
                <label className="flex items-center justify-between gap-3 text-[13px] text-charcoal">Show product count <Toggle label="Show product count" checked={cur.identity.showProductCount} onChange={v => setIdentity('showProductCount', v)} /></label>
              </div>
            </Section>

            <Section id="sp-tab-story" icon={<Type size={15} />} title="Name & story" hint="Tell buyers who you are and what you teach.">
              <div className="flex flex-col gap-3.5">
                <Input label="Store name" value={f.name} maxLength={60} error={nameError ?? undefined} onChange={e => setForm('name', e.target.value)} />
                <div id="sp-headline" className="scroll-mt-44">
                  <Input label="Headline" placeholder="e.g. Joyful Quran & Arabic resources for young learners" value={f.tagline} maxLength={90} onChange={e => setForm('tagline', e.target.value)} />
                </div>
                <Textarea label="Short intro (one line on your banner)" rows={3} maxLength={600} placeholder="What your store offers, in a sentence or two." value={f.description} onChange={e => setForm('description', e.target.value)} />
                <p className="text-[12px] text-slate -mt-2 text-end">{f.description.length}/600</p>
                <div id="sp-about" className="scroll-mt-44">
                  <Textarea label="About your store (About tab)" rows={6} maxLength={1500} placeholder="Who you are, what you make and who it is for." value={f.aboutBio} error={aboutError ?? undefined} onChange={e => setForm('aboutBio', e.target.value)} />
                  <p className="text-[12px] text-slate mt-1 text-end">{f.aboutBio.length}/1500</p>
                </div>
              </div>
            </Section>

            <Section id="sp-tab-teacher" icon={<GraduationCap size={15} />} title="About you as a teacher" hint="Shown on your store and every product page. Edudeen can add a Verified Educator badge once it checks these.">
              <div id="sp-teacher" className="flex flex-col gap-3.5 scroll-mt-44">
                <Input label="One line about you" placeholder="e.g. Primary teacher, 12 years teaching Quran and Arabic" value={f.eduHeadline} maxLength={160} onChange={e => setForm('eduHeadline', e.target.value)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Textarea label="Qualifications (one per line)" rows={3} placeholder={'B.Ed, University of Karachi\nIjazah in Hafs'} value={f.eduQualifications} onChange={e => setForm('eduQualifications', e.target.value)} />
                  <Textarea label="Subjects you teach (one per line)" rows={3} placeholder={'Quran & Tajweed\nArabic'} value={f.eduSubjects} onChange={e => setForm('eduSubjects', e.target.value)} />
                  <Textarea label="Where you've taught (one per line)" rows={3} placeholder={'Beaconhouse, Lahore\nOnline tutoring'} value={f.eduInstitutions} onChange={e => setForm('eduInstitutions', e.target.value)} />
                  <Textarea label="Levels you teach (one per line)" rows={3} placeholder={'Primary\nO Level'} value={f.eduLevels} onChange={e => setForm('eduLevels', e.target.value)} />
                </div>
                <div id="sp-years" className="scroll-mt-44">
                  <Input label="Years teaching" type="number" min={0} max={70} value={f.eduExperience} error={yearsError ?? undefined} onChange={e => setForm('eduExperience', e.target.value)} className="max-w-[160px]" />
                </div>
                <Input
                  label="Intro video (optional)"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={f.eduVideo}
                  maxLength={300}
                  onChange={e => setForm('eduVideo', e.target.value)}
                  error={videoError ?? undefined}
                />
                <p className="text-[12px] text-slate -mt-2">YouTube or Vimeo link. Buyers press play to watch; nothing loads until they do.</p>
              </div>
            </Section>

            <Section id="sp-tab-highlights" icon={<Star size={15} />} title="Store highlights" hint="Rows above all your products: Featured, New arrivals and Best sellers. They go live when you publish.">
              <div id="sp-highlights" className="scroll-mt-44">
                {storeId && <StoreHighlightsEditor storeId={storeId} value={cur.highlights} onChange={h => setCur(c => (c ? { ...c, highlights: h } : c))} />}
              </div>
              {storeId && (
                <p className="text-[12.5px] text-slate mt-3">
                  Store banners and pinned products are managed in{' '}
                  <Link to={`/store/${storeId}/marketing?group=storefront`} className="font-semibold text-brand-royal hover:underline">Marketing → Storefront</Link>.
                </p>
              )}
            </Section>

            <Section icon={<Layers size={15} />} title="Sections" hint="Chips above your products (they are your Collections). Order here = order on your store page. Changes apply at once, not with Publish.">
              {storeId && <StoreSectionsCard storeId={storeId} categoryId={store?.categoryId} currency={(store as { baseCurrency?: string } | null)?.baseCurrency} />}
            </Section>

            <Section icon={<Megaphone size={15} />} title="Store announcement">
              <p className="text-[12.5px] text-slate">Your announcement bar goes live as soon as you save it (it has no draft).{' '}
                {storeId && <Link to={`/store/${storeId}/marketing?group=storefront&tab=announcement`} className="font-semibold text-brand-royal hover:underline">Edit announcement bar</Link>}
              </p>
            </Section>
          </div>

          {/* ── Preview (lg+: beside the form; below lg: the Preview button opens a full-screen sheet) ── */}
          <aside className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-[170px]">
            {store && storeId && (
              <StorePagePreview storeId={storeId} store={store} page={page} identity={{ layout: cur.identity.bannerLayout, showFollowerCount: cur.identity.showFollowerCount, showProductCount: cur.identity.showProductCount }}
                highlights={cur.highlights} listedCount={listedCount} scrollable />
            )}
            <LinkCard pageUrl={pageUrl} copied={copied} onCopy={copyLink} commissionPct={commissionPct} />
          </aside>
          <div className="lg:hidden">
            <LinkCard pageUrl={pageUrl} copied={copied} onCopy={copyLink} commissionPct={commissionPct} />
          </div>
        </div>
      )}

      {/* ── ONE sticky bar: Discard / Save draft / Publish + status ── */}
      {loadState === 'ready' && cur && (
        <div data-chat-avoid className="sticky bottom-3 z-30 mx-3 md:mx-8 mb-3 rounded-2xl border border-bone bg-white shadow-lg px-3 py-2.5 flex flex-wrap items-center gap-2">
          <p role="status" className={clsx('text-[12.5px] font-semibold me-auto min-w-0 basis-full sm:basis-auto', status.tone)}>{status.text}</p>
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setPreviewOpen(true)}>
            <Eye size={13} className="inline align-middle me-1" /> Preview
          </Button>
          <Button variant="outline" size="sm" disabled={!slug} onClick={() => window.open(getStorePagePath(slug), '_blank', 'noopener')}>
            <ExternalLink size={13} className="inline align-middle me-1" /> View store
          </Button>
          <Button variant="outline" size="sm" disabled={!dirty || !!busy} onClick={discard}>Discard</Button>
          <Button variant="outline" size="sm" disabled={!dirty || !!busy || hasError} onClick={saveDraft}>
            {busy === 'save' && <Loader2 size={13} className="inline align-middle me-1 animate-spin" />} Save draft
          </Button>
          <Button variant="primary" size="sm" disabled={(!unpublished && !dirty) || !!busy || hasError} onClick={publish}>
            {busy === 'publish' && <Loader2 size={13} className="inline align-middle me-1 animate-spin" />} Publish
          </Button>
        </div>
      )}

      {previewOpen && cur && page && store && storeId && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-cream flex flex-col p-3" role="dialog" aria-modal="true" aria-label="Store page preview">
          <StorePagePreview storeId={storeId} store={store} page={page} identity={{ layout: cur.identity.bannerLayout, showFollowerCount: cur.identity.showFollowerCount, showProductCount: cur.identity.showProductCount }}
            highlights={cur.highlights} listedCount={listedCount} onClose={() => setPreviewOpen(false)} />
        </div>
      )}
    </div>
  );
}

function LinkCard({ pageUrl, copied, onCopy, commissionPct }: { pageUrl: string; copied: boolean; onCopy: () => void; commissionPct: number | null }) {
  return (
    <div className="rounded-2xl border border-bone bg-white p-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate mb-1.5">Your store link</p>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[13px] text-carbon font-semibold truncate">{pageUrl.replace(/^https?:\/\//, '') || '…'}</span>
        <button onClick={onCopy} disabled={!pageUrl} aria-label="Copy store link" className="shrink-0 size-7 rounded-md border border-bone bg-white flex items-center justify-center cursor-pointer hover:bg-cream disabled:opacity-50">
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} className="text-slate" />}
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-1.5 text-[12px] text-slate">
        <span className="flex items-center gap-1.5"><ShoppingCart size={13} className="text-brand-orange" /> Buyers check out through Edudeen</span>
        <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-brand-orange" /> {commissionPct ? `${formatPct(commissionPct)} platform fee — earnings credited to your wallet` : 'Earnings credited to your wallet after the platform fee'}</span>
      </div>
    </div>
  );
}
