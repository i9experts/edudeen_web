import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShieldCheck, Pencil, Trash2, Star, ThumbsUp, ImageIcon, ChevronLeft, ChevronRight, X, Store, AlertTriangle,
} from 'lucide-react';
import { StarRating, Button, Badge, EmptyState, SkeletonBox, Pagination, FilterDropdown, Modal } from '@/components/comman/ui';
import { useFocusTrap } from '@/components/comman/ui/useFocusTrap';
import { TokenStorage } from '@/api/services/auth';
import { apiGetProductReviews, apiDeleteReview, apiToggleReviewHelpful, type ProductReviewEntry, type ProductReviewStats } from '@/api/services/rating';
import { ReviewFormModal } from '../components/ReviewFormModal';
import { useToast } from '@/contexts/ToastContext';

const AVATAR_PALETTE = [
  ['#FDECEA', '#C0392B'], ['#EAF3FB', '#2156A8'], ['#EAF7EF', '#1E7A3C'],
  ['#FFF4E5', '#B36200'], ['#F1EEFB', '#5B3EC4'], ['#E5F4FB', '#1A6A8A'],
];
function avatarStyle(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_PALETTE.length;
  const [bg, color] = AVATAR_PALETTE[idx];
  return { bg, color };
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

type SortOption = 'recent' | 'highest' | 'lowest';
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'lowest', label: 'Lowest Rated' },
];

const PAGE_SIZE = 10;
// Fetched once per product and then filtered/sorted/paginated entirely client-side.
const FETCH_LIMIT = 100;

