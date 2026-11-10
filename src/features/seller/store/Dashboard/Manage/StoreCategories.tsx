import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, FolderTree, Plus, RefreshCw, Tag } from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { useStoreSubcategories } from '@/hooks/store/useStoreSubcategories';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { Button, SkeletonBox } from '@/components/comman/ui';
import {
  apiGetStoreCategoryUsage, apiGetCategoryRequests,
  type CategoryNode, type CategoryRequest, type CategoryRequestType, type StoreCategoryUsage,
} from '@/api/services/categories';
import CategoryRequestModal from './CategoryRequestModal';

// A store's main category is fixed at creation (assertValidRootCategory on the backend). Subcategories are
// platform-wide (shared by every store under the same main category); sellers can ASK for a new one here and
// the Edudeen team adds it. Counts are this store's own products, using the same rule as the Products page
// `?category=` filter (the category itself or anything below it).
function flatten(nodes: CategoryNode[], depth: number): { node: CategoryNode; depth: number }[] {
  return [...nodes]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .flatMap(n => [{ node: n, depth }, ...flatten(n.children ?? [], depth + 1)]);
}

const STATUS_STYLE: Record<CategoryRequest['status'], string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-green-50 text-green-800 border-green-200',
  rejected: 'bg-error-bg text-error border-error-border',
};
const STATUS_LABEL: Record<CategoryRequest['status'], string> = { pending: 'Pending', approved: 'Approved', rejected: 'Not approved' };

function ErrorBox({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div role="alert" className="m-4 flex items-center gap-3 rounded-[10px] border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
      <span className="flex-1">{text}</span>
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 min-h-[44px] px-1 font-semibold underline cursor-pointer bg-transparent border-none text-error">
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );
}

