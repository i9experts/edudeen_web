import { useState, useCallback, useEffect, useRef } from 'react';
import { Layers, Plus, GripVertical, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { SkeletonBox, EmptyState } from '@/components/comman/ui';
import { Button } from '@/components/comman/ui/Button';
import { ActionMenu, type ActionMenuItem } from '@/components/comman/ui/ActionMenu';
import { ConfirmDialog } from '@/features/seller/dashboard/storemodule/builder/ConfirmDialog';
import {
  apiListCollections, apiDeleteCollection, apiUpdateCollection, apiReorderCollections, type CollectionData,
} from '@/api/services/collections';
import { MAX_COLLECTIONS } from '@/utils/collectionName';
import { CollectionFormModal } from './CollectionFormModal';

function StatusBadge({ status }: { status: 'active' | 'draft' }) {
  return (
    <span className={`text-[12px] font-semibold px-[7px] py-[2px] rounded-full ${status === 'active' ? 'bg-success-bg text-success' : 'bg-bone text-slate'}`}>
      {status === 'active' ? 'Shown on store' : 'Hidden from store'}
    </span>
  );
}

function move<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Seller-facing management for `Collection` — named, curated per-store
// product groupings (manual or rule-based), distinct from the old flat
// `pinnedProductIds` list Marketing.tsx's "Featured & Collections" tab
// manages (that tab is untouched; a seller can have both today).
// Order here = the order of the tabs buyers see on the store page.
export default function StoreCollections() {
  const { storeId, store } = useStoreWorkspace();
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CollectionData | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const saveSeq = useRef(0);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    apiListCollections(storeId)
      .then(res => setCollections(res.data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const fail = (e: unknown, fallback: string) => setNotice(e instanceof Error && e.message ? e.message : fallback);

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await apiDeleteCollection(storeId, pendingDeleteId);
      setCollections(prev => prev.filter(c => c._id !== pendingDeleteId));
      setPendingDeleteId(null);
    } catch (e) {
      fail(e, 'Could not delete the collection.');
      setPendingDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const toggleHidden = async (c: CollectionData) => {
    const status = c.status === 'active' ? 'draft' : 'active';
    setBusyId(c._id);
    setNotice('');
    try {
      await apiUpdateCollection(storeId, c._id, { status });
      setCollections(prev => prev.map(x => (x._id === c._id ? { ...x, status } : x)));
    } catch (e) { fail(e, 'Could not update the collection.'); }
    finally { setBusyId(null); }
  };

  // Optimistic: show the new order at once, save it, roll back (reload) if the save fails.
  const applyOrder = async (next: CollectionData[]) => {
    const seq = ++saveSeq.current;
    setCollections(next);
    setNotice('');
    try {
      await apiReorderCollections(storeId, next.map(c => c._id));
    } catch (e) {
      if (seq === saveSeq.current) { fail(e, 'Could not save the new order.'); load(); }
    }
  };

  const onDrop = (targetId: string) => {
    const from = collections.findIndex(c => c._id === dragId);
    const to = collections.findIndex(c => c._id === targetId);
    setDragId(null); setOverId(null);
    if (from < 0 || to < 0 || from === to) return;
    void applyOrder(move(collections, from, to));
  };

  const atLimit = collections.length >= MAX_COLLECTIONS;
  const openNew = () => { setEditing(null); setShowForm(true); };

  return (
    <>
      <StorePageHeader
        title="Collections"
        subtitle="Named, curated product groupings — New Arrivals, Sale, Best Sellers. They appear as tabs on your store page in this order."
        actions={<Button icon={<Plus size={13} />} size="sm" disabled={atLimit} title={atLimit ? `Limit of ${MAX_COLLECTIONS} collections reached` : undefined} onClick={openNew}>New Collection</Button>}
      />

      <div className="px-4 lg:px-7 pt-5 pb-8">
        {notice && <p role="alert" className="mb-3 text-[13px] text-error">{notice}</p>}
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} height={64} rounded="10px" />)}
          </div>
        ) : loadError ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-12">
            <p className="text-[14px] text-slate">Could not load your collections.</p>
            <Button variant="secondary" size="sm" onClick={load}>Retry</Button>
          </div>
        ) : collections.length === 0 ? (
          <EmptyState
            icon={<Layers size={28} />}
            title="No collections yet"
            description="Create a collection to group products — New Arrivals, Sale, Best Sellers — then feature it on your homepage or link it from your navigation."
            action={{ label: 'New Collection', onClick: openNew }}
          />
        ) : (
          <>
            <p className="text-[12px] text-slate mb-2">{collections.length} of {MAX_COLLECTIONS} · drag to reorder (or use the arrows)</p>
            <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
              {collections.map((c, i) => {
                const items: ActionMenuItem[] = [
                  { label: 'Rename / edit', onClick: () => { setEditing(c); setShowForm(true); } },
                  { label: c.status === 'active' ? 'Hide from store' : 'Show on store', onClick: () => toggleHidden(c) },
                  { label: 'Delete', danger: true, onClick: () => setPendingDeleteId(c._id) },
                ];
                return (
                  <div
                    key={c._id}
                    draggable
                    onDragStart={e => { setDragId(c._id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragOver={e => { if (dragId) { e.preventDefault(); setOverId(c._id); } }}
                    onDrop={e => { e.preventDefault(); onDrop(c._id); }}
                    onDragEnd={() => { setDragId(null); setOverId(null); }}
                    className={`flex items-center gap-2 sm:gap-3 ps-2 pe-3 sm:pe-5 py-3 border-b border-[#f0eee6] last:border-b-0 hover:bg-cream transition-colors ${dragId === c._id ? 'opacity-50' : ''} ${overId === c._id && dragId !== c._id ? 'bg-cream' : ''} ${c.status === 'draft' ? 'opacity-80' : ''}`}
                  >
                    <GripVertical size={16} className="text-slate shrink-0 cursor-grab" aria-hidden />
                    <div className="w-10 h-10 rounded-lg bg-cream border border-bone shrink-0 overflow-hidden flex items-center justify-center">
                      {c.image ? <img src={c.image} alt="" className="w-full h-full object-cover" /> : <Layers size={16} className="text-slate" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-charcoal truncate">{c.name}</p>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-0.5">
                        <StatusBadge status={c.status} />
                        <span className="text-[12px] text-slate">{c.type === 'automatic' ? 'Automatic' : `${c.productIds.length} products`}</span>
                      </div>
                    </div>
                    <div className="flex items-center shrink-0">
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => applyOrder(move(collections, i, i - 1))}
                        className="p-1.5 bg-transparent border-none cursor-pointer text-slate hover:text-charcoal disabled:opacity-30 disabled:cursor-default"><ChevronUp size={16} /></button>
                      <button type="button" aria-label="Move down" disabled={i === collections.length - 1} onClick={() => applyOrder(move(collections, i, i + 1))}
                        className="p-1.5 bg-transparent border-none cursor-pointer text-slate hover:text-charcoal disabled:opacity-30 disabled:cursor-default"><ChevronDown size={16} /></button>
                      <button type="button" aria-label={c.status === 'active' ? 'Hide from store' : 'Show on store'} disabled={busyId === c._id} onClick={() => toggleHidden(c)}
                        className="hidden sm:block p-1.5 bg-transparent border-none cursor-pointer text-slate hover:text-charcoal disabled:opacity-40">
                        {c.status === 'active' ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <ActionMenu items={items} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <CollectionFormModal
          storeId={storeId}
          mainCategoryId={store?.categoryId}
          collection={editing}
          otherNames={collections.filter(c => c._id !== editing?._id).map(c => c.name)}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete collection"
          message="This collection will be permanently deleted. Any section or nav link that used it will show nothing in its place until you pick a replacement."
          confirmLabel="Delete Collection"
          loading={deleting}
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
