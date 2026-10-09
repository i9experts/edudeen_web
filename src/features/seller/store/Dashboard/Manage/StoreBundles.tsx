import { useEffect, useState } from 'react';
import { Package2, Plus, Pencil, Trash2, ExternalLink, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Card, Button, Input, Textarea, Modal, SkeletonBox, EmptyState, Toggle } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { type InventoryProduct } from '@/api/services/product';
import { useInventorySearch } from '@/hooks/seller/useInventorySearch';
import { apiGetSellerBundles, apiCreateBundle, apiUpdateBundle, apiDeleteBundle, type SellerBundle } from '@/api/services/classroom';

function BundleForm({ storeId, bundle, onClose, onSaved }: {
  storeId: string; bundle: SellerBundle | null; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(bundle?.name ?? '');
  const [description, setDescription] = useState(bundle?.description ?? '');
  const [pct, setPct] = useState(String(bundle?.discountPercent ?? 15));
  const [picked, setPicked] = useState<string[]>(bundle?.productIds ?? []);
  const [busy, setBusy] = useState(false);

  // Live products only; first 100 up-front, typing searches the whole catalog server-side.
  const { products, loading: productsLoading, error: productsError, query: q, setQuery: setQ, searching } =
    useInventorySearch(storeId, { limit: 100, status: 'active' });
  // Every product seen so far, so picked items keep counting toward the total
  // even when the current search doesn't return them.
  const [seen, setSeen] = useState<Record<string, InventoryProduct>>({});
  useEffect(() => {
    if (products.length) setSeen(prev => ({ ...prev, ...Object.fromEntries(products.map(p => [p.productId, p])) }));
  }, [products]);

  const visible = products;
  // Only quote a total once every picked item's price is known.
  const total = picked.every(id => seen[id]) ? picked.reduce((s, id) => s + (seen[id]?.price ?? 0), 0) : 0;
  const pctNum = Number(pct);
  const toggle = (id: string) => setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 20 ? prev : [...prev, id]);

  const save = async () => {
    setBusy(true);
    try {
      const body = { name: name.trim(), description: description.trim(), productIds: picked, discountPercent: pctNum };
      if (bundle) await apiUpdateBundle(storeId, bundle._id, body);
      else await apiCreateBundle(storeId, body);
      toast.success(bundle ? 'Bundle saved' : 'Bundle created — buyers see it on each product page');
      onSaved();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save the bundle.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={bundle ? 'Edit bundle' : 'New bundle'} onClose={onClose} width={620} mobileSheet footer={
      <div className="flex items-center gap-2 w-full">
        <p className="text-[12.5px] text-slate mr-auto">{picked.length} selected{total > 0 && pctNum > 0 ? ` · buyers pay ${(total * (1 - pctNum / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })} instead of ${total.toLocaleString()}` : ''}</p>
        <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="md" loading={busy} disabled={!name.trim() || picked.length < 2 || !(pctNum >= 5 && pctNum <= 70)} onClick={save}>Save bundle</Button>
      </div>
    }>
      <div className="px-5 py-4 flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
          <Input label="Bundle name" value={name} maxLength={100} onChange={e => setName(e.target.value)} placeholder="e.g. Grade 5 complete pack" />
          <Input label="Discount (5–70%)" type="number" min={5} max={70} value={pct} onChange={e => setPct(e.target.value)} />
        </div>
        <Textarea label="Description (optional)" rows={2} maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} placeholder="What's inside and who it's for." />
        <div>
          <p className="text-[12px] font-medium text-charcoal mb-1.5">Products in the bundle (2–20)</p>
          <Input aria-label="Search your products" placeholder="Search your products" value={q} onChange={e => setQ(e.target.value)} rightIcon={<Search size={14} />} />
          <ul className="list-none p-0 m-0 mt-2 max-h-[280px] overflow-y-auto flex flex-col gap-1">
            {visible.map(p => {
              const on = picked.includes(p.productId);
              return (
                <li key={p.productId}>
                  <button type="button" onClick={() => toggle(p.productId)} aria-pressed={on}
                    className={clsx('w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left cursor-pointer bg-white', on ? 'border-brand-orange bg-brand-pale-orange/40' : 'border-bone hover:border-brand-orange/40')}>
                    <input type="checkbox" readOnly checked={on} tabIndex={-1} className="accent-brand-orange pointer-events-none" />
                    {p.image ? <img src={p.image} alt="" className="w-8 h-8 rounded object-cover" /> : <span className="w-8 h-8 rounded bg-bone" />}
                    <span className="flex-1 min-w-0 text-[13px] text-carbon truncate">{p.name}</span>
                    <span className="text-[12px] text-slate tabular-nums">{p.price.toLocaleString()}</span>
                  </button>
                </li>
              );
            })}
            {productsLoading && visible.length === 0 && <li className="text-[12.5px] text-slate py-2">{searching ? 'Searching…' : 'Loading products…'}</li>}
            {productsError && <li className="text-[12.5px] text-error py-2">{productsError}</li>}
            {!productsLoading && !productsError && visible.length === 0 && <li className="text-[12.5px] text-slate py-2">{searching ? 'No live products match.' : 'No live products yet.'}</li>}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

/** Store → Bundles: "buy together and save" sets of the store's own products. */
export default function StoreBundles() {
  usePageTitle('Bundles');
  const toast = useToast();
  const { storeId } = useStoreWorkspace();
  const [bundles, setBundles] = useState<SellerBundle[] | null>(null);
  const [editing, setEditing] = useState<SellerBundle | 'new' | null>(null);

  const load = () => apiGetSellerBundles(storeId).then(res => setBundles(res.data ?? [])).catch(() => setBundles([]));
  useEffect(() => {
    void load();
  }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActive = async (b: SellerBundle, isActive: boolean) => {
    try { await apiUpdateBundle(storeId, b._id, { isActive }); setBundles(prev => (prev ?? []).map(x => x._id === b._id ? { ...x, isActive } : x)); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not update.'); }
  };
  const remove = async (b: SellerBundle) => {
    if (!window.confirm(`Delete the bundle "${b.name}"? The products themselves stay on sale.`)) return;
    try { await apiDeleteBundle(storeId, b._id); setBundles(prev => (prev ?? []).filter(x => x._id !== b._id)); toast.success('Bundle deleted'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not delete.'); }
  };

  return (
    <>
      <StorePageHeader
        title="Bundles"
        subtitle="Sell resources together at a discount — e.g. a full Grade 5 pack. The saving applies at checkout once every item is in the cart."
        actions={<Button variant="primary" size="sm" onClick={() => setEditing('new')}><Plus size={14} /> New bundle</Button>}
      />
      <div className="px-4 lg:px-7 pb-8 pt-5 flex flex-col gap-3 max-w-[980px]">
        {bundles === null ? (
          <SkeletonBox height={140} rounded="12px" />
        ) : bundles.length === 0 ? (
          <Card><EmptyState icon={<Package2 size={22} />} title="No bundles yet" description="Bundles raise the order value: teachers buy the whole set instead of one item." action={{ label: 'Create a bundle', onClick: () => setEditing('new') }} /></Card>
        ) : bundles.map(b => (
          <Card key={b._id}>
            <div className="flex items-start gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14.5px] font-bold text-carbon">{b.name}</p>
                  <span className="rounded-full bg-brand-pale-orange text-brand-orange text-[12px] font-semibold px-2 py-[2px]">{b.discountPercent}% off</span>
                  {!b.isActive && <span className="rounded-full bg-fog text-slate text-[12px] font-semibold px-2 py-[2px]">Paused</span>}
                </div>
                <p className="text-[12.5px] text-slate mt-0.5">{b.products.map(p => p.name).join(' + ')}</p>
                {b.products.some(p => p.status !== 'active') && <p className="text-[12px] text-amber-700 mt-1">Some items aren't live, so buyers can't see this bundle until they are.</p>}
              </div>
              <div className="flex items-center gap-1">
                <label className="inline-flex items-center gap-1.5 text-[12px] text-slate cursor-pointer"><Toggle label={`Bundle ${b.name ?? ""} active`} size="sm" checked={b.isActive} onChange={v => setActive(b, v)} /> {b.isActive ? 'On' : 'Off'}</label>
                <a href={`/bundles/${b.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-slate px-2 no-underline hover:text-brand-orange"><ExternalLink size={12} /> View</a>
                <Button variant="ghost" size="xs" onClick={() => setEditing(b)}><Pencil size={12} /> Edit</Button>
                <Button variant="ghost" size="xs" className="text-error" onClick={() => remove(b)}><Trash2 size={12} /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {editing && (
        <BundleForm storeId={storeId} bundle={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />
      )}
    </>
  );
}