// ── Fullscreen image lightbox ──────────────────────────────────────────────────
function ReviewLightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, onClose);

  const go = (delta: number) => setIndex(i => (i + delta + images.length) % images.length);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={containerRef} role="dialog" aria-modal="true" tabIndex={-1} className="relative w-full max-w-3xl outline-none">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-11 right-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white border-0 cursor-pointer hover:bg-white/20 transition-colors"
        >
          <X size={18} />
        </button>
        <img src={images[index]} alt="" className="w-full max-h-[78vh] object-contain rounded-xl" />
        {images.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white flex items-center justify-center border-0 cursor-pointer hover:bg-cream transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white flex items-center justify-center border-0 cursor-pointer hover:bg-cream transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <p className="text-center text-[12px] text-white mt-3">{index + 1} / {images.length}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Review photo strip ──────────────────────────────────────────────────────────
function ReviewPhotoStrip({ media, onOpen }: { media: string[]; onOpen: (index: number) => void }) {
  const VISIBLE = 4;
  const shown = media.slice(0, VISIBLE);
  const remaining = media.length - VISIBLE;

  return (
    <div className="flex gap-2 mt-3 flex-wrap">
      {shown.map((url, i) => {
        const isLastVisible = i === VISIBLE - 1 && remaining > 0;
        return (
          <button
            key={i}
            onClick={() => onOpen(i)}
            className="relative w-[72px] h-[72px] sm:w-[86px] sm:h-[86px] rounded-lg overflow-hidden border border-bone cursor-pointer p-0 hover:opacity-85 transition-opacity"
          >
            <img loading="lazy" decoding="async" src={url} alt="" className="w-full h-full object-cover" />
            {isLastVisible && (
              <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[13px] font-semibold">
                +{remaining}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Rating summary hero: average score + distribution bars + photo/clear filters ──
interface RatingSummaryCardProps {
  stats: ProductReviewStats;
  ratingFilter: number | null;
  withPhotosOnly: boolean;
  hasPhotoReviews: boolean;
  filtersActive: boolean;
  onSelectRating: (star: number) => void;
  onToggleWithPhotos: () => void;
  onClearFilters: () => void;
}
function RatingSummaryCard({
  stats, ratingFilter, withPhotosOnly, hasPhotoReviews, filtersActive, onSelectRating, onToggleWithPhotos, onClearFilters,
}: RatingSummaryCardProps) {
  return (
    <div className="rounded-2xl bg-white border border-bone p-5 sm:p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        <div className="flex flex-row lg:flex-col items-center lg:items-start gap-4 lg:gap-2 shrink-0 lg:w-[170px]">
          <p className="text-[48px] sm:text-[64px] font-black text-carbon leading-none tracking-tight">
            {stats.averageRating.toFixed(1)}
          </p>
          <div className="flex flex-col items-start gap-1">
            <StarRating value={stats.averageRating} size={18} />
            <p className="text-[12px] text-slate">{stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-[7px] min-w-0 lg:border-l lg:border-bone lg:pl-8">
          {(['5', '4', '3', '2', '1'] as const).map(star => {
            const count = stats.ratingBreakdown[star] ?? 0;
            const pct = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
            const active = ratingFilter === Number(star);
            return (
              <button
                key={star}
                onClick={() => onSelectRating(Number(star))}
                className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 group"
              >
                <span className={`text-[12px] w-9 text-left shrink-0 ${active ? 'font-bold text-brand-orange' : 'text-graphite'}`}>{star} ★</span>
                <div className="flex-1 h-2 rounded-full bg-[#eee9df] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${active ? 'bg-gradient-to-r from-brand-orange to-[#f59e0b]' : 'bg-[#d9d6cc] group-hover:bg-brand-orange/60'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate w-7 text-right shrink-0">{count}</span>
              </button>
            );
          })}
          {hasPhotoReviews && (
            <button
              onClick={onToggleWithPhotos}
              className={`inline-flex items-center gap-[6px] self-start text-[12px] font-semibold rounded-lg px-[10px] py-[5px] border cursor-pointer transition-colors mt-1 ${withPhotosOnly
                  ? 'bg-brand-pale-orange text-brand-deep-orange border-transparent'
                  : 'bg-white text-slate border-bone hover:bg-cream'
                }`}
            >
              <ImageIcon size={12} /> With Photos
            </button>
          )}
          {filtersActive && (
            <button
              onClick={onClearFilters}
              className="self-start text-[12px] font-semibold text-brand-orange bg-transparent border-0 cursor-pointer mt-1 hover:opacity-75"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Toolbar: sort control ─────────────────────────────────────────────────────────
interface ReviewsToolbarProps {
  hasReviews: boolean;
  sortBy: SortOption;
  onChangeSort: (value: string) => void;
}
function ReviewsToolbar({ hasReviews, sortBy, onChangeSort }: ReviewsToolbarProps) {
  if (!hasReviews) return null;
  return (
    <div className="flex items-center justify-end gap-2 mb-5">
      <span className="text-[12px] text-slate">Sort by</span>
      <FilterDropdown options={SORT_OPTIONS} value={sortBy} onChange={onChangeSort} />
    </div>
  );
}

// ── Single review card ───────────────────────────────────────────────────────────
interface ReviewCardProps {
  review: ProductReviewEntry;
  storeName?: string | null;
  onToggleHelpful: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenPhoto: (index: number) => void;
}
function ReviewCard({ review: r, storeName, onToggleHelpful, onEdit, onDelete, onOpenPhoto }: ReviewCardProps) {
  const av = avatarStyle(r.customerName);
  const initials = r.isOwn ? 'Y' : r.customerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`rounded-2xl p-4 sm:p-5 bg-white border transition-colors hover:border-slate/30 ${r.isOwn ? 'bg-brand-pale-orange/40 border-brand-orange/30' : 'border-bone'
      }`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: av.bg, color: av.color }}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-bold text-carbon">{r.customerName}</span>
              {r.isVerifiedPurchase && (
                <Badge color="green" size="sm">
                  <ShieldCheck size={11} />
                  Verified Purchase
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-[3px]">
              {r.rating != null && <StarRating value={r.rating} size={12} />}
              <span className="text-[11px] text-slate">{timeAgo(r.createdAt)}</span>
            </div>
          </div>
        </div>

        {r.isOwn && (
          <div className="flex gap-1 shrink-0">
            <button onClick={onEdit} title="Edit your review" className="w-7 h-7 flex items-center justify-center rounded-lg border border-bone bg-white text-slate cursor-pointer hover:bg-cream transition-colors">
              <Pencil size={12} />
            </button>
            <button onClick={onDelete} title="Delete your review" className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#f5c6c2] bg-error-bg text-error cursor-pointer hover:bg-error hover:text-white transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {r.comments?.length > 0 && (
        <div className="mt-3">
          {r.comments.map((c, i) => (
            <p key={i} className="text-[13px] text-graphite leading-[1.6] mb-1">{c.text}</p>
          ))}
        </div>
      )}

      {r.media?.length > 0 && (
        <ReviewPhotoStrip media={r.media} onOpen={onOpenPhoto} />
      )}

      {r.sellerReply && (
        <div className="mt-3 ml-2 pl-3 border-l-[3px] border-brand-orange/30">
          <div className="flex items-center gap-[6px] mb-1">
            <div className="w-5 h-5 rounded-full bg-bone flex items-center justify-center shrink-0">
              <Store size={11} className="text-graphite" />
            </div>
            <p className="text-[11px] font-semibold text-brand-orange">
              Response from {storeName || 'the Seller'}
            </p>
          </div>
          <p className="text-[12px] text-graphite leading-[1.5]">{r.sellerReply.text}</p>
        </div>
      )}

      <div className="flex items-center justify-end mt-3 pt-3 border-t border-bone">
        <button
          onClick={onToggleHelpful}
          className={`flex items-center gap-[6px] text-[11px] font-medium px-[10px] py-[5px] rounded-lg border cursor-pointer transition-colors ${r.helpfulByMe
              ? 'bg-brand-pale-orange text-brand-deep-orange border-transparent'
              : 'bg-transparent text-slate border-bone hover:bg-cream'
            }`}
        >
          <ThumbsUp size={11} className={r.helpfulByMe ? 'fill-brand-deep-orange' : ''} />
          Helpful{r.helpfulCount > 0 ? ` · ${r.helpfulCount}` : ''}
        </button>
      </div>
    </div>
  );
}

interface ProductReviewsSectionProps {
  productId: string;
  storeName?: string | null;
}

export function ProductReviewsSection({ productId, storeName }: ProductReviewsSectionProps) {
  const toast = useToast();
  const [allReviews, setAllReviews] = useState<ProductReviewEntry[]>([]);
  const [stats, setStats] = useState<ProductReviewStats | null>(null);
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [withPhotosOnly, setWithPhotosOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showWrite, setShowWrite] = useState(false);
  const [editingReview, setEditingReview] = useState<ProductReviewEntry | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [deleting, setDeleting] = useState<ProductReviewEntry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isLoggedIn = TokenStorage.isLoggedIn();
  const hasOwnReview = allReviews.some(r => r.isOwn);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Fetched once (a generous batch) per product; rating/sort/photo filtering and
    // pagination below all happen client-side against this already-fetched set.
    apiGetProductReviews(productId, { limit: FETCH_LIMIT })
      .then(res => {
        if (cancelled) return;
        setAllReviews(res.data.reviews ?? []);
        setStats(res.data.stats);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load reviews.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId, refreshKey]);

  // "Write a review" links from My Orders / order success land on
  // /product/<slug>#write-review — open the form once reviews have loaded
  // (so we know the buyer hasn't already reviewed this product).
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current || loading || !isLoggedIn) return;
    if (window.location.hash !== '#write-review') return;
    autoOpenedRef.current = true;
    if (!hasOwnReview) setShowWrite(true);
  }, [loading, isLoggedIn, hasOwnReview]);

  const hasPhotoReviews = useMemo(() => allReviews.some(r => r.media?.length > 0), [allReviews]);

  const filteredSorted = useMemo(() => {
    let list = allReviews;
    if (ratingFilter) list = list.filter(r => r.rating === ratingFilter);
    if (withPhotosOnly) list = list.filter(r => r.media?.length > 0);
    return [...list].sort((a, b) => {
      if (sortBy === 'highest') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === 'lowest') return (a.rating ?? 0) - (b.rating ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [allReviews, ratingFilter, withPhotosOnly, sortBy]);

  const pageItems = filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtersActive = ratingFilter !== null || withPhotosOnly;

  function selectRating(star: number) {
    setRatingFilter(prev => (prev === star ? null : star));
    setPage(1);
  }

  function toggleWithPhotos() {
    setWithPhotosOnly(v => !v);
    setPage(1);
  }

  function changeSort(v: string) {
    setSortBy(v as SortOption);
    setPage(1);
  }

  function clearFilters() {
    setRatingFilter(null);
    setWithPhotosOnly(false);
    setPage(1);
  }

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

  async function toggleHelpful(reviewId: string) {
    if (!isLoggedIn) return;
    // Optimistic update — flip immediately, roll back only if the request fails.
    setAllReviews(prev => prev.map(r => r.reviewId === reviewId
      ? { ...r, helpfulByMe: !r.helpfulByMe, helpfulCount: r.helpfulCount + (r.helpfulByMe ? -1 : 1) }
      : r));
    try {
      const res = await apiToggleReviewHelpful(reviewId);
      setAllReviews(prev => prev.map(r => r.reviewId === reviewId
        ? { ...r, helpfulByMe: res.data.helpfulByMe, helpfulCount: res.data.helpfulCount }
        : r));
    } catch {
      setAllReviews(prev => prev.map(r => r.reviewId === reviewId
        ? { ...r, helpfulByMe: !r.helpfulByMe, helpfulCount: r.helpfulCount + (r.helpfulByMe ? -1 : 1) }
        : r));
    }
  }

  const hasReviews = !!stats && stats.totalReviews > 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h2 className="text-[20px] font-bold text-carbon">
            Ratings & Reviews
          </h2>
          <p className="text-[12px] text-slate mt-1">
            Verified customer feedback and product experiences
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasReviews && (
            <Badge color="green" size="md">
              <ShieldCheck size={13} />
              {stats!.totalReviews} Verified Reviews
            </Badge>
          )}
          {isLoggedIn && !hasOwnReview && (
            <Button variant="outline" size="sm" icon={<Pencil size={13} />} onClick={() => setShowWrite(true)}>
              Write a Review
            </Button>
          )}
        </div>
      </div>

      {hasReviews && (
        <RatingSummaryCard
          stats={stats!}
          ratingFilter={ratingFilter}
          withPhotosOnly={withPhotosOnly}
          hasPhotoReviews={hasPhotoReviews}
          filtersActive={filtersActive}
          onSelectRating={selectRating}
          onToggleWithPhotos={toggleWithPhotos}
          onClearFilters={clearFilters}
        />
      )}

      <ReviewsToolbar
        hasReviews={hasReviews}
        sortBy={sortBy}
        onChangeSort={changeSort}
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map(i => <SkeletonBox key={i} height={90} rounded="12px" />)}
        </div>
      ) : error ? (
        <p className="text-[13px] text-error">{error}</p>
      ) : !hasReviews ? (
        <EmptyState
          icon={<Star size={26} className="text-brand-orange opacity-55" />}
          title="Be the first to review this product"
          description="Your feedback helps other customers make better decisions."
        />
      ) : filteredSorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-[13px] text-slate">No reviews match your filters.</p>
          <button onClick={clearFilters} className="text-[12px] font-medium text-brand-orange bg-transparent border-0 cursor-pointer hover:opacity-75">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4">
            {pageItems.map(r => (
              <ReviewCard
                key={r.reviewId}
                review={r}
                storeName={storeName}
                onToggleHelpful={() => toggleHelpful(r.reviewId)}
                onEdit={() => setEditingReview(r)}
                onDelete={() => { setDeleting(r); setDeleteError(''); }}
                onOpenPhoto={i => setLightbox({ images: r.media, index: i })}
              />
            ))}
          </div>

          {filteredSorted.length > PAGE_SIZE && (
            <div className="flex items-center justify-center pt-1">
              <Pagination page={page} total={filteredSorted.length} perPage={PAGE_SIZE} onChange={setPage} />
            </div>
          )}
        </div>
      )}

      {showWrite && (
        <ReviewFormModal
          mode="create"
          productId={productId}
          onClose={() => setShowWrite(false)}
          onSaved={() => { setShowWrite(false); setPage(1); clearFilters(); setRefreshKey(k => k + 1); }}
        />
      )}

      {editingReview && (
        <ReviewFormModal
          mode="edit"
          reviewId={editingReview.reviewId}
          initialRating={editingReview.rating ?? 0}
          initialComment={editingReview.comments?.[0]?.text ?? ''}
          initialMedia={editingReview.media}
          onClose={() => setEditingReview(null)}
          onSaved={() => { setEditingReview(null); setRefreshKey(k => k + 1); }}
        />
      )}

      {lightbox && (
        <ReviewLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
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
            Delete your review? This cannot be undone.
          </p>
          {deleteError && (
            <div className="flex items-center gap-2 mt-3 text-[12px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="shrink-0" />
              {deleteError}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
