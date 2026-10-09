import { useState } from 'react';
import { Languages, LineChart, LifeBuoy, ImageIcon, ScanEye, Sparkles } from 'lucide-react';
import { Field } from '@/components/comman/ui/Field';
import { Input, Textarea } from '@/components/comman/ui/Input';
import { Button } from '@/components/comman/ui/Button';
import { ImageUpload } from '@/components/comman/ui/Upload';
import { useToast } from '@/contexts/ToastContext';
import { ProductPicker } from '../components/ProductPicker';
import { costLabel } from '../components/costLabel';
import {
  aiErrorInfo, apiHelpBot, apiImageCheck, apiLatestInsights, apiProductCover, apiSaveUrdu, apiTranslateBatch,
  apiTranslateProduct, apiTranslateText, apiWeeklyInsights,
  type CoverResult, type ImageCheckResult, type InsightsPayload,
} from '@/api/services/aiFeatures';
import { useEffect } from 'react';

interface ToolProps { storeId: string; onCreditsChanged: () => void; creditCost?: number }

const Panel = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
    <p className="text-sm font-bold text-charcoal mb-4 flex items-center gap-2">{icon} {title}</p>
    {children}
  </div>
);
const ErrorLine = ({ msg }: { msg: string }) => (msg ? <p role="alert" className="text-[12px] text-error mt-3 bg-error-bg rounded-md px-3 py-2">{msg}</p> : null);
const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">{children}</p>
);

