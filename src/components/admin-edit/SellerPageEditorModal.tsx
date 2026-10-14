import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { Input, Textarea, Select } from '@/components/comman/ui/Input';
import { Toggle } from '@/components/comman/ui/Toggle';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import {
  DEFAULT_SELLER_FAQS, DEFAULT_SELLER_FEATURE_ROWS, DEFAULT_SELLER_FINAL_CTA, DEFAULT_SELLER_HERO, DEFAULT_SELLER_STATS,
  DEFAULT_SELLER_SUPPORT, DEFAULT_SELLER_WHO_SELLS, DEFAULT_SELLER_HEADINGS, FROM_PRICE_TOKEN, SELLER_PAGE_SECTIONS, effectiveSellerPage,
} from '@/components/seller-page/sellerPageDefaults';
import { SELLER_PAGE_ICON_KEYS } from '@/components/seller-page/sellerPageIcons';
import type {
  SellerPageCard, SellerPageFeatureRow, SellerPageHeadings, SellerPageMock, SellerPageSectionKey, SellerPageSupportCard,
} from '@/api/services/publicPlatformConfig';
import { apiUpdateSellerPage } from '@/api/services/config/adminConfig';
import { apiUploadPublicFile } from '@/api/upload';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { useReauth } from '@/contexts/reauthCtx';
import { inlineEditConfig } from '@/api/services/reauth';

const LIMITS = { steps: 8, featureRows: 8, benefits: 9, whoSells: 9, supportCards: 6, faqs: 20, bullets: 6 };
const TITLES: Record<SellerPageSectionKey, string> = {
  hero: 'Edit hero', stats: 'Edit live numbers', plans: 'Edit plans heading', steps: 'Edit how-it-works steps', featureRows: 'Edit feature rows',
  benefits: 'Edit benefit cards', whoSells: 'Edit who sells', supportCards: 'Edit support cards', faqs: 'Edit FAQs', finalCta: 'Edit closing banner',
};
/** Section -> key of its heading inside `headings` (sections without a heading are absent). */
const HEADING_OF: Partial<Record<SellerPageSectionKey, keyof SellerPageHeadings>> = {
  plans: 'plans', steps: 'steps', featureRows: 'featureRows', benefits: 'benefits', whoSells: 'whoSells', supportCards: 'support', faqs: 'faqs',
};
const DEFAULT_CONTENT: Partial<Record<SellerPageSectionKey, unknown>> = {
  hero: DEFAULT_SELLER_HERO, stats: DEFAULT_SELLER_STATS, steps: [], featureRows: DEFAULT_SELLER_FEATURE_ROWS, benefits: [],
  whoSells: DEFAULT_SELLER_WHO_SELLS, supportCards: DEFAULT_SELLER_SUPPORT, faqs: DEFAULT_SELLER_FAQS, finalCta: DEFAULT_SELLER_FINAL_CTA,
};
const json = (v: unknown) => JSON.stringify(v);
const isHttps = (s: string) => !s || /^https?:\/\/\S+$/i.test(s);

/** Inline-edit modal for ONE section of the /become-a-seller page (asks the admin password before saving). */
export default function SellerPageEditorModal({ section, onClose }: { section: SellerPageSectionKey; onClose: () => void }) {
  const { config, loading } = usePublicPlatformConfig();
  const [footer, setFooter] = useState<ReactNode>(null);
  return (
    <Modal mobileSheet width={680} title={TITLES[section]} onClose={onClose} footer={footer}>
      {config
        ? <SellerPageSectionForm section={section} withReauth onDone={onClose} renderFooter={setFooter} onCancel={onClose} />
        : loading
          ? <div className="flex flex-col gap-3"><SkeletonBox className="h-[44px] w-full" /><SkeletonBox className="h-[44px] w-full" /><SkeletonBox className="h-[88px] w-full" /></div>
          : <p className="text-[13px] text-error" role="alert">Could not load the current content, so editing is disabled to avoid overwriting it. Close this and try again.</p>}
    </Modal>
  );
}

/**
 * The editing form for one section. Starts from exactly what the page shows (stored value, else built-in text).
 * Only what changed is sent: the section itself (null = back to default when it equals the built-in text),
 * the heading and the show/hide switch. `withReauth` = inline edit on the public page (password confirm);
 * the admin Platform Config screen passes false.
 */
