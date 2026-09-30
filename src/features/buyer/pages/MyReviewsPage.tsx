import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star, ImageOff, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import {
  Card, EmptyState, StarRating, SkeletonBox,
  Table, type TableColumn, ActionMenu, type ActionMenuItem,
  Modal, Button, PageHeader,
} from '@/components/comman/ui';
import { apiGetMyReviews, apiDeleteReview, type MyReviewEntry } from '@/api/services/rating';
import { ReviewFormModal } from '@/features/buyer/components/ReviewFormModal';
import { useToast } from '@/contexts/ToastContext';

const PER_PAGE = 10;

export function ReviewsTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reviews, setReviews] = useState<MyReviewEntry[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(() => { const p = Number(searchParams.get('page')); return p > 0 ? p : 1; });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<MyReviewEntry | null>(null);
  const [deleting, setDeleting] = useState<MyReviewEntry | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGetMyReviews(page)
      .then(res => {
        if (cancelled) return;
        setReviews(res.data.reviews ?? []);
        setTotal(res.data.pagination.total);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load your reviews.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, refreshKey]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (page > 1) next.set('page', String(page));
    else next.delete('page');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await apiDeleteReview(deleting.reviewId);
      setDeleting(null);
      setRefreshKey(k => k + 1);
      toast.success('Review deleted');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete review.';
      setDeleteError(message);
      toast.error(message);
    } finally {
      setDeleteBusy(false);
    }
  }

  const columns: TableColumn<MyReviewEntry>[] = [
    {
      key: 'product', header: 'Product', width: '240px',
      render: r => (
        <button
          // /product/:slug also resolves a raw product id (and then normalizes
          // the URL to the real slug), so the id is a working fallback.
          onClick={() => r.product && navigate(`/product/${r.product.slug || r.product.productId}`)}
          className="flex items-center gap-[10px] bg-transparent border-0 cursor-pointer text-left p-0"
        >
          <div className="w-10 h-10 rounded-lg bg-cream border border-bone overflow-hidden shrink-0">
            {r.product?.image ? (
              <img loading="lazy" decoding="async" src={r.product.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><ImageOff size={14} className="text-slate" /></div>
            )}
          </div>
          <span className="text-[13px] font-semibold text-charcoal truncate max-w-[160px]">{r.product?.name ?? 'Product'}</span>
        </button>
      ),
    },
    {
      key: 'rating', header: 'Rating', width: '110px',
      render: r => r.rating != null ? <StarRating value={r.rating} size={12} /> : <span className="text-slate text-[12px]">—</span>,
    },
    {
      key: 'review', header: 'Your Review',
      render: r => (
        <div className="max-w-[320px]">
          {r.comments?.length > 0 ? (
            <p className="text-[13px] text-charcoal leading-[1.5] line-clamp-2">{r.comments[0].text}</p>
          ) : (
            <span className="text-[12px] text-slate italic">No comment</span>
          )}
        </div>
      ),
    },
    {
      key: 'sellerReply', header: 'Seller Reply', width: '220px',
      render: r => r.sellerReply
        ? <p className="text-[12px] text-charcoal leading-[1.5] line-clamp-2">{r.sellerReply.text}</p>
        : <span className="text-[12px] text-slate italic">No reply yet</span>,
    },
    {
      key: 'createdAt', header: 'Date', width: '110px',
      render: r => <span className="text-[12px] text-slate">{new Date(r.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions', header: '', align: 'right', width: '60px',
      render: r => {
        const items: ActionMenuItem[] = [
          { label: 'Edit', icon: <Pencil size={13} />, onClick: () => setEditing(r) },
          { label: 'Delete', icon: <Trash2 size={13} />, danger: true, onClick: () => { setDeleting(r); setDeleteError(''); } },
        ];
        return <ActionMenu items={items} />;
      },
    },
  ];

  return (
    <div>
    <Card padding="none">
      {/* Header — desktop only; mobile's AccountLayout top bar already shows "Reviews". */}
      <div className="hidden lg:block px-5 pt-5 pb-4 border-b border-bone">
        <PageHeader
          eyebrow="Account"
          title="Reviews"
          description={`${total} review${total !== 1 ? 's' : ''} written`}
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 p-5">
          {[1, 2, 3].map(i => <SkeletonBox key={i} height={56} rounded="8px" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-[13px] text-error text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>Try again</Button>
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<Star size={28} className="text-brand-orange opacity-55" />}
          title="No reviews yet"
          description="Reviews you write for products will show up here."
        />
      ) : (
        <Table
          columns={columns}
          data={reviews}
          keyExtractor={r => r.reviewId}
          pagination={{ page, total, perPage: PER_PAGE, onChange: setPage, label: 'reviews' }}
        />
      )}

      {editing && (
        <ReviewFormModal
          mode="edit"
          reviewId={editing.reviewId}
          initialRating={editing.rating ?? 0}
          initialComment={editing.comments?.[0]?.text ?? ''}
          initialMedia={editing.media}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setRefreshKey(k => k + 1); }}
        />
      )}

      {deleting && (
        <Modal
          title="Delete Review"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete} loading={deleteBusy}>Delete Review</Button>
            </>
          }
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            Delete your review for <strong>{deleting.product?.name ?? 'this product'}</strong>? This cannot be undone.
          </p>
          {deleteError && (
            <div className="flex items-center gap-2 mt-3 text-[12px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="shrink-0" />
              {deleteError}
            </div>
          )}
        </Modal>
      )}
    </Card>
    </div>
  );
}
