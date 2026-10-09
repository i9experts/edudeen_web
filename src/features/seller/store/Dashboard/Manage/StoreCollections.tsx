import { useState, useCallback, useEffect } from 'react';
import { Layers, Plus } from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { SkeletonBox, EmptyState } from '@/components/comman/ui';
import { Button } from '@/components/comman/ui/Button';
import { ActionMenu, type ActionMenuItem } from '@/components/comman/ui/ActionMenu';
import { ConfirmDialog } from '@/features/seller/dashboard/storemodule/builder/ConfirmDialog';
import { apiListCollections, apiDeleteCollection, type CollectionData } from '@/api/services/collections';
import { CollectionFormModal } from './CollectionFormModal';

function StatusBadge({ status }: { status: 'active' | 'draft' }) {
  return (
    <span className={`text-[12px] font-semibold px-[7px] py-[2px] rounded-full ${status === 'active' ? 'bg-success-bg text-success' : 'bg-bone text-slate'}`}>
      {status === 'active' ? 'Active' : 'Draft'}
    </span>
  );
}

// Seller-facing management for `Collection` — named, curated per-store
// product groupings (manual or rule-based), distinct from the old flat
// `pinnedProductIds` list Marketing.tsx's "Featured & Collections" tab
// manages (that tab is untouched; a seller can have both today).
export default function StoreCollections() {
  const { storeId, store } = useStoreWorkspace();
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CollectionData | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiListCollections(storeId).then(res => setCollections(res.data)).finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await apiDeleteCollection(storeId, pendingDeleteId);
      setCollections(prev => prev.filter(c => c._id !== pendingDeleteId));
      setPendingDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <StorePageHeader
        title="Collections"
        subtitle="Named, curated product groupings — New Arrivals, Sale, Best Sellers — usable in your homepage sections and navigation."
        actions={<Button icon={<Plus size={13} />} size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>New Collection</Button>}
      />

      <div className="px-4 lg:px-7 pt-5 pb-8">
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} height={64} rounded="10px" />)}
          </div>
        ) : collections.length === 0 ? (
          <EmptyState
            icon={<Layers size={28} />}
            title="No collections yet"
            description="Create a collection to group products — New Arrivals, Sale, Best Sellers — then feature it on your homepage or link it from your navigation."
            action={{ label: 'New Collection', onClick: () => { setEditing(null); setShowForm(true); } }}
          />
        ) : (
          <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
            {collections.map(c => {
              const items: ActionMenuItem[] = [
                { label: 'Edit', onClick: () => { setEditing(c); setShowForm(true); } },
                { label: 'Delete', danger: true, onClick: () => setPendingDeleteId(c._id) },
              ];
              return (
                <div key={c._id} className="flex items-center gap-3 px-5 py-3 border-b border-[#f0eee6] last:border-b-0 hover:bg-cream transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-cream border border-bone shrink-0 overflow-hidden flex items-center justify-center">
                    {c.image ? <img src={c.image} alt="" className="w-full h-full object-cover" /> : <Layers size={16} className="text-slate" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13.5px] font-semibold text-charcoal truncate">{c.name}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-[12px] text-slate mt-0.5">
                      {c.type === 'automatic' ? 'Automatic' : `${c.productIds.length} products`} · /{c.slug}
                    </p>
                  </div>
                  <ActionMenu items={items} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <CollectionFormModal
          storeId={storeId}
          mainCategoryId={store?.categoryId}
          collection={editing}
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
