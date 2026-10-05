import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import {
  StarRating, EmptyState, SkeletonBox, Card, Badge,
  Table, type TableColumn, ActionMenu, type ActionMenuItem,
  Modal, Button,
} from '@/components/comman/ui';
import { Star, Flag, MessageSquare, Trash2, ImageIcon } from 'lucide-react';
import {
  apiGetStoreReviews, apiReplyToReview, apiEditReply, apiFlagReview, apiUnflagReview, apiModerateDeleteReview,
  type StoreReviewEntry, type StoreReviewStats,
} from '@/api/services/rating';

const AVATAR_PALETTE = ['#FDECEA:#C0392B', '#EAF3FB:#2156A8', '#EAF7EF:#1E7A3C', '#FFF4E5:#B36200', '#E5F4FB:#1A6A8A'];
function avatarStyle(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_PALETTE.length;
  const [bg, color] = AVATAR_PALETTE[idx].split(':');
  return { bg, color };
}

const PER_PAGE = 10;

export function StoreReviews() {
  usePageTitle('Reviews');
  const { storeId } = useStoreWorkspace();

  const [reviews, setReviews] = useState<StoreReviewEntry[]>([]);
  const [stats, setStats]     = useState<StoreReviewStats | null>(null);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [ratingFilter, setRatingFilter] = useState('');
  const [sortFilter, setSortFilter]     = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [replyingTo, setReplyingTo] = useState<StoreReviewEntry | null>(null);
  const [editingReplyOf, setEditingReplyOf] = useState<StoreReviewEntry | null>(null);
  const [actionError, setActionError] = useState('');
  const [deletingReview, setDeletingReview] = useState<StoreReviewEntry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGetStoreReviews(storeId, {
      page,
      rating: ratingFilter ? parseInt(ratingFilter) : undefined,
      // Reply/flag filter runs server-side so it spans every page.
      status: (sortFilter || undefined) as 'replied' | 'unreplied' | 'flagged' | undefined,
    })
      .then(res => {
        if (cancelled) return;
        setReviews(res.data.reviews ?? []);
        setStats(res.data.stats);
        setTotal(res.data.pagination.total);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load reviews.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, page, ratingFilter, sortFilter, refreshKey]);

  function reload() { setRefreshKey(k => k + 1); }

  const filtered = reviews;

  async function handleFlag(r: StoreReviewEntry) {
    setActionError('');
    try { await apiFlagReview(r.reviewId); reload(); }
    catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to flag review.'); }
  }

  async function handleUnflag(r: StoreReviewEntry) {
    setActionError('');
    try { await apiUnflagReview(r.reviewId); reload(); }
    catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to unflag review.'); }
  }

  async function confirmModerateDelete() {
    if (!deletingReview) return;
    setDeleteBusy(true);
    setActionError('');
    try {
      await apiModerateDeleteReview(deletingReview.reviewId);
      setDeletingReview(null);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove review.');
    } finally {
      setDeleteBusy(false);
    }
  }

  const columns: TableColumn<StoreReviewEntry>[] = [
    {
      key: 'sno', header: 'S.No', width: '56px',
      render: (_r, i) => <span className="text-[12px] text-slate">{(page - 1) * PER_PAGE + i + 1}</span>,
    },
    {
      key: 'customer', header: 'Customer', width: '220px',
      render: r => {
        const av = avatarStyle(r.customer.name);
        const initials = r.customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        return (
          <div className="flex items-center gap-[10px]">
            <div className="w-8 h-8 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0" style={{ background: av.bg, color: av.color }}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-charcoal truncate">{r.customer.name}</p>
              {r.isVerifiedPurchase && <p className="text-[10px] text-success font-medium">Verified Purchase</p>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'rating', header: 'Rating', width: '110px',
      render: r => r.rating != null ? <StarRating value={r.rating} size={12} /> : <span className="text-slate text-[12px]">—</span>,
    },
    {
      key: 'review', header: 'Review',
      render: r => (
        <div className="max-w-[360px]">
          {(r.comments ?? []).length > 0 ? (
            <p className="text-[13px] text-charcoal leading-[1.5] line-clamp-2">{r.comments[0].text}</p>
          ) : (
            <span className="text-[12px] text-slate italic">No comment</span>
          )}
          {(r.media ?? []).length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate mt-1">
              <ImageIcon size={11} /> {r.media.length} photo{r.media.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', width: '150px',
      render: r => (
        <div className="flex flex-wrap gap-1">
          {r.isFlagged && <Badge color="red">Flagged</Badge>}
          {r.sellerReply ? <Badge color="green">Replied</Badge> : <Badge color="gray">Awaiting reply</Badge>}
        </div>
      ),
    },
    {
      key: 'createdAt', header: 'Date', width: '110px',
      render: r => <span className="text-[12px] text-slate">{new Date(r.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions', header: '', align: 'right', width: '60px',
      render: r => {
        const items: ActionMenuItem[] = r.sellerReply
          ? [
              { label: 'Edit Reply', icon: <MessageSquare size={13} />, onClick: () => setEditingReplyOf(r) },
              r.isFlagged
                ? { label: 'Unflag', onClick: () => handleUnflag(r) }
                : { label: 'Flag Review', icon: <Flag size={13} />, onClick: () => handleFlag(r) },
              { label: 'Remove', icon: <Trash2 size={13} />, danger: true, onClick: () => { setDeletingReview(r); setActionError(''); } },
            ]
          : [
              { label: 'Reply', icon: <MessageSquare size={13} />, onClick: () => setReplyingTo(r) },
              r.isFlagged
                ? { label: 'Unflag', onClick: () => handleUnflag(r) }
                : { label: 'Flag Review', icon: <Flag size={13} />, onClick: () => handleFlag(r) },
              { label: 'Remove', icon: <Trash2 size={13} />, danger: true, onClick: () => { setDeletingReview(r); setActionError(''); } },
            ];
        return <ActionMenu items={items} />;
      },
    },
  ];

  return (
    <>
      <StorePageHeader
        title="Reviews & Reputation"
        subtitle="Monitor, respond to, and learn from customer feedback."
      />

      <div className="px-4 lg:px-7 pb-8 pt-5 flex flex-col gap-5">

        {actionError && (
          <div className="flex items-center justify-between gap-3 text-[13px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="text-[11px] font-semibold text-error bg-transparent border-none cursor-pointer shrink-0">Dismiss</button>
          </div>
        )}

        {/* ── Top 2-col ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">

          {/* Rating Summary */}
          <Card>
            {loading && !stats ? (
              <div className="flex flex-col gap-3">
                <SkeletonBox height={70} width="100%" rounded="8px" />
                <SkeletonBox height={90} width="100%" rounded="8px" />
              </div>
            ) : (
              <>
                <div className="text-center mb-5">
                  <p className="text-[48px] font-bold text-charcoal leading-none mb-1.5">{stats?.averageRating.toFixed(1) ?? '0.0'}</p>
                  <div className="mb-1.5 flex justify-center"><StarRating value={stats?.averageRating ?? 0} size={20} /></div>
                  <p className="text-xs text-slate">Based on {stats?.totalReviews ?? 0} reviews</p>
                </div>
                <div className="flex flex-col gap-2">
                  {(['5', '4', '3', '2', '1'] as const).map(star => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs text-graphite w-7 shrink-0">{star} ★</span>
                      <div className="flex-1 h-1.5 rounded-[3px] bg-bone overflow-hidden">
                        <div className="h-full rounded-[3px] bg-brand-orange" style={{ width: stats?.ratingBreakdown[star] ?? '0%' }} />
                      </div>
                      <span className="text-[11px] text-slate w-7 text-right shrink-0">{stats?.ratingBreakdown[star] ?? '0%'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Reputation Insights */}
          <Card>
            <p className="text-[13px] font-semibold text-charcoal mb-4">Reputation Insights</p>
            {loading && !stats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonBox key={i} height={74} rounded="10px" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { value: stats?.responseRate ?? '0%',    label: 'Response Rate',     sub: 'Reply to all reviews', color: '#2D8A4E' },
                  { value: stats?.avgResponseTime ?? '—',  label: 'Avg Response Time', sub: 'Within 24hrs is great', color: '#1A72C2' },
                  { value: stats?.fiveStarRate ?? '0%',    label: '5-Star Rate',       sub: '',                      color: '#2D8A4E' },
                  { value: String(stats?.reviewsThisMonth ?? 0), label: 'Reviews This Month', sub: '', color: '#141413' },
                  { value: String(stats?.flaggedReviews ?? 0),   label: 'Flagged Reviews',    sub: 'Under moderation', color: '#C08B1E' },
                  { value: String(stats?.totalReviews ?? 0),     label: 'Total Reviews',      sub: '',                 color: '#141413' },
                ].map(item => (
                  <div key={item.label} className="bg-cream rounded-[10px] px-4 py-[14px]">
                    <p className="text-[22px] font-bold leading-[1.15]" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-xs font-medium text-graphite mt-1">{item.label}</p>
                    {item.sub && <p className="text-[11px] text-slate mt-0.5">{item.sub}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Reviews table ── */}
        <Card padding="none">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-[10px] px-5 py-4 border-b border-bone">
            <select
              value={ratingFilter}
              onChange={e => { setRatingFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-[150px] px-3 py-2 text-[13px] border border-bone rounded-lg bg-white text-charcoal outline-none cursor-pointer"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
            <select
              value={sortFilter}
              onChange={e => { setSortFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-[140px] px-3 py-2 text-[13px] border border-bone rounded-lg bg-white text-charcoal outline-none cursor-pointer"
            >
              <option value="">All</option>
              <option value="replied">Replied</option>
              <option value="unreplied">Unreplied</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>

          {loading ? (
            <div className="flex flex-col gap-2 p-5">
              {[1, 2, 3, 4].map(i => <SkeletonBox key={i} height={56} rounded="8px" />)}
            </div>
          ) : error ? (
            <p className="text-[13px] text-error p-5">{error}</p>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Star size={28} className="text-brand-orange" />} title="No reviews found" description="Reviews matching your filters will show up here." />
          ) : (
            <Table
              columns={columns}
              data={filtered}
              keyExtractor={r => r.reviewId}
              pagination={{ page, total, perPage: PER_PAGE, onChange: setPage, label: 'reviews' }}
            />
          )}
        </Card>
      </div>

      {replyingTo && (
        <ReplyModal
          title="Reply to Review"
          initialText=""
          onClose={() => setReplyingTo(null)}
          onSubmit={async text => { await apiReplyToReview(replyingTo.reviewId, text); setReplyingTo(null); reload(); }}
        />
      )}

      {editingReplyOf?.sellerReply && (
        <ReplyModal
          title="Edit Reply"
          initialText={editingReplyOf.sellerReply.text}
          onClose={() => setEditingReplyOf(null)}
          onSubmit={async text => { await apiEditReply(editingReplyOf.reviewId, text); setEditingReplyOf(null); reload(); }}
        />
      )}

      {deletingReview && (
        <Modal title="Remove Review" onClose={() => setDeletingReview(null)} mobileSheet footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingReview(null)} disabled={deleteBusy}>Cancel</Button>
            <Button variant="danger" onClick={confirmModerateDelete} loading={deleteBusy}>Remove Review</Button>
          </>
        }>
          <p className="text-[13px] text-charcoal leading-[1.6]">
            Remove this review from <strong>{deletingReview.customer.name}</strong> permanently? This cannot be undone.
          </p>
          {actionError && <p className="text-[12px] text-error mt-2">{actionError}</p>}
        </Modal>
      )}
    </>
  );
}

function ReplyModal({
  title, initialText, onClose, onSubmit,
}: {
  title: string;
  initialText: string;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function submit() {
    if (!text.trim()) { setError('Reply cannot be empty.'); return; }
    setError('');
    setSaving(true);
    try {
      await onSubmit(text.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reply.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[420px] bg-white rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bone">
          <p className="text-[15px] font-bold text-charcoal">{title}</p>
        </div>
        <div className="px-5 py-4">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            placeholder="Write your reply…"
            className="w-full border border-bone rounded-lg px-3 py-2 text-[13px] text-charcoal outline-none box-border resize-vertical mb-3"
          />
          {error && <p className="text-[12px] text-error mb-3">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-[9px] bg-white border border-bone rounded-lg text-[13px] text-graphite cursor-pointer">
              Cancel
            </button>
            <button onClick={submit} disabled={saving} className="flex-1 py-[9px] bg-brand-orange border-0 rounded-lg text-[13px] font-semibold text-white cursor-pointer disabled:opacity-50">
              {saving ? 'Saving…' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