export function SellerPageSectionForm({ section, withReauth, onDone, onCancel, renderFooter }: {
  section: SellerPageSectionKey; withReauth: boolean; onDone?: () => void; onCancel?: () => void;
  /** Modal mode: the Update/Cancel buttons are handed to the modal footer instead of being drawn below the form. */
  renderFooter?: (node: ReactNode) => void;
}) {
  const { config, refresh } = usePublicPlatformConfig();
  const { confirm } = useReauth();
  const stored = config?.sellerPage;
  const eff = useMemo(() => effectiveSellerPage(stored), [stored]);
  const headingKey = HEADING_OF[section];
  const initContent = useMemo<unknown>(() => (section in DEFAULT_CONTENT ? (eff as unknown as Record<string, unknown>)[section] : null), [eff, section]);

  const [content, setContent] = useState<any>(() => JSON.parse(json(initContent)));
  const [heading, setHeading] = useState(() => (headingKey ? eff.headings[headingKey] : ''));
  const [heading2, setHeading2] = useState(() => eff.headings.plansHighlight);
  const [visible, setVisible] = useState(eff.visible[section]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const upload = async (file: File | undefined, apply: (url: string) => void) => {
    if (!file) return;
    setError(''); setUploading(true);
    try { apply((await apiUploadPublicFile(file)).data.url); } // only saved on Update
    catch (err) { setError(err instanceof Error ? err.message : 'Could not upload the image.'); }
    finally { setUploading(false); }
  };

  /** Remove rows the API would drop anyway, so the "changed?" comparison is honest. */
  const clean = (c: any): any => {
    switch (section) {
      case 'steps': case 'benefits': case 'whoSells': return (c as SellerPageCard[]).filter(x => x.title.trim());
      case 'featureRows': return (c as SellerPageFeatureRow[]).filter(x => x.title.trim()).map(x => ({ ...x, bullets: x.bullets.filter(b => b.trim()) }));
      case 'supportCards': return (c as SellerPageSupportCard[]).filter(x => x.title.trim());
      case 'faqs': return (c as { q: string; a: string }[]).filter(x => x.q.trim() && x.a.trim());
      default: return c;
    }
  };

  const save = async () => {
    setError('');
    const body: Record<string, unknown> = {};
    if (section in DEFAULT_CONTENT) {
      const next = clean(content);
      const bad = section === 'hero' ? !isHttps(next.imageUrl)
        : section === 'featureRows' ? next.some((r: SellerPageFeatureRow) => !isHttps(r.imageUrl))
        : section === 'supportCards' ? next.some((r: SellerPageSupportCard) => r.ctaLink && !/^(\/(?!\/)\S*|https?:\/\/\S+)$/i.test(r.ctaLink))
        : false;
      if (bad) { setError('Check your links: images need a full https:// link, and buttons need a link starting with / or https://.'); return; }
      if (json(next) !== json(initContent)) body[section] = json(next) === json(DEFAULT_CONTENT[section]) ? null : next;
    }
    if (headingKey && (heading !== eff.headings[headingKey] || (section === 'plans' && heading2 !== eff.headings.plansHighlight))) {
      const h = { ...eff.headings, [headingKey]: heading.trim() || DEFAULT_SELLER_HEADINGS[headingKey] };
      if (section === 'plans') h.plansHighlight = heading2.trim() || DEFAULT_SELLER_HEADINGS.plansHighlight;
      body.headings = h;
    }
    if (visible !== eff.visible[section]) body.visible = { [section]: visible };
    if (!Object.keys(body).length) { onDone?.(); return; } // nothing changed

    let cfg;
    if (withReauth) {
      const token = await confirm();
      if (!token) return; // not confirmed: nothing is changed
      cfg = inlineEditConfig(token);
    }
    setBusy(true);
    try {
      await apiUpdateSellerPage(body, cfg);
      refresh();
      setDone(true);
      onDone?.();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save the change.'); }
    finally { setBusy(false); }
  };

  const resetToDefault = () => {
    if (section in DEFAULT_CONTENT) setContent(JSON.parse(json(DEFAULT_CONTENT[section])));
    if (headingKey) { setHeading(DEFAULT_SELLER_HEADINGS[headingKey]); setHeading2(DEFAULT_SELLER_HEADINGS.plansHighlight); }
    setVisible(true); setDone(false);
  };

  const actions = (
    <>
      <Button variant="ghost" onClick={resetToDefault}>Reset to default</Button>
      {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
      <Button onClick={save} loading={busy} disabled={uploading}>Update</Button>
    </>
  );
  // Hand the buttons to the modal footer (re-sent on every render so they always see fresh state).
  useFooter(renderFooter, actions, [content, heading, heading2, visible, busy, uploading]);

  const setItem = <T,>(arr: T[], i: number, patch: Partial<T>) => setContent(arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const imageField = (value: string, onChange: (v: string) => void, label: string) => (
    <div>
      <Input label={label} value={value} onChange={e => onChange(e.target.value)} maxLength={500} placeholder="https://..." />
      <div className="flex items-center gap-3 mt-1.5">
        <label className="inline-block text-[12px] font-semibold text-brand-orange cursor-pointer">
          {uploading ? 'Uploading...' : 'Upload an image'}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => { void upload(e.target.files?.[0], onChange); e.target.value = ''; }} />
        </label>
        {value && <button type="button" className="text-[12px] text-slate underline cursor-pointer bg-transparent border-none" onClick={() => onChange('')}>Remove image</button>}
      </div>
      {value && <img src={value} alt="" className="mt-2 max-h-[120px] rounded-lg border border-bone" />}
    </div>
  );
  const cardFields = (x: SellerPageCard, i: number, arr: SellerPageCard[]) => (
    <>
      <Input label="Title" value={x.title} maxLength={120} onChange={e => setItem(arr, i, { title: e.target.value })} />
      <Textarea label="Text" rows={2} value={x.text} maxLength={600} onChange={e => setItem(arr, i, { text: e.target.value })} />
      <Select label="Icon" value={x.icon} onChange={e => setItem(arr, i, { icon: e.target.value as SellerPageCard['icon'] })}>
        {SELLER_PAGE_ICON_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
      </Select>
    </>
  );
  const blankCard: SellerPageCard = { title: '', text: '', icon: 'star' };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-slate">
        This is what the page shows now - change only what you want.{withReauth && ' You will be asked for your password before it goes live.'} Use Reset to default to go back to the built-in text.
      </p>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-bone px-3 py-2">
        <span className="text-[13px] text-carbon font-medium">Show this section to visitors</span>
        <Toggle checked={visible} onChange={setVisible} label={`Show ${SELLER_PAGE_SECTIONS.find(s => s.key === section)?.label ?? 'section'}`} />
      </div>
      {headingKey && (
        <div className={section === 'plans' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
          <Input label="Section heading" value={heading} maxLength={200} onChange={e => setHeading(e.target.value)} />
          {section === 'plans' && <Input label="Coloured end of the heading" value={heading2} maxLength={200} onChange={e => setHeading2(e.target.value)} />}
        </div>
      )}

      {section === 'hero' && (<>
        <Input label="Small heading (optional)" value={content.eyebrow} maxLength={120} onChange={e => setContent({ ...content, eyebrow: e.target.value })} />
        <Input label="Headline" value={content.title} maxLength={200} onChange={e => setContent({ ...content, title: e.target.value })} />
        <Input label="Headline (coloured second part, optional)" value={content.highlight} maxLength={200} onChange={e => setContent({ ...content, highlight: e.target.value })} />
        <Textarea label="Paragraph" rows={3} value={content.text} maxLength={600} onChange={e => setContent({ ...content, text: e.target.value })} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Main button" value={content.primaryCta} maxLength={60} onChange={e => setContent({ ...content, primaryCta: e.target.value })} />
          <Input label="Second button (optional, jumps to Benefits)" value={content.secondaryCta} maxLength={60} onChange={e => setContent({ ...content, secondaryCta: e.target.value })} />
        </div>
        {imageField(content.imageUrl, v => setContent({ ...content, imageUrl: v }), 'Hero image (empty = the built-in category tiles)')}
      </>)}

      {section === 'stats' && (<>
        <p className="text-[12px] text-slate">The numbers themselves are live from the marketplace. Only the labels are editable.</p>
        <Input label="Learners and parents label" value={content.buyers} maxLength={100} onChange={e => setContent({ ...content, buyers: e.target.value })} />
        <Input label="Stores label" value={content.stores} maxLength={100} onChange={e => setContent({ ...content, stores: e.target.value })} />
        <Input label="Sales label" value={content.sales} maxLength={100} onChange={e => setContent({ ...content, sales: e.target.value })} />
      </>)}

      {section === 'plans' && <p className="text-[12px] text-slate">Plans, prices and features come from Admin -&gt; Platform Plans and cannot be edited here.</p>}

      {(section === 'steps' || section === 'benefits' || section === 'whoSells') && (
        <ListEditor<SellerPageCard> items={content} max={LIMITS[section]} onChange={setContent} blank={blankCard} noun="card"
          render={(x, i) => cardFields(x, i, content)} />
      )}

      {section === 'featureRows' && (
        <ListEditor<SellerPageFeatureRow> items={content} max={LIMITS.featureRows} onChange={setContent} noun="row"
          blank={{ title: '', text: '', imageUrl: '', mockKind: 'none', bullets: [] }}
          render={(x, i) => (<>
            <Input label="Title" value={x.title} maxLength={120} onChange={e => setItem<SellerPageFeatureRow>(content, i, { title: e.target.value })} />
            <Textarea label="Text" rows={3} value={x.text} maxLength={600} onChange={e => setItem<SellerPageFeatureRow>(content, i, { text: e.target.value })} />
            <Textarea label={`Bullet points (one per line, up to ${LIMITS.bullets})`} rows={3} value={x.bullets.join('\n')} onChange={e => setItem<SellerPageFeatureRow>(content, i, { bullets: e.target.value.split('\n').slice(0, LIMITS.bullets) })} />
            <Select label="Built-in picture (used when no image is uploaded)" value={x.mockKind} onChange={e => setItem<SellerPageFeatureRow>(content, i, { mockKind: e.target.value as SellerPageMock })}>
              <option value="store">Store preview</option>
              <option value="sales">Sales dashboard preview</option>
              <option value="followers">Follower note preview</option>
              <option value="none">None (text only)</option>
            </Select>
            {imageField(x.imageUrl, v => setItem<SellerPageFeatureRow>(content, i, { imageUrl: v }), 'Your own screenshot / image (replaces the built-in picture)')}
          </>)} />
      )}

      {section === 'supportCards' && (
        <ListEditor<SellerPageSupportCard> items={content} max={LIMITS.supportCards} onChange={setContent} noun="card"
          blank={{ title: '', text: '', ctaLabel: '', ctaLink: '' }}
          render={(x, i) => (<>
            <Input label="Title" value={x.title} maxLength={120} onChange={e => setItem<SellerPageSupportCard>(content, i, { title: e.target.value })} />
            <Textarea label="Text" rows={2} value={x.text} maxLength={400} onChange={e => setItem<SellerPageSupportCard>(content, i, { text: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Link (/help or https://...)" value={x.ctaLink} maxLength={500} onChange={e => setItem<SellerPageSupportCard>(content, i, { ctaLink: e.target.value })} />
              <Input label="Link label (optional)" value={x.ctaLabel} maxLength={60} onChange={e => setItem<SellerPageSupportCard>(content, i, { ctaLabel: e.target.value })} />
            </div>
          </>)} />
      )}

      {section === 'faqs' && (<>
        <p className="text-[12px] text-slate">Tip: write {FROM_PRICE_TOKEN} in an answer to show &quot;starting at $X a month&quot; from the live plan prices.</p>
        <ListEditor<{ q: string; a: string }> items={content} max={LIMITS.faqs} onChange={setContent} noun="question" blank={{ q: '', a: '' }}
          render={(x, i) => (<>
            <Input label="Question" value={x.q} maxLength={200} onChange={e => setItem(content, i, { q: e.target.value })} />
            <Textarea label="Answer" rows={3} value={x.a} maxLength={1500} onChange={e => setItem(content, i, { a: e.target.value })} />
          </>)} />
      </>)}

      {section === 'finalCta' && (<>
        <p className="text-[12px] text-slate">Leave the title empty to hide the closing banner.</p>
        <Input label="Title" value={content.title} maxLength={200} onChange={e => setContent({ ...content, title: e.target.value })} />
        <Textarea label="Text" rows={2} value={content.text} maxLength={400} onChange={e => setContent({ ...content, text: e.target.value })} />
        <Input label="Button" value={content.button} maxLength={60} onChange={e => setContent({ ...content, button: e.target.value })} />
      </>)}

      {error && <p className="text-[12px] text-error" role="alert">{error}</p>}
      {done && !withReauth && <p className="text-[12px] text-success" role="status">Saved. The page is updated.</p>}
      {!renderFooter && <div className="flex flex-wrap justify-end gap-2 pt-1">{actions}</div>}
    </div>
  );
}

function useFooter(render: ((n: ReactNode) => void) | undefined, node: ReactNode, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { render?.(node); }, deps);
}

/** Add / edit / delete / reorder (up, down) a capped list of items. */
function ListEditor<T>({ items, onChange, render, blank, max, noun }: {
  items: T[]; onChange: (next: T[]) => void; render: (item: T, i: number) => ReactNode; blank: T; max: number; noun: string;
}) {
  const move = (i: number, d: -1 | 1) => { const n = [...items]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p className="text-[12px] text-slate">Nothing here yet. Add your first {noun}.</p>}
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-bone p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-bold text-slate uppercase tracking-wide">{noun} {i + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label={`Move ${noun} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} className="p-1.5 rounded hover:bg-cream disabled:opacity-30 cursor-pointer bg-transparent border-none"><ArrowUp size={14} /></button>
              <button type="button" aria-label={`Move ${noun} ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)} className="p-1.5 rounded hover:bg-cream disabled:opacity-30 cursor-pointer bg-transparent border-none"><ArrowDown size={14} /></button>
              <button type="button" aria-label={`Delete ${noun} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-1.5 rounded hover:bg-error-bg text-error cursor-pointer bg-transparent border-none"><Trash2 size={14} /></button>
            </div>
          </div>
          {render(it, i)}
        </div>
      ))}
      <Button variant="ghost" size="sm" disabled={items.length >= max} onClick={() => onChange([...items, JSON.parse(JSON.stringify(blank))])}>
        <Plus size={14} className="inline align-middle me-1" /> Add {noun}{items.length >= max ? ` (max ${max})` : ''}
      </Button>
    </div>
  );
}