// ── Urdu / English translation ───────────────────────────────────────────────
export function TranslateTool({ storeId, onCreditsChanged, creditCost }: ToolProps) {
  const toast = useToast();
  const [productId, setProductId] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState<'one' | 'save' | 'batch' | null>(null);
  const [error, setError] = useState('');
  const [batchMsg, setBatchMsg] = useState('');

  async function translate() {
    setBusy('one'); setError(''); setNotes([]);
    try {
      const res = productId ? await apiTranslateProduct(storeId, productId) : await apiTranslateText(storeId, { title, description: desc });
      setTitle(res.data.title); setDesc(res.data.description); setNotes(res.data.needsReview ?? []);
      onCreditsChanged();
    } catch (e) { setError(aiErrorInfo(e).message); } finally { setBusy(null); }
  }
  async function save() {
    setBusy('save'); setError('');
    try { await apiSaveUrdu(storeId, productId, { nameUr: title, descriptionUr: desc }); toast.success('Urdu copy saved.'); }
    catch (e) { setError(aiErrorInfo(e).message); } finally { setBusy(null); }
  }
  async function batch() {
    setBusy('batch'); setError(''); setBatchMsg('');
    try {
      const r = (await apiTranslateBatch(storeId)).data;
      setBatchMsg(`${r.translated} product(s) translated${r.remaining ? `, ${r.remaining} left` : ''}${r.stoppedReason ? ` (stopped: ${r.stoppedReason === 'INSUFFICIENT_AI_CREDITS' ? 'out of credits' : 'AI unavailable'})` : ''}. Review them in each product.`);
      onCreditsChanged();
    } catch (e) { setError(aiErrorInfo(e).message); } finally { setBusy(null); }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Panel title="Urdu / English translation" icon={<Languages size={15} />}>
        <div className="flex flex-col gap-4">
          <Field label="Product (optional)" hint="Pick a product to load and save its Urdu copy, or paste text below">
            <ProductPicker storeId={storeId} value={productId} onChange={setProductId} />
          </Field>
          {!productId && (
            <>
              <Field label="Title"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="English or Urdu title" /></Field>
              <Field label="Description"><Textarea rows={5} value={desc} onChange={e => setDesc(e.target.value)} /></Field>
            </>
          )}
        </div>
        <ErrorLine msg={error} />
        <Button variant="primary" size="md" fullWidth loading={busy === 'one'} disabled={!productId && !title.trim()} onClick={translate} icon={<Sparkles size={14} />} className="mt-5">
          Translate with AI{costLabel(creditCost)}
        </Button>
        <div className="border-t border-bone mt-5 pt-4">
          <p className="text-[12px] text-slate mb-2">Translate up to 10 products that have no Urdu copy yet (live in Urdu view; edit anytime).</p>
          <Button variant="outline" size="sm" loading={busy === 'batch'} onClick={batch}>Translate missing products</Button>
          {batchMsg && <p className="text-[12px] text-success mt-2">{batchMsg}</p>}
        </div>
      </Panel>
      <Panel title="Draft (editable)" icon={<Sparkles size={15} />}>
        {!title && !desc ? <p className="text-xs text-slate py-10 text-center">The translation appears here. Edit it, then save.</p> : (
          <div className="flex flex-col gap-3">
            <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} dir="auto" />
            <Textarea label="Description" rows={8} value={desc} onChange={e => setDesc(e.target.value)} dir="auto" />
            {notes.length > 0 && (
              <div className="text-[11px] text-warning bg-warning-bg rounded-md px-3 py-2">
                <b>Please verify:</b>
                <ul className="list-disc ps-4">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
              </div>
            )}
            {productId
              ? <Button variant="primary" size="md" loading={busy === 'save'} onClick={save}>Save as Urdu copy</Button>
              : <p className="text-[11px] text-slate">Copy the text into your product form (pick a product above to save directly).</p>}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ── Weekly insights ──────────────────────────────────────────────────────────
export function InsightsTool({ storeId, onCreditsChanged, creditCost }: ToolProps) {
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    apiLatestInsights(storeId).then(r => { if (alive) setData(r.data); }).catch(() => undefined).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [storeId]);

  async function run() {
    setBusy(true); setError('');
    try { setData((await apiWeeklyInsights(storeId)).data); onCreditsChanged(); }
    catch (e) { setError(aiErrorInfo(e).message); } finally { setBusy(false); }
  }
  const stats = data?.stats as Record<string, number | null> | undefined;

  return (
    <Panel title="Weekly insights digest" icon={<LineChart size={15} />}>
      <p className="text-xs text-slate mb-4">Numbers are calculated from your real orders and reviews; AI only writes the summary and 3 suggested actions.</p>
      <Button variant="primary" size="md" loading={busy} onClick={run} icon={<Sparkles size={14} />}>{data ? 'Refresh digest' : 'Generate digest'}{costLabel(creditCost)}</Button>
      <ErrorLine msg={error} />
      {loading && !data && <p className="text-xs text-slate mt-4">Loading…</p>}
      {data?.digest && (
        <div className="mt-5 flex flex-col gap-4">
          <p className="font-serif text-[18px] text-carbon leading-snug">{data.digest.headline}</p>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {[['Revenue (7d)', stats.weekRevenue], ['Orders', stats.weekOrders], ['New reviews', stats.newReviews], ['Change', stats.revenueChangePct == null ? '—' : `${stats.revenueChangePct}%`]].map(([k, v]) => (
                <div key={String(k)} className="bg-cream rounded-lg py-2"><p className="text-[10px] text-slate">{k}</p><p className="text-[15px] font-bold text-carbon">{String(v ?? 0)}</p></div>
              ))}
            </div>
          )}
          <ul className="list-disc ps-5 text-[13px] text-graphite flex flex-col gap-1">{data.digest.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
          <div><Label>Suggested actions</Label>
            <ol className="list-decimal ps-5 text-[13px] text-graphite flex flex-col gap-2">{data.digest.actions.map((a, i) => <li key={i}><b>{a.title}</b> — {a.why}</li>)}</ol>
          </div>
          <p className="text-[10px] text-slate">Generated {new Date(data.at).toLocaleString()}</p>
        </div>
      )}
    </Panel>
  );
}

// ── Seller help bot ──────────────────────────────────────────────────────────
export function HelpBotTool({ storeId }: ToolProps) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [res, setRes] = useState<{ answer: string; sources: string[]; grounded: boolean } | null>(null);
  async function ask() {
    setBusy(true); setError('');
    try { setRes((await apiHelpBot(storeId, q)).data); } catch (e) { setError(aiErrorInfo(e).message); } finally { setBusy(false); }
  }
  return (
    <Panel title="Seller help assistant" icon={<LifeBuoy size={15} />}>
      <p className="text-xs text-slate mb-3">Free. Answers come only from the Edudeen help articles.</p>
      <Textarea rows={3} value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. How do I add my bank account for bank transfers?" />
      <Button variant="primary" size="md" className="mt-3" loading={busy} disabled={q.trim().length < 3} onClick={ask}>Ask</Button>
      <ErrorLine msg={error} />
      {res && (
        <div className="mt-4 bg-cream border border-bone rounded-lg px-4 py-3">
          <p className="text-[13px] text-graphite whitespace-pre-line leading-relaxed">{res.answer}</p>
          {res.sources.length > 0 && <p className="text-[10px] text-slate mt-2">Based on: {res.sources.join(' · ')}</p>}
        </div>
      )}
    </Panel>
  );
}

