import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useBlocker } from 'react-router-dom';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import type { MarketplaceProduct } from '@/api/services/marketplace';
import { ResourceCard } from '@/components/comman/marketplace/ResourceCard';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * Guided layout shared by the seller Add + Edit product pages: step rail, step panels (kept mounted, only hidden), Back/Next,
 * sticky action bar, live buyer-card preview, unsaved-changes guard and a per-store localStorage draft.
 */

export const WIZARD_STEPS = [
  { key: 'basics',   title: 'Type & basics',        short: 'Basics',   hint: 'What you are selling, its name and description.' },
  { key: 'files',    title: 'Photos & files',       short: 'Photos',   hint: 'Pictures buyers see, and the files they receive.' },
  { key: 'price',    title: 'Price & stock',        short: 'Price',    hint: 'What it costs and how many you have.' },
  { key: 'category', title: 'Category & details',   short: 'Category', hint: 'Where it appears and who it is for.' },
  { key: 'offers',   title: 'Offers & earnings',    short: 'Offers',   hint: 'Optional member discount or platform sale.' },
  { key: 'review',   title: 'Review & publish',     short: 'Publish',  hint: 'Check everything, then publish or save a draft.' },
] as const;
export const LAST_STEP = WIZARD_STEPS.length - 1;

export interface WizardIssue {
  step: number;
  message: string;
  /** id of the field (or wrapper) to focus */
  fieldId?: string;
  /** only blocks publishing / scheduling, not a draft or moving to the next step */
  publishOnly?: boolean;
}
export type StepState = 'empty' | 'done' | 'attention';

