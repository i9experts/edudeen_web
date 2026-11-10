import { useEffect, useRef, useState } from 'react';
import { Package2, Plus, Pencil, Trash2, ExternalLink, Search, Copy } from 'lucide-react';
import { clsx } from 'clsx';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Card, Button, Input, Textarea, Modal, SkeletonBox, EmptyState, Toggle, ImageUpload } from '@/components/comman/ui';
import { ConfirmDialog } from '@/features/seller/dashboard/storemodule/builder/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { useInventorySearch } from '@/hooks/seller/useInventorySearch';
import { formatPrice } from '@/utils/formatPrice';
import {
  apiGetSellerBundles, apiCreateBundle, apiUpdateBundle, apiDeleteBundle, apiDuplicateBundle, apiQuoteBundle, apiBundleSuggestions,
  type SellerBundle, type BundleQuote, type BundleSuggestion,
} from '@/api/services/classroom';

/** Sticky summary numbers come from the API (the same arithmetic as the public card and the cart), never a second formula here. */
function useBundleQuote(storeId: string, picked: string[], pct: number, valid: boolean) {
  const [quote, setQuote] = useState<BundleQuote | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const key = valid ? `${picked.join(',')}|${pct}` : '';
  const seq = useRef(0);
  useEffect(() => {
    if (!key) { setQuote(null); setError(false); return; }
    const id = ++seq.current;
    const ctl = new AbortController();
    setLoading(true); setError(false);
    const t = window.setTimeout(() => {
      apiQuoteBundle(storeId, picked, pct, ctl.signal)
        .then(r => { if (id === seq.current) setQuote(r.data); })
        .catch(() => { if (id === seq.current && !ctl.signal.aborted) setError(true); })
        .finally(() => { if (id === seq.current) setLoading(false); });
    }, 350);
    return () => { window.clearTimeout(t); ctl.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, key]);
  return { quote, error, loading };
}

function useSuggestions(storeId: string, picked: string[]) {
  const [items, setItems] = useState<BundleSuggestion[]>([]);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);
  const key = picked.join(',');
  useEffect(() => {
    if (!picked.length) { setItems([]); setError(false); return; }
    const ctl = new AbortController();
    setError(false);
    const t = window.setTimeout(() => {
      apiBundleSuggestions(storeId, picked, ctl.signal)
        .then(r => setItems(r.data ?? []))
        .catch(() => { if (!ctl.signal.aborted) setError(true); });
    }, 400);
    return () => { window.clearTimeout(t); ctl.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, key, nonce]);
  return { items, error, retry: () => setNonce(n => n + 1) };
}

function BundleForm({ storeId, bundle, onClose, onSaved }: {
  storeId: string; bundle: SellerBundle | null; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(bundle?.name ?? '');
  const [nameUr, setNameUr] = useState(bundle?.nameUr ?? '');
  const [cover, setCover] = useState(bundle?.coverImage ?? '');
  const [description, setDescription] = useState(bundle?.description ?? '');
  const [pct, setPct] = useState(String(bundle?.discountPercent ?? 15));
  const [picked, setPicked] = useState<string[]>(bundle?.productIds ?? []);
  const [busy, setBusy] = useState(false);

  // Live products only; first 100 up-front, typing searches the whole catalog server-side.
  const { products, loading: productsLoading, error: productsError, query: q, setQuery: setQ, searching, retry: retryProducts } =
    useInventorySearch(storeId, { limit: 100, status: 'active' });
  const pctNum = Number(pct);
  const toggle = (id: string) => setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 20 ? prev : [...prev, id]);

  const [nameTouched, setNameTouched] = useState(false);
  const nameError = !name.trim() ? 'Bundle name is required' : '';
  const pctError = pct.trim() === '' ? 'Enter a discount between 5 and 70'
    : !Number.isInteger(pctNum) || pctNum < 5 || pctNum > 70 ? 'Discount must be a whole number from 5 to 70' : '';
  const countError = picked.length < 2 ? 'Pick at least 2 products' : picked.length > 20 ? 'Pick at most 20 products' : '';
  const blockReason = nameError || pctError || countError;

  const { quote, error: quoteError, loading: quoteLoading } = useBundleQuote(storeId, picked, pctNum, !pctError && !countError);
  const sugg = useSuggestions(storeId, picked);
  const money = (n: number) => formatPrice(n, quote?.currency ?? undefined);

  const save = async () => {
    if (blockReason || busy) return;
    setBusy(true);
    try {
      const body = { name: name.trim(), nameUr: nameUr.trim() || null, coverImage: cover || null, description: description.trim(), productIds: picked, discountPercent: pctNum };
      if (bundle) await apiUpdateBundle(storeId, bundle._id, body);
      else await apiCreateBundle(storeId, body);
      toast.success(bundle ? 'Bundle saved' : 'Bundle created — buyers see it on each product page');
      onSaved();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save the bundle.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={bundle ? 'Edit bundle' : 'New bundle'} onClose={onClose} width={620} mobileSheet fullHeightMobile footer={
      <div className="flex flex-col gap-2 w-full">
        {/* Sticky summary: items total, discount, bundle price, what the buyer saves. */}
        <div className={clsx('rounded-lg border px-3 py-2 text-[12.5px]', blockReason ? 'border-error/40 bg-red-50 text-error' : 'border-bone bg-cream text-charcoal')} role={blockReason ? 'status' : undefined} aria-live="polite">
          {blockReason ? blockReason
            : quoteError ? 'Could not calculate the price. Check your connection and try again.'
            : !quote ? (quoteLoading ? 'Calculating…' : '—')
            : (
              <dl className={clsx('m-0 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1', quoteLoading && 'opacity-60')}>
                <div><dt className="text-slate">Items total</dt><dd className="m-0 font-semibold tabular-nums">{money(quote.totalPrice)}</dd></div>
                <div><dt className="text-slate">Discount</dt><dd className="m-0 font-semibold tabular-nums">{pctNum}%</dd></div>
                <div><dt className="text-slate">Bundle price</dt><dd className="m-0 font-bold tabular-nums">{money(quote.bundlePrice)}</dd></div>
                <div><dt className="text-slate">Buyer saves</dt><dd className="m-0 font-bold text-success tabular-nums">{money(quote.savings)}</dd></div>
              </dl>
            )}
        </div>
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" loading={busy} disabled={!!blockReason || busy} onClick={save}>Save bundle</Button>
        </div>
      </div>
    }>
      <div className="px-0 py-0 flex flex-col gap-3 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
          <Input label="Bundle name" value={name} maxLength={100} onChange={e => setName(e.target.value)} onBlur={() => setNameTouched(true)}
            error={nameTouched ? nameError || undefined : undefined} placeholder="e.g. Grade 5 complete pack" />
          <Input label="Discount (5–70%)" type="number" min={5} max={70} step={1} value={pct} onChange={e => setPct(e.target.value)} error={pctError || undefined} />
        </div>
        <Input label="Urdu name (optional, shown to buyers in Urdu)" dir="rtl" lang="ur" value={nameUr} maxLength={100} onChange={e => setNameUr(e.target.value)} />
        <Textarea label="Description (optional)" rows={2} maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} placeholder="What's inside and who it's for." />
        <div>
          <p className="text-[12px] font-medium text-charcoal mb-1.5">Cover picture (optional)</p>
          <ImageUpload value={cover ? [cover] : []} onChange={urls => setCover(urls[0] ?? '')} maxFiles={1} />
        </div>
        <div>
          <p className="text-[12px] font-medium text-charcoal mb-1.5">Products in the bundle (2–20) · {picked.length} selected</p>
          <Input aria-label="Search your products" placeholder="Search your products" value={q} onChange={e => setQ(e.target.value)} rightIcon={<Search size={14} />} />
          <ul className="list-none p-0 m-0 mt-2 max-h-[260px] overflow-y-auto flex flex-col gap-1">
            {products.map(p => {
              const on = picked.includes(p.productId);
              return (
                <li key={p.productId}>
                  <button type="button" onClick={() => toggle(p.productId)} aria-pressed={on}
                    className={clsx('w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-start cursor-pointer bg-white', on ? 'border-brand-orange bg-brand-pale-orange/40' : 'border-bone hover:border-brand-orange/40')}>
                    <input type="checkbox" readOnly checked={on} tabIndex={-1} className="accent-brand-orange pointer-events-none" />
                    {p.image ? <img src={p.image} alt="" className="w-8 h-8 rounded object-cover" /> : <span className="w-8 h-8 rounded bg-bone" />}
                    <span className="flex-1 min-w-0 text-[13px] text-carbon truncate">{p.name}</span>
                    <span className="text-[12px] text-slate tabular-nums">{p.price.toLocaleString()}</span>
                  </button>
                </li>
              );
            })}
            {productsLoading && !productsError && products.length === 0 && <li className="text-[12.5px] text-slate py-2">{searching ? 'Searching…' : 'Loading products…'}</li>}
            {productsError && !productsLoading && (
              <li role="alert" className="flex items-center gap-3 py-2">
                <span className="text-[12.5px] text-error">{productsError}</span>
                <Button variant="secondary" size="xs" onClick={retryProducts}>Retry</Button>
              </li>
            )}
            {!productsLoading && !productsError && products.length === 0 && <li className="text-[12.5px] text-slate py-2">{searching ? 'No active products match' : 'No active products yet.'}</li>}
          </ul>
        </div>

        {/* Suggested to add: same sub-category, or bought together in THIS store's orders. Never other stores. */}
        {picked.length > 0 && (sugg.items.length > 0 || sugg.error) && (
          <div>
            <p className="text-[12px] font-medium text-charcoal mb-1.5">Suggested to add</p>
            {sugg.error ? (
              <div role="alert" className="flex items-center gap-3"><span className="text-[12.5px] text-error">Could not load suggestions.</span><Button variant="secondary" size="xs" onClick={sugg.retry}>Retry</Button></div>
            ) : (
              <ul className="list-none p-0 m-0 flex flex-col gap-1">
                {sugg.items.map(s => (
                  <li key={s._id} className="flex items-center gap-3 rounded-lg border border-bone px-3 py-2 bg-white min-w-0">
                    {s.image ? <img src={s.image} alt="" className="w-8 h-8 rounded object-cover shrink-0" /> : <span className="w-8 h-8 rounded bg-bone shrink-0" />}
                    <span className="flex-1 min-w-0"><span className="block text-[13px] text-carbon truncate">{s.name}</span><span className="block text-[12px] text-slate">{s.reason}</span></span>
                    <Button variant="outline" size="xs" disabled={picked.length >= 20} onClick={() => setPicked(prev => prev.includes(s._id) ? prev : [...prev, s._id])}>Add</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-success-bg text-success',
  incomplete: 'bg-amber-50 text-amber-700',
  draft: 'bg-fog text-slate',
};

/** Store → Bundles: "buy together and save" sets of the store's own products. */
export default function StoreBundles() {
  const toast = useToast();
  const { storeId } = useStoreWorkspace();
  const [bundles, setBundles] = useState<SellerBundle[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<SellerBundle | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<SellerBundle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoadError(false);
    return apiGetSellerBundles(storeId).then(res => setBundles(res.data ?? [])).catch(() => { setLoadError(true); setBundles(prev => prev ?? []); });
  };
  useEffect(() => {
    setBundles(null);
    void load();
  }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActive = async (b: SellerBundle, isActive: boolean) => {
    try { await apiUpdateBundle(storeId, b._id, { isActive }); setBundles(prev => (prev ?? []).map(x => x._id === b._id ? { ...x, isActive } : x)); void load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not update.'); }
  };
  const duplicate = async (b: SellerBundle) => {
    setBusyId(b._id);
    try { await apiDuplicateBundle(storeId, b._id); toast.success('Copied as a draft — switch it on when ready'); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not duplicate.'); }
    finally { setBusyId(null); }
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try { await apiDeleteBundle(storeId, toDelete._id); setBundles(prev => (prev ?? []).filter(x => x._id !== toDelete._id)); toast.success('Bundle deleted'); setToDelete(null); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not delete.'); }
    finally { setDeleting(false); }
  };

  return (
    <>
      <StorePageHeader
        title="Bundles"
        eyebrow=""
        wrapSubtitle
        subtitle="Sell resources together at a discount — e.g. a full Grade 5 pack. The saving applies at checkout once every item is in the cart."
        actions={<Button variant="primary" size="sm" onClick={() => setEditing('new')}><Plus size={14} /> New bundle</Button>}
      />
      <div className="px-4 lg:px-7 pb-8 pt-5 flex flex-col gap-3 max-w-[980px]">
        {bundles === null ? (
          <SkeletonBox height={140} rounded="12px" />
        ) : loadError && bundles.length === 0 ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-12">
            <p className="text-[14px] text-slate">Could not load your bundles.</p>
            <Button variant="secondary" size="sm" onClick={() => { setBundles(null); void load(); }}>Retry</Button>
          </div>
        ) : bundles.length === 0 ? (
          <Card><EmptyState icon={<Package2 size={22} />} title="No bundles yet" description="Bundles raise the order value: teachers buy the whole set instead of one item." action={{ label: 'Create a bundle', onClick: () => setEditing('new') }} /></Card>
        ) : bundles.map(b => {
          const status = b.displayStatus ?? (b.isActive ? 'active' : 'draft');
          return (
            <Card key={b._id}>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="w-16 h-16 rounded-lg bg-cream border border-bone overflow-hidden shrink-0 flex items-center justify-center">
                  {(b.coverImage || b.products[0]?.image)
                    ? <img src={(b.coverImage || b.products[0]?.image) as string} alt="" className="w-full h-full object-cover" />
                    : <Package2 size={20} className="text-slate" />}
                </div>
                <div className="min-w-0 flex-1 basis-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14.5px] font-bold text-carbon">{b.name}</p>
                    <span className="rounded-full bg-brand-pale-orange text-brand-orange text-[12px] font-semibold px-2 py-[2px]">{b.discountPercent}% off</span>
                    <span className={clsx('rounded-full text-[12px] font-semibold px-2 py-[2px] capitalize', STATUS_STYLE[status])}>{status === 'draft' ? (b.isActive ? 'Draft (too few live items)' : 'Paused') : status}</span>
                  </div>
                  <p className="text-[12.5px] text-slate mt-0.5">{b.productIds.length} items{b.bundlePrice != null && b.currency ? ` · ${formatPrice(b.bundlePrice, b.currency)}` : ''}{b.savings ? ` · buyer saves ${formatPrice(b.savings, b.currency)}` : ''}</p>
                  <p className="text-[12.5px] text-slate mt-0.5 line-clamp-2">{b.products.map(p => p.name).join(' + ')}</p>
                  {status === 'incomplete' && <p className="text-[12px] text-amber-700 mt-1">Some items aren't live, so buyers can't see this bundle until they are.</p>}
                  {status === 'draft' && b.isActive && <p className="text-[12px] text-amber-700 mt-1">Fewer than 2 items are live, so this bundle is hidden from buyers.</p>}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <label className="inline-flex items-center gap-1.5 text-[12px] text-slate cursor-pointer"><Toggle label={`Bundle ${b.name ?? ''} active`} size="sm" checked={b.isActive} onChange={v => setActive(b, v)} /> {b.isActive ? 'On' : 'Off'}</label>
                  <a href={`/bundles/${b.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-slate px-2 no-underline hover:text-brand-orange"><ExternalLink size={12} /> View</a>
                  <Button variant="ghost" size="xs" onClick={() => setEditing(b)}><Pencil size={12} /> Edit</Button>
                  <Button variant="ghost" size="xs" loading={busyId === b._id} onClick={() => duplicate(b)}><Copy size={12} /> Duplicate</Button>
                  <Button variant="ghost" size="xs" className="text-error" aria-label={`Delete ${b.name}`} onClick={() => setToDelete(b)}><Trash2 size={12} /></Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {editing && (
        <BundleForm storeId={storeId} bundle={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Delete bundle"
          message={`Delete "${toDelete.name}"? The products themselves stay on sale.`}
          confirmLabel="Delete bundle"
          loading={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
