import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, GripVertical, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui';
import { apiListCollections, apiUpdateCollection, apiReorderCollections, type CollectionData } from '@/api/services/collections';
import { MAX_COLLECTIONS } from '@/utils/collectionName';
import { CollectionFormModal } from '@/features/seller/store/Dashboard/Manage/CollectionFormModal';

function move<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * "Sections" on Customize your store = the store's Collections (same data, same reorder / hide APIs).
 * Order here is the order of the chips buyers see above All products.
 */
export function StoreSectionsCard({ storeId, categoryId, currency }: { storeId: string; categoryId?: string; currency?: string }) {
  const [items, setItems] = useState<CollectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    setLoadError(false);
    apiListCollections(storeId)
      .then(res => setItems(res.data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [storeId]);
  useEffect(() => { load(); }, [load]);

  const fail = (e: unknown, fallback: string) => setNotice(e instanceof Error && e.message ? e.message : fallback);

  const applyOrder = async (next: CollectionData[]) => {
    const mine = ++seq.current;
    setItems(next);
    setNotice('');
    try {
      await apiReorderCollections(storeId, next.map(c => c._id));
    } catch (e) {
      if (mine === seq.current) { fail(e, 'Could not save the new order.'); load(true); }
    }
  };

  const toggle = async (c: CollectionData) => {
    const status = c.status === 'active' ? 'draft' : 'active';
    setBusyId(c._id);
    setNotice('');
    try {
      await apiUpdateCollection(storeId, c._id, { status });
      setItems(prev => prev.map(x => (x._id === c._id ? { ...x, status } : x)));
    } catch (e) { fail(e, 'Could not update the section.'); }
    finally { setBusyId(null); }
  };

  const onDrop = (targetId: string) => {
    const from = items.findIndex(c => c._id === dragId);
    const to = items.findIndex(c => c._id === targetId);
    setDragId(null);
    if (from < 0 || to < 0 || from === to) return;
    void applyOrder(move(items, from, to));
  };

  const atLimit = items.length >= MAX_COLLECTIONS;
  const manage = (
    <Link to={`/store/${storeId}/collections`} className="text-[12.5px] font-semibold text-brand-royal hover:underline">Manage</Link>
  );

  return (
    <div>
      {notice && <p role="alert" className="mb-2 text-[13px] text-error">{notice}</p>}
      {loading ? (
        <div className="flex flex-col gap-2">{[0, 1, 2].map(i => <SkeletonBox key={i} height={52} rounded="10px" />)}</div>
      ) : loadError ? (
        <div role="alert" className="flex items-center gap-3 py-2">
          <p className="text-[13px] text-slate">Could not load your sections.</p>
          <Button variant="secondary" size="sm" onClick={() => load()}>Retry</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-start gap-2.5 rounded-xl border border-dashed border-bone p-4">
          <p className="text-[13px] text-slate m-0">Sections are chips above your products — e.g. New Arrivals, Class 5, Worksheets.</p>
          <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowForm(true)}>Create your first section</Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-bone overflow-hidden">
            {items.map((c, i) => {
              const count = c.productCount ?? c.productIds.length;
              return (
                <div
                  key={c._id}
                  draggable
                  onDragStart={e => { setDragId(c._id); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={e => { if (dragId) e.preventDefault(); }}
                  onDrop={e => { e.preventDefault(); onDrop(c._id); }}
                  onDragEnd={() => setDragId(null)}
                  className={`flex items-center gap-2 ps-2 pe-1.5 py-2 border-b border-bone last:border-b-0 ${dragId === c._id ? 'opacity-50' : ''} ${c.status === 'draft' ? 'opacity-70' : ''}`}
                >
                  <GripVertical size={16} className="text-slate shrink-0 cursor-grab" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-charcoal truncate m-0">{c.name}</p>
                    <p className="text-[12px] text-slate m-0">
                      {count} {count === 1 ? 'product' : 'products'} · {c.status === 'active' ? 'Shown' : 'Hidden'}
                    </p>
                  </div>
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => applyOrder(move(items, i, i - 1))}
                    className="p-1.5 bg-transparent border-none cursor-pointer text-slate hover:text-charcoal disabled:opacity-30 disabled:cursor-default"><ChevronUp size={16} /></button>
                  <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => applyOrder(move(items, i, i + 1))}
                    className="p-1.5 bg-transparent border-none cursor-pointer text-slate hover:text-charcoal disabled:opacity-30 disabled:cursor-default"><ChevronDown size={16} /></button>
                  <button type="button" aria-label={c.status === 'active' ? 'Hide section' : 'Show section'} disabled={busyId === c._id} onClick={() => toggle(c)}
                    className="p-1.5 bg-transparent border-none cursor-pointer text-slate hover:text-charcoal disabled:opacity-40">
                    {c.status === 'active' ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
            <Button size="sm" variant="outline" icon={<Plus size={13} />} disabled={atLimit} title={atLimit ? `Limit of ${MAX_COLLECTIONS} sections reached` : undefined} onClick={() => setShowForm(true)}>New section</Button>
            {manage}
          </div>
        </>
      )}

      {showForm && (
        <CollectionFormModal
          storeId={storeId}
          mainCategoryId={categoryId}
          currency={currency}
          collection={null}
          otherNames={items.map(c => c.name)}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(true); }}
        />
      )}
    </div>
  );
}