// ── Branded product cover ────────────────────────────────────────────────────
/** Renders the SVG to a PNG blob in the browser. */
async function svgToPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error('Could not render the cover.')); img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 1200;
    canvas.getContext('2d')!.drawImage(img, 0, 0, 1200, 1200);
    return await new Promise<Blob>((ok, bad) => canvas.toBlob(b => (b ? ok(b) : bad(new Error('Could not export the cover'))), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

export function CoverTool({ storeId, onCreditsChanged, creditCost }: ToolProps) {
  const [productId, setProductId] = useState('');
  const [cover, setCover] = useState<CoverResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run() {
    setBusy(true); setError('');
    try { setCover((await apiProductCover(storeId, productId)).data); onCreditsChanged(); }
    catch (e) { setError(aiErrorInfo(e).message); } finally { setBusy(false); }
  }
  async function download() {
    if (!cover) return;
    try {
      const blob = await svgToPng(cover.svg);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'edudeen-cover.png'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Download failed.'); }
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Panel title="Branded product cover" icon={<ImageIcon size={15} />}>
        <p className="text-xs text-slate mb-3">AI suggests the text and colour; the layout is generated in code. Download the PNG and add it to your product photos.</p>
        <Field label="Product"><ProductPicker storeId={storeId} value={productId} onChange={setProductId} allowNone={false} noneLabel="— Select a product —" /></Field>
        <ErrorLine msg={error} />
        <Button variant="primary" size="md" fullWidth loading={busy} disabled={!productId} onClick={run} icon={<Sparkles size={14} />} className="mt-5">Create cover{costLabel(creditCost)}</Button>
      </Panel>
      <Panel title="Preview" icon={<Sparkles size={15} />}>
        {!cover ? <p className="text-xs text-slate py-10 text-center">Your cover appears here.</p> : (
          <div className="flex flex-col gap-3">
            <img alt={cover.spec.headline} className="w-full max-w-[360px] mx-auto rounded-lg border border-bone" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(cover.svg)}`} />
            <Button variant="primary" size="md" onClick={download}>Download PNG</Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ── Photo check + alt text ───────────────────────────────────────────────────
export function PhotoCheckTool({ storeId, onCreditsChanged, creditCost }: ToolProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [res, setRes] = useState<ImageCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run() {
    setBusy(true); setError('');
    try { setRes((await apiImageCheck(storeId, imageUrl)).data); onCreditsChanged(); }
    catch (e) { setError(aiErrorInfo(e).message); } finally { setBusy(false); }
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Panel title="Photo check + alt text" icon={<ScanEye size={15} />}>
        <p className="text-xs text-slate mb-3">AI looks at your photo and suggests alt text and quality fixes. It cannot edit the image itself.</p>
        <Field label="Product image"><ImageUpload value={imageUrl ? [imageUrl] : []} onChange={urls => setImageUrl(urls[0] ?? '')} /></Field>
        <ErrorLine msg={error} />
        <Button variant="primary" size="md" fullWidth loading={busy} disabled={!imageUrl} onClick={run} icon={<Sparkles size={14} />} className="mt-5">Check photo{costLabel(creditCost)}</Button>
      </Panel>
      <Panel title="Result" icon={<Sparkles size={15} />}>
        {!res ? <p className="text-xs text-slate py-10 text-center">Upload a photo to see feedback.</p> : (
          <div className="flex flex-col gap-3">
            <div><Label>Quality score</Label><p className="text-[28px] font-bold text-brand-orange leading-none">{res.qualityScore}/10</p></div>
            <div><Label>Alt text (editable)</Label><Textarea rows={2} value={res.altText} onChange={e => setRes({ ...res, altText: e.target.value })} /></div>
            {res.issues.length > 0 && <div><Label>Issues</Label><ul className="list-disc ps-4 text-xs text-graphite">{res.issues.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
            {res.suggestions.length > 0 && <div><Label>Suggestions</Label><ul className="list-disc ps-4 text-xs text-graphite">{res.suggestions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          </div>
        )}
      </Panel>
    </div>
  );
}