export default function StoreCategories() {
  const { store, storeId } = useStoreWorkspace();
  const { mainCategory, subcategories, loading, error: treeError, refetch: refetchTree } = useStoreSubcategories(store?.categoryId);

  const [usage, setUsage] = useState<StoreCategoryUsage | null>(null);
  const [usageError, setUsageError] = useState('');
  const [requests, setRequests] = useState<CategoryRequest[] | null>(null);
  const [requestsError, setRequestsError] = useState('');
  const [modal, setModal] = useState<CategoryRequestType | null>(null);

  const loadUsage = useCallback(() => {
    if (!storeId) return;
    setUsageError('');
    apiGetStoreCategoryUsage(storeId)
      .then(r => setUsage(r.data))
      .catch((e: unknown) => setUsageError(e instanceof Error ? e.message : 'Could not load product counts.'));
  }, [storeId]);
  const loadRequests = useCallback(() => {
    if (!storeId) return;
    setRequestsError('');
    apiGetCategoryRequests(storeId)
      .then(r => setRequests(r.data))
      .catch((e: unknown) => setRequestsError(e instanceof Error ? e.message : 'Could not load your requests.'));
  }, [storeId]);
  useEffect(() => { loadUsage(); loadRequests(); }, [loadUsage, loadRequests]);
  // Product / category changes elsewhere (and an admin deciding a request) update the numbers quietly.
  useLiveRefresh(['catalog', 'categories'], () => { loadUsage(); loadRequests(); });

  const base = `/store/${storeId}/products`;
  const noSub = usage?.noSubcategory ?? 0;
  const pendingCount = requests?.filter(r => r.status === 'pending').length ?? 0;

  return (
    <>
      <StorePageHeader
        title="Categories"
        eyebrow=""
        wrapSubtitle
        subtitle="Your store's main category and its subcategories, with how many of your products are in each."
      />

      <div className="px-4 md:px-8 py-6 flex flex-col gap-5">

        {noSub > 0 && (
          <Link
            to={`${base}?nosub=1`}
            className="flex items-center gap-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 no-underline hover:bg-amber-100 transition-colors"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1 min-w-0">
              {noSub} {noSub === 1 ? 'product has' : 'products have'} no subcategory - <span className="font-semibold underline">fix now</span>
            </span>
            <ChevronRight size={16} className="shrink-0 rtl:rotate-180" />
          </Link>
        )}

        {/* Main category (one line) */}
        <div className="bg-white border border-bone rounded-[10px] px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-brand-pale-orange flex items-center justify-center shrink-0">
            <FolderTree size={17} style={{ color: '#174771' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[11px] font-medium text-slate uppercase tracking-[0.06em]">Main Category</p>
            {!store || loading ? (
              <div className="animate-pulse w-32 h-4 rounded bg-bone mt-1" />
            ) : treeError ? (
              <p className="m-0 text-[13px] text-error">Could not load. <button type="button" onClick={refetchTree} className="underline font-semibold bg-transparent border-none cursor-pointer text-error p-0">Retry</button></p>
            ) : (
              <p className="m-0 text-[15px] font-bold text-carbon truncate">{mainCategory?.name ?? '—'}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setModal('main_change')}
            className="shrink-0 min-h-[44px] px-1 text-[13px] font-semibold text-brand-royal underline bg-transparent border-none cursor-pointer"
          >
            Request change
          </button>
        </div>

        {/* Subcategories */}
        <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
          <div className="px-5 py-[14px] border-b border-bone flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[13px] font-bold text-charcoal">Subcategories</p>
              <p className="m-0 text-[12px] text-slate mt-0.5">Tap one to see your products in it. Missing one? Request it.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setModal('subcategory')}>
              <Plus size={14} /> Request a subcategory
            </Button>
          </div>

          {usageError && <ErrorBox text={usageError} onRetry={loadUsage} />}

          {loading ? (
            <div className="flex flex-col" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-5 py-3 border-b border-[#f0eee6] last:border-b-0">
                  <SkeletonBox width={13} height={13} rounded="3px" />
                  <SkeletonBox height={13} width={120 + (i % 3) * 30} rounded="4px" />
                </div>
              ))}
            </div>
          ) : treeError ? (
            <ErrorBox text="Could not load the subcategories." onRetry={refetchTree} />
          ) : subcategories.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="m-0 text-[13px] text-slate">No subcategories under your main category yet.</p>
              <button type="button" onClick={() => setModal('subcategory')} className="mt-1 min-h-[44px] text-[13px] font-semibold text-brand-royal underline bg-transparent border-none cursor-pointer">
                Request the first one
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {flatten(subcategories, 0).map(({ node: sub, depth }) => {
                const c = usage?.counts[sub._id];
                return (
                  <Link
                    key={sub._id}
                    to={`${base}?category=${sub._id}`}
                    style={{ paddingInlineStart: 20 + depth * 20 }}
                    className="flex items-center gap-2.5 pe-4 py-3 min-h-[48px] border-b border-[#f0eee6] last:border-b-0 no-underline transition-colors duration-150 hover:bg-cream"
                  >
                    <Tag size={13} className="text-slate shrink-0" />
                    <span className="text-[13px] font-medium text-carbon flex-1 min-w-0 truncate">{sub.name}</span>
                    <span className="shrink-0 text-end text-[12px] text-slate">
                      {!usage ? (
                        usageError ? '—' : <SkeletonBox width={70} height={12} rounded="4px" />
                      ) : c && c.total > 0 ? (
                        <>
                          <span className="font-semibold text-carbon">{c.active}</span> active
                          <span aria-hidden="true"> · </span>
                          <span className="font-semibold text-carbon">{c.draft}</span> draft
                        </>
                      ) : 'No products'}
                    </span>
                    <ChevronRight size={14} className="text-slate shrink-0 rtl:rotate-180" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* My requests */}
        <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
          <div className="px-5 py-[14px] border-b border-bone">
            <p className="m-0 text-[13px] font-bold text-charcoal">Your requests</p>
            <p className="m-0 text-[12px] text-slate mt-0.5">{pendingCount} of 3 waiting for review.</p>
          </div>
          {requestsError ? (
            <ErrorBox text={requestsError} onRetry={loadRequests} />
          ) : requests === null ? (
            <div className="flex flex-col gap-3 p-5" aria-busy="true">
              {Array.from({ length: 2 }).map((_, i) => <SkeletonBox key={i} height={44} rounded="8px" />)}
            </div>
          ) : requests.length === 0 ? (
            <p className="px-5 py-6 m-0 text-center text-[13px] text-slate">No requests yet.</p>
          ) : (
            <ul className="m-0 p-0 list-none divide-y divide-[#f0eee6]">
              {requests.map(r => (
                <li key={r._id} className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[13px] font-semibold text-carbon break-words">{r.name}</p>
                      <p className="m-0 text-[12px] text-slate">
                        {r.type === 'main_change' ? 'Main category change' : 'Subcategory'} · {new Date(r.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-medium ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </div>
                  {r.adminNote && <p className="mt-1.5 mb-0 text-[12px] text-slate break-words">Edudeen: {r.adminNote}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {modal && storeId && (
        <CategoryRequestModal
          storeId={storeId}
          type={modal}
          onClose={() => setModal(null)}
          onCreated={r => setRequests(prev => [r, ...(prev ?? [])])}
        />
      )}
    </>
  );
}