function focusField(id?: string) {
  window.setTimeout(() => {
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    const focusable = el.matches('input,textarea,select,button,[tabindex]') ? el : el.querySelector<HTMLElement>('input,textarea,select,button,[tabindex]');
    focusable?.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 60);
}

export function useWizard(issues: WizardIssue[], verb: 'Add' | 'Edit', initialVisited: number[] = [0]) {
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState<number[]>(initialVisited);
  const [attempted, setAttempted] = useState(false);
  const [blockedStep, setBlockedStep] = useState<number | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  usePageTitle(`${verb} product - step ${step + 1} of ${WIZARD_STEPS.length}`);

  const go = useCallback((to: number, fieldId?: string) => {
    setStep(to);
    setVisited(v => (v.includes(to) ? v : [...v, to]));
    setBlockedStep(null);
    if (fieldId) focusField(fieldId);
    else topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  const markAllVisited = useCallback(() => setVisited(WIZARD_STEPS.map((_, i) => i)), []);
  const visitedKey = visited.join(',');

  const stepIssues = (i: number, forNext = false) => issues.filter(x => x.step === i && !(forNext && x.publishOnly));

  const next = () => {
    const blocking = stepIssues(step, true);
    if (blocking.length) {
      setBlockedStep(step);
      focusField(blocking[0].fieldId);
      return;
    }
    go(Math.min(step + 1, LAST_STEP));
  };
  const back = () => go(Math.max(step - 1, 0));

  const statusOf = (i: number): StepState => {
    const has = issues.some(x => x.step === i);
    if (has) return attempted || (visited.includes(i) && i !== step) ? 'attention' : 'empty';
    return visited.includes(i) ? 'done' : 'empty';
  };

  return { step, go, next, back, attempted, setAttempted, statusOf, stepIssues, blockedStep, markAllVisited, visitedKey, topRef };
}

// ── Step rail ────────────────────────────────────────────────────────────────
export function StepRail({ step, statusOf, onGo }: { step: number; statusOf: (i: number) => StepState; onGo: (i: number) => void }) {
  return (
    <nav aria-label="Product steps" className="lg:sticky lg:top-[152px] max-lg:sticky max-lg:top-[57px] max-lg:z-[9] max-lg:bg-cream max-lg:-mx-4 max-lg:px-4 max-lg:py-2 max-lg:border-b max-lg:border-bone">
      <ol className="flex lg:flex-col gap-2 lg:gap-1 overflow-x-auto lg:overflow-visible list-none p-0 m-0 pb-1 lg:pb-0" data-no-edge-scroll>
        {WIZARD_STEPS.map((s, i) => {
          const state = statusOf(i);
          const current = i === step;
          return (
            <li key={s.key} className="shrink-0 lg:shrink">
              <button type="button" onClick={() => onGo(i)} aria-current={current ? 'step' : undefined}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-start border cursor-pointer transition-colors ${current ? 'bg-white border-brand-royal/40 shadow-sm' : 'bg-transparent border-transparent hover:bg-white'}`}>
                <span className={`relative size-7 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold border ${
                  current ? 'bg-brand-royal border-brand-royal text-white'
                  : state === 'done' ? 'bg-success border-success text-white'
                  : state === 'attention' ? 'bg-white border-error text-error'
                  : 'bg-white border-border-hover text-slate'}`}>
                  {state === 'done' && !current ? <Check size={14} strokeWidth={3} /> : state === 'attention' && !current ? '!' : i + 1}
                  {state === 'attention' && <span className="absolute -top-0.5 -end-0.5 size-2.5 rounded-full bg-error border-2 border-white" aria-hidden />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[13px] font-bold whitespace-nowrap lg:whitespace-normal ${current ? 'text-carbon' : 'text-graphite'}`}>
                    <span className="lg:hidden">{s.short}</span><span className="hidden lg:inline">{s.title}</span>
                  </span>
                  <span className={`hidden lg:block text-[12px] ${state === 'attention' ? 'text-error' : 'text-slate'}`}>
                    {state === 'attention' ? 'Needs attention' : state === 'done' ? 'Done' : current ? 'In progress' : 'Not started'}
                  </span>
                  {state === 'attention' && <span className="sr-only lg:hidden">Needs attention</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** One step's content. Hidden (not unmounted) while inactive so every field keeps its state and uploads. */
export function StepPanel({ active, children }: { active: boolean; children: ReactNode }) {
  return <div hidden={!active} className="flex flex-col gap-5 min-w-0">{children}</div>;
}

export function IssueLinks({ issues, onGo, title }: { issues: WizardIssue[]; onGo: (step: number, fieldId?: string) => void; title: string }) {
  if (!issues.length) return null;
  return (
    <div role="alert" className="rounded-xl border border-error-border bg-error-bg px-4 py-3">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-error mb-1.5"><AlertCircle size={15} /> {title}</p>
      <ul className="list-none p-0 m-0 flex flex-col gap-1">
        {issues.map((x, i) => (
          <li key={i}>
            <button type="button" onClick={() => onGo(x.step, x.fieldId)}
              className="bg-transparent border-none p-0 cursor-pointer text-[13px] text-error underline underline-offset-2 text-start">
              {x.message}
            </button>
            <span className="text-[12px] text-slate"> — step {x.step + 1}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WizardNav({ step, onBack, onNext }: { step: number; onBack: () => void; onNext: () => void }) {
  if (step === LAST_STEP) {
    return step > 0 ? (
      <div className="flex" data-wiz-nav>
        <button type="button" onClick={onBack} className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-[14px] font-bold text-graphite bg-white border border-bone cursor-pointer hover:bg-cream"><ChevronLeft size={16} /> Back</button>
      </div>
    ) : null;
  }
  return (
    <div className="flex items-center justify-between gap-3" data-wiz-nav>
      {step > 0
        ? <button type="button" onClick={onBack} className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-[14px] font-bold text-graphite bg-white border border-bone cursor-pointer hover:bg-cream"><ChevronLeft size={16} /> Back</button>
        : <span />}
      <button type="button" onClick={onNext} className="flex items-center gap-1 px-5 py-2.5 rounded-lg text-[14px] font-bold text-white bg-brand-royal border-none cursor-pointer hover:opacity-90">
        Next: {WIZARD_STEPS[step + 1].title} <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ── Sticky action bar ────────────────────────────────────────────────────────
export function timeAgo(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

export function ActionBar({ saving, primaryLabel, onPrimary, onDraft, onCancel, saveNote, missing, onShowMissing }: {
  saving: boolean; primaryLabel: string; onPrimary: () => void; onDraft?: () => void; onCancel?: () => void;
  saveNote: string; missing: number; onShowMissing: () => void;
}) {
  return (
    <div className="sticky bottom-[56px] lg:bottom-0 z-10 bg-white/95 backdrop-blur-md border-t border-bone px-4 md:px-8 py-2.5">
      <div className="mx-auto max-w-[1700px] flex items-center gap-2 sm:gap-3">
        <div className="min-w-0 flex-1 text-[12px] text-slate leading-snug">
          <span className="block truncate" role="status">{saveNote}</span>
          {missing > 0 && (
            <button type="button" onClick={onShowMissing} className="bg-transparent border-none p-0 cursor-pointer text-error font-bold underline underline-offset-2 text-[12px]">
              {missing} required {missing === 1 ? 'thing' : 'things'} missing
            </button>
          )}
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={saving} className="hidden sm:block px-4 py-[10px] rounded-lg text-[14px] font-bold text-slate bg-transparent border-none cursor-pointer hover:text-carbon disabled:opacity-60">Cancel</button>
        )}
        {onDraft && (
          <button type="button" onClick={onDraft} disabled={saving}
            className="px-3 sm:px-4 py-[10px] rounded-lg text-[14px] font-bold text-brand-orange bg-white border border-bone cursor-pointer hover:bg-cream transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap">
            Save as draft
          </button>
        )}
        <button type="button" onClick={onPrimary} disabled={saving}
          className={`px-4 sm:px-5 py-[10px] flex items-center justify-center gap-1.5 rounded-lg text-[14px] font-bold border-none transition-colors whitespace-nowrap ${saving ? 'bg-bone text-slate cursor-not-allowed' : 'bg-brand-orange text-white hover:bg-brand-deep-orange cursor-pointer'}`}>
          {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : primaryLabel}
        </button>
      </div>
    </div>
  );
}

// ── Live preview ─────────────────────────────────────────────────────────────
export interface PreviewData {
  name: string; images: string[]; price: string; compareAtPrice: string; currency?: string | null;
  productType: 'physical' | 'digital' | 'educational'; deliveryFormat?: 'download' | 'course' | 'live_class';
  premiumPercent: number; educationLevel?: string | null; customLevel?: string | null;
  ageMin?: string; ageMax?: string; storeName?: string | null;
}

function PreviewCard({ d }: { d: PreviewData }) {
  const product = useMemo(() => {
    const price = Number(d.price) || 0;
    const cmp = Number(d.compareAtPrice) || 0;
    return {
      _id: 'preview', slug: 'preview', name: d.name.trim() || 'Your product title',
      images: d.images, productType: d.productType, type: d.productType === 'physical' ? 'physical' : 'digital',
      deliveryFormat: d.productType === 'physical' ? undefined : d.deliveryFormat,
      educationLevel: d.productType === 'educational' ? d.educationLevel || null : null, customLevel: d.customLevel ?? null,
      ageMin: d.ageMin ? Number(d.ageMin) : null, ageMax: d.ageMax ? Number(d.ageMax) : null,
      storeName: d.storeName ?? null, premiumPercent: d.premiumPercent > 0 ? d.premiumPercent : undefined,
      variants: [{ _id: 'preview', isDefault: true, price, compareAtPrice: cmp > price ? cmp : null, currency: d.currency ?? undefined }],
      averageRating: 0, totalRatings: 0, status: 'active', isDelete: false,
    } as unknown as MarketplaceProduct;
  }, [d]);
  return (
    <div className="pointer-events-none select-none max-w-[260px] mx-auto" aria-hidden inert>
      <ResourceCard product={product} onClick={() => {}} />
    </div>
  );
}

/** Desktop (2xl): sticky right column. Smaller screens: a collapsible card above the step. */
export function ProductPreview({ data, variant }: { data: PreviewData; variant: 'column' | 'inline' }) {
  const [open, setOpen] = useState(false);
  const note = data.premiumPercent > 0 ? `Premium members will see ${data.premiumPercent}% off.` : null;
  const body = (
    <>
      <PreviewCard d={data} />
      {note && <p className="text-[12px] text-slate text-center mt-3">{note}</p>}
      <p className="text-[12px] text-slate text-center mt-2">This is how buyers will see your product in search and on shelves.</p>
    </>
  );
  if (variant === 'column') {
    return (
      <aside aria-label="Live preview" className="hidden 2xl:block 2xl:sticky 2xl:top-[152px] bg-white border border-bone rounded-xl p-4">
        <p className="text-[12px] font-bold text-brand-royal uppercase tracking-[0.15em] mb-3">Live preview</p>
        {body}
      </aside>
    );
  }
  return (
    <div className="2xl:hidden bg-white border border-bone rounded-xl">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 bg-transparent border-none cursor-pointer text-[13px] font-bold text-carbon">
        <span>Live preview <span className="font-normal text-slate">— how buyers see it</span></span>
        <ChevronDown size={16} className={`text-slate transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div hidden={!open} className="px-4 pb-4">{body}</div>
    </div>
  );
}

// ── Review rows ──────────────────────────────────────────────────────────────
export function SummaryRows({ rows }: { rows: { label: string; value: string; step: number; ok?: boolean }[]; }) {
  return (
    <dl className="m-0 divide-y divide-bone">
      {rows.map(r => (
        <div key={r.label} className="flex items-start justify-between gap-4 py-2 text-[13px]">
          <dt className="text-slate shrink-0">{r.label}</dt>
          <dd className={`m-0 text-end min-w-0 break-words ${r.ok === false ? 'text-error font-bold' : 'text-carbon'}`}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── Draft autosave (localStorage, per store; never publishes) ───────────────
export function useDraftAutosave<T>(key: string, snapshot: T, hasContent: boolean, enabled: boolean) {
  const [restorable, setRestorable] = useState<{ data: T; savedAt: number } | null>(() => {
    if (!enabled) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { data: T; savedAt: number }) : null;
    } catch { return null; }
  });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const stopped = useRef(false);

  useEffect(() => {
    if (!enabled || restorable || stopped.current || !hasContent) return;
    const t = window.setTimeout(() => {
      if (stopped.current) return;
      try { const at = Date.now(); localStorage.setItem(key, JSON.stringify({ data: snapshot, savedAt: at })); setSavedAt(at); } catch { /* storage full or blocked */ }
    }, 800);
    return () => window.clearTimeout(t);
  }, [key, snapshot, hasContent, enabled, restorable]);

  const dismiss = () => { try { localStorage.removeItem(key); } catch { /* ignore */ } setRestorable(null); };
  const accept = () => setRestorable(null);
  const clear = () => { stopped.current = true; try { localStorage.removeItem(key); } catch { /* ignore */ } };
  return { restorable, savedAt, dismiss, accept, clear };
}

// ── Leave guard ──────────────────────────────────────────────────────────────
export function useLeaveGuard(dirty: boolean) {
  const allow = useRef(false);
  // Stable function (reads the latest `dirty` from a ref) so the router isn't re-registered on every keystroke.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
      dirtyRef.current && !allow.current && currentLocation.pathname !== nextLocation.pathname,
    [],
  );
  const blocker = useBlocker(shouldBlock);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { if (!allow.current) e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
  const dialog = blocker.state === 'blocked' ? (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Unsaved changes">
      <div className="bg-white rounded-xl p-5 max-w-[380px] w-full shadow-xl">
        <h2 className="font-serif font-normal text-[20px] text-carbon m-0 mb-1.5">Leave without saving?</h2>
        <p className="text-[13px] text-slate m-0 mb-4">You have changes that are not saved to your store yet.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => blocker.reset()} className="px-4 py-2 rounded-lg text-[14px] font-bold bg-brand-royal text-white border-none cursor-pointer">Keep editing</button>
          <button type="button" onClick={() => blocker.proceed()} className="px-4 py-2 rounded-lg text-[14px] font-bold text-graphite bg-white border border-bone cursor-pointer">Leave</button>
        </div>
      </div>
    </div>
  ) : null;
  return { allow, dialog };
}

/** Marks the form dirty on any real edit inside it (inputs, toggles, uploads) but not on Back/Next/rail clicks. */
export function dirtyCapture(setDirty: () => void) {
  const mark = (e: { target: EventTarget }) => {
    const el = e.target as HTMLElement | null;
    if (el?.closest?.('[data-wiz-nav]')) return;
    setDirty();
  };
  const markClick = (e: { target: EventTarget }) => {
    const el = e.target as HTMLElement | null;
    if (el?.closest?.('[role="switch"],[role="radio"],button[aria-label^="Remove"]')) mark(e);
  };
  // Bubble phase on purpose: a capture-phase state update re-renders before the field's own onChange runs, and React then
  // restores the old DOM value (the first keystroke would be lost).
  return { onChange: mark, onClick: markClick };
}
