import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlParam, useUrlPage } from '@/hooks/useUrlParam';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import {
  StarRating, EmptyState, SkeletonBox, Card, Badge, Button,
  Table, type TableColumn, ActionMenu, type ActionMenuItem,
} from '@/components/comman/ui';
import { Star, Flag, MessageSquare, ImageIcon, Search, Loader2, Send } from 'lucide-react';
import {
  apiGetStoreReviews, apiReplyToReview, apiEditReply, apiGetReplyTemplates,
  type StoreReviewEntry, type StoreReviewStats, type StoreReviewCounts, type ReplyTemplate,
} from '@/api/services/rating';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { apiReviewReplyDraft } from '@/api/services/aiFeatures';
import { ReplyModal, ReportModal, TemplatesModal, RequestReviewsModal } from './ReviewModals';
import { ReviewInsights } from './ReviewInsights';

const AVATAR_PALETTE = ['#FDECEA:#C0392B', '#EAF3FB:#2156A8', '#EAF7EF:#1E7A3C', '#FFF4E5:#B36200', '#E5F4FB:#1A6A8A'];
function avatarStyle(name: string) {
  const [bg, color] = AVATAR_PALETTE[(name.charCodeAt(0) || 0) % AVATAR_PALETTE.length].split(':');
  return { bg, color };
}

const PER_PAGE = 10;
const SORTS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' },
  { value: 'lowest', label: 'Lowest rating' }, { value: 'highest', label: 'Highest rating' },
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`shrink-0 whitespace-nowrap px-3 min-h-[36px] rounded-full border text-[12px] font-semibold cursor-pointer transition-colors ${active ? 'bg-brand-royal border-brand-royal text-white' : 'bg-white border-bone text-graphite hover:border-brand-royal'}`}>
      {children}
    </button>
  );
}

function Kpi({ label, value, sub, tip, color }: { label: string; value: string; sub?: string; tip?: string; color?: string }) {
  return (
    <div className="bg-cream rounded-[10px] px-4 py-[14px] min-w-0">
      <p className="text-[22px] font-bold leading-[1.15]" style={{ color: color ?? '#141413' }}>{value}</p>
      <p className="text-xs font-medium text-graphite mt-1">{label}</p>
      {sub && <p className="text-[12px] text-slate mt-0.5">{sub}</p>}
      {tip && <p className="text-[12px] text-brand-royal mt-1.5">{tip}</p>}
    </div>
  );
}

export function StoreReviews() {
  usePageTitle('Reviews & Questions');
  const { storeId } = useStoreWorkspace();
  const { enabled: aiEnabled } = useAiFeatures(storeId);

  // Filters live in the URL so a reload / shared link keeps them.
  const [status, setStatus] = useUrlParam('status', '');
  const [rating, setRating] = useUrlParam('rating', '');
  const [sort, setSort] = useUrlParam('sort', 'newest');
  const [product, setProduct] = useUrlParam('product', '');
  const [q, setQ] = useUrlParam('q', '');
  const [page, setPage] = useUrlPage();
  const [searchText, setSearchText] = useState(q);

  const [reviews, setReviews] = useState<StoreReviewEntry[]>([]);
  const [stats, setStats] = useState<StoreReviewStats | null>(null);
  const [counts, setCounts] = useState<StoreReviewCounts | null>(null);
  const [productOptions, setProductOptions] = useState<{ productId: string; title: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);       // first response arrived
  const [fetching, setFetching] = useState(false);   // any request in flight
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [replyingTo, setReplyingTo] = useState<StoreReviewEntry | null>(null);
  const [editingReplyOf, setEditingReplyOf] = useState<StoreReviewEntry | null>(null);
  const [reporting, setReporting] = useState<StoreReviewEntry | null>(null);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [insightKey, setInsightKey] = useState(0);
  const inboxRef = useRef<HTMLDivElement>(null);

  const quietRef = useRef(false);
  useLiveRefresh(['reviews', 'orders'], () => { quietRef.current = true; setRefreshKey(k => k + 1); });

  // Search box -> URL after 300 ms (and back if the URL changes, e.g. Clear filters).
  const qRef = useRef(q);
  qRef.current = q;
  useEffect(() => { setSearchText(q); }, [q]);
  useEffect(() => {
    // Only a real edit of the box (box text differs from the URL) writes the URL; qRef keeps the check fresh.
    if (searchText.trim() === qRef.current) return;
    const t = setTimeout(() => {
      if (searchText.trim() !== qRef.current) { setQ(searchText.trim()); setPage(1); }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;
    const quiet = quietRef.current;
    quietRef.current = false;
    setFetching(true);
    if (!quiet) setError('');
    apiGetStoreReviews(storeId, {
      page,
      rating: rating ? parseInt(rating, 10) : undefined,
      status: (status || undefined) as 'unreplied' | 'replied' | 'reported' | undefined,
      sort: sort as 'newest',
      q: q || undefined,
      productId: product || undefined,
    })
      .then(res => {
        if (cancelled) return;
        setReviews(res.data.reviews ?? []);
        setStats(res.data.stats);
        setCounts(res.data.counts ?? null);
        if (res.data.productFilter) setProductOptions(res.data.productFilter);
        setTotal(res.data.pagination.total);
        setError('');
      })
      .catch(err => { if (!cancelled && !quiet) setError(err instanceof Error ? err.message : 'Failed to load reviews.'); })
      .finally(() => { if (!cancelled) { setLoaded(true); setFetching(false); } });
    return () => { cancelled = true; };
  }, [storeId, page, rating, status, sort, q, product, refreshKey]);

  // Templates are loaded once; failing to load them only hides the shortcut.
  useEffect(() => {
    let alive = true;
    apiGetReplyTemplates(storeId).then(r => { if (alive) setTemplates(r.data.templates); }).catch(() => undefined);
    return () => { alive = false; };
  }, [storeId]);

  const reload = useCallback(() => { setRefreshKey(k => k + 1); setInsightKey(k => k + 1); }, []);

  const filtersActive = !!(status || rating || q || product);
  function clearFilters() { setStatus(''); setRating(''); setQ(''); setProduct(''); setSort('newest'); setPage(1); }
  const pick = (setter: (v: string) => void) => (v: string) => { setter(v); setPage(1); };

  const noReviewsAtAll = loaded && !error && !!stats && stats.totalReviews === 0;
  const completed = stats?.completedOrders ?? 0;

  async function draftFor(r: StoreReviewEntry) {
    return (await apiReviewReplyDraft(storeId, r.reviewId)).data.draft;
  }

  const kpis = useMemo(() => {
    if (!stats) return [];
    const resp = parseFloat(stats.responseRate);
    const hrs = parseFloat(stats.avgResponseTime);
    const last = stats.reviewsLastMonth ?? 0;
    const delta = stats.reviewsThisMonth - last;
    return [
      { label: 'Response rate', value: stats.responseRate, color: resp >= 90 ? '#2D8A4E' : '#C08B1E',
        tip: resp < 90 ? 'Reply to every review to build trust.' : undefined },
      { label: 'Avg response time', value: hrs > 0 ? stats.avgResponseTime : '—', color: '#1A72C2',
        tip: hrs > 24 ? 'Replying within 24 hours works best.' : undefined },
      { label: 'Reviews this month', value: String(stats.reviewsThisMonth), color: '#141413',
        sub: `${delta > 0 ? '+' : ''}${delta} vs last month` },
      { label: 'Reported reviews', value: String(stats.reportedReviews ?? stats.flaggedReviews), color: '#C08B1E',
        sub: 'Reviews you reported or Edudeen flagged' },
    ];
  }, [stats]);

  const menuFor = (r: StoreReviewEntry): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [];
    if (!r.sellerReply) items.push({ label: 'Reply', icon: <MessageSquare size={13} />, onClick: () => setReplyingTo(r) });
    else if (r.canEditReply) items.push({ label: 'Edit reply', icon: <MessageSquare size={13} />, onClick: () => setEditingReplyOf(r) });
    else items.push({ label: 'Reply can no longer be edited', disabled: true, onClick: () => {}, title: 'Replies can be edited for 24 hours' });
    if (r.sellerReport) items.push({ label: `Reported · ${r.sellerReport.status}`, disabled: true, onClick: () => {} });
    else if (r.flaggedByAdmin) items.push({ label: 'Flagged by Edudeen', disabled: true, onClick: () => {} });
    else items.push({ label: 'Report review', icon: <Flag size={13} />, onClick: () => setReporting(r) });
    return items;
  };

  const statusBadges = (r: StoreReviewEntry) => (
    <div className="flex flex-wrap gap-1">
      {r.sellerReport && (
        <Badge color={r.sellerReport.status === 'rejected' ? 'gray' : 'yellow'}>
          Reported · {r.sellerReport.status === 'rejected' ? 'Not accepted' : 'Pending'}
        </Badge>
      )}
      {!r.sellerReport && r.isFlagged && <Badge color="red">Reported</Badge>}
      {r.sellerReply ? <Badge color="green">Replied</Badge> : <Badge color="gray">Needs reply</Badge>}
    </div>
  );

  const reviewBody = (r: StoreReviewEntry) => (
    <div className="min-w-0">
      {(r.comments ?? []).length > 0
        ? <p className="text-[13px] text-charcoal leading-[1.5] line-clamp-2">{r.comments[0].text}</p>
        : <span className="text-[12px] text-slate italic">No comment</span>}
      {r.productTitle && <p className="text-[12px] text-slate mt-0.5 truncate">{r.productTitle}</p>}
      {(r.media ?? []).length > 0 && (
        <span className="inline-flex items-center gap-1 text-[12px] text-slate mt-1"><ImageIcon size={11} /> {r.media.length} photo{r.media.length > 1 ? 's' : ''}</span>
      )}
      {r.sellerReply && (
        <p className="text-[12px] text-graphite mt-1.5 border-s-2 border-brand-royal ps-2 line-clamp-2"><strong>Seller response:</strong> {r.sellerReply.text}</p>
      )}
    </div>
  );

  const columns: TableColumn<StoreReviewEntry>[] = [
    {
      key: 'customer', header: 'Customer', width: '200px',
      render: r => {
        const av = avatarStyle(r.customer.name);
        const initials = r.customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        return (
          <div className="flex items-center gap-[10px]">
            <div className="w-8 h-8 rounded-full text-[12px] font-bold flex items-center justify-center shrink-0" style={{ background: av.bg, color: av.color }}>{initials}</div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-charcoal truncate">{r.customer.name}</p>
              {r.isVerifiedPurchase && <p className="text-[12px] text-success font-medium">Verified Purchase</p>}
            </div>
          </div>
        );
      },
    },
    { key: 'rating', header: 'Rating', width: '110px', render: r => r.rating != null ? <StarRating value={r.rating} size={12} /> : <span className="text-slate text-[12px]">—</span> },
    { key: 'review', header: 'Review', render: r => <div className="max-w-[420px]">{reviewBody(r)}</div> },
    { key: 'status', header: 'Status', width: '170px', render: statusBadges },
    { key: 'createdAt', header: 'Date', width: '100px', render: r => <span className="text-[12px] text-slate">{new Date(r.createdAt).toLocaleDateString()}</span> },
    { key: 'actions', header: '', align: 'right', width: '56px', sticky: true, render: r => <ActionMenu items={menuFor(r)} /> },
  ];

  const renderCard = (r: StoreReviewEntry) => (
    <div className="p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-charcoal truncate">{r.customer.name}</p>
          <div className="flex items-center gap-2">
            {r.rating != null && <StarRating value={r.rating} size={12} />}
            <span className="text-[12px] text-slate">{new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <ActionMenu items={menuFor(r)} />
      </div>
      {reviewBody(r)}
      {statusBadges(r)}
    </div>
  );

  const headerActions = (
    <Button size="sm" variant="primary" icon={<Send size={13} />} aria-label="Request reviews" onClick={() => setRequestOpen(true)}>
      <span className="max-sm:hidden">Request reviews</span>
    </Button>
  );

  return (
    <>
      <StorePageHeader title="Reviews & Questions" subtitle="Monitor, respond to, and learn from customer feedback." actions={headerActions} />

      <div className="px-4 lg:px-7 pb-8 pt-5 flex flex-col gap-5">
        {error && !loaded && (
          <Card><div className="text-[13px] text-error flex items-center gap-3 flex-wrap">{error}<Button size="sm" variant="secondary" onClick={reload}>Retry</Button></div></Card>
        )}

        {!loaded && !error && (
          <div className="flex flex-col gap-4">
            <SkeletonBox height={170} rounded="12px" /><SkeletonBox height={260} rounded="12px" />
          </div>
        )}

        {noReviewsAtAll && (
          <Card>
            <EmptyState
              icon={<Star size={28} className="text-brand-orange" />}
              title="No reviews yet"
              description={completed > 0
                ? `You have ${completed} completed order${completed === 1 ? '' : 's'} — ask buyers for a review.`
                : 'Reviews appear after your first completed order.'}
              action={completed > 0 ? { label: 'Request reviews', onClick: () => setRequestOpen(true), icon: <Send size={13} /> } : undefined}
            />
            {completed === 0 && (
              <div className="text-center pb-5"><Link to={`/store/${storeId}/orders?tab=completed`} className="text-[13px] text-brand-royal underline">View your orders</Link></div>
            )}
          </Card>
        )}

        {loaded && stats && stats.totalReviews > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
              <Card>
                <div className="text-center mb-5">
                  <p className="text-[48px] font-bold text-charcoal leading-none mb-1.5">{stats.averageRating.toFixed(1)}</p>
                  <div className="mb-1.5 flex justify-center"><StarRating value={stats.averageRating} size={20} /></div>
                  <p className="text-xs text-slate">Based on {stats.totalReviews} review{stats.totalReviews === 1 ? '' : 's'}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {(['5', '4', '3', '2', '1'] as const).map(star => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs text-graphite w-7 shrink-0">{star} ★</span>
                      <div className="flex-1 h-1.5 rounded-[3px] bg-bone overflow-hidden"><div className="h-full rounded-[3px] bg-brand-orange" style={{ width: stats.ratingBreakdown[star] }} /></div>
                      <span className="text-[12px] text-slate w-10 text-end shrink-0">{stats.ratingBreakdown[star]}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <p className="text-[13px] font-semibold text-charcoal mb-4">Reputation at a glance</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {kpis.map(k => <Kpi key={k.label} {...k} />)}
                </div>
              </Card>
            </div>

            {/* ── Inbox ── */}
            <div ref={inboxRef}>
              <Card padding="none">
                <div className="flex flex-col gap-3 px-4 sm:px-5 py-4 border-b border-bone">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label className="relative flex-1 min-w-0">
                      <span className="sr-only">Search reviews</span>
                      <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate pointer-events-none" />
                      <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search review text"
                        className="w-full ps-9 pe-3 min-h-[40px] text-[13px] border border-bone rounded-lg bg-white text-charcoal outline-none focus:border-brand-royal" />
                    </label>
                    <select aria-label="Product" value={product} onChange={e => pick(setProduct)(e.target.value)}
                      className="sm:w-[190px] px-3 min-h-[40px] text-[13px] border border-bone rounded-lg bg-white text-charcoal outline-none cursor-pointer">
                      <option value="">All products</option>
                      {product && !productOptions.some(p => p.productId === product) && <option value={product}>Selected product</option>}
                      {productOptions.map(p => <option key={p.productId} value={p.productId}>{p.title} ({p.count})</option>)}
                    </select>
                    <select aria-label="Sort by" value={sort} onChange={e => pick(setSort)(e.target.value)}
                      className="sm:w-[150px] px-3 min-h-[40px] text-[13px] border border-bone rounded-lg bg-white text-charcoal outline-none cursor-pointer">
                      {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Filters" data-no-edge-scroll>
                    <Chip active={!status} onClick={() => pick(setStatus)('')}>All ({counts?.all ?? 0})</Chip>
                    <Chip active={status === 'unreplied'} onClick={() => pick(setStatus)('unreplied')}>Needs reply ({counts?.needsReply ?? 0})</Chip>
                    <Chip active={status === 'replied'} onClick={() => pick(setStatus)('replied')}>Replied ({counts?.replied ?? 0})</Chip>
                    <Chip active={status === 'reported'} onClick={() => pick(setStatus)('reported')}>Reported ({counts?.reported ?? 0})</Chip>
                    <span className="w-px h-5 bg-bone shrink-0 mx-1" aria-hidden />
                    {(['5', '4', '3', '2', '1'] as const).map(s => (
                      <Chip key={s} active={rating === s} onClick={() => pick(setRating)(rating === s ? '' : s)}>{s}★ ({counts?.byRating[s] ?? 0})</Chip>
                    ))}
                  </div>
                  <div className="flex items-center justify-between min-h-[20px]">
                    <span className="text-[12px] text-slate inline-flex items-center gap-1.5" aria-live="polite">
                      {fetching && <Loader2 size={13} className="animate-spin" />}
                      {total} review{total === 1 ? '' : 's'}{filtersActive ? ' match your filters' : ''}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => setTemplatesOpen(true)}>Reply templates</Button>
                  </div>
                </div>

                {error ? (
                  <div className="text-[13px] text-error p-5 flex items-center gap-3 flex-wrap">{error}<Button size="sm" variant="secondary" onClick={reload}>Retry</Button></div>
                ) : reviews.length === 0 && !fetching ? (
                  <EmptyState
                    icon={<Star size={28} className="text-brand-orange" />}
                    title={filtersActive ? 'No reviews match these filters' : 'No reviews found'}
                    description={filtersActive ? 'Try another keyword, rating or product.' : 'Reviews will show up here.'}
                    action={filtersActive ? { label: 'Clear filters', onClick: clearFilters } : undefined}
                  />
                ) : (
                  <div className={fetching ? 'opacity-60 transition-opacity' : ''} aria-busy={fetching}>
                    <Table
                      columns={columns} data={reviews} keyExtractor={r => r.reviewId}
                      cardsBelow="md" renderCard={renderCard}
                      pagination={{ page, total, perPage: PER_PAGE, onChange: setPage, label: 'reviews' }}
                    />
                  </div>
                )}
              </Card>
            </div>

            <ReviewInsights key={insightKey} storeId={storeId} onPickProduct={id => {
              setProduct(id); setStatus(''); setRating(''); setQ(''); setPage(1);
              inboxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }} />
          </>
        )}
      </div>

      {replyingTo && (
        <ReplyModal
          title="Reply to review" initialText="" storeId={storeId} templates={templates}
          onManageTemplates={() => setTemplatesOpen(true)}
          onDraft={aiEnabled('review_reply') ? () => draftFor(replyingTo) : undefined}
          onClose={() => setReplyingTo(null)}
          onSubmit={async text => { await apiReplyToReview(replyingTo.reviewId, text); setReplyingTo(null); reload(); }}
        />
      )}
      {editingReplyOf?.sellerReply && (
        <ReplyModal
          title="Edit reply" initialText={editingReplyOf.sellerReply.text} storeId={storeId} templates={templates}
          onManageTemplates={() => setTemplatesOpen(true)}
          onClose={() => setEditingReplyOf(null)}
          onSubmit={async text => { await apiEditReply(editingReplyOf.reviewId, text); setEditingReplyOf(null); reload(); }}
        />
      )}
      {reporting && <ReportModal reviewId={reporting.reviewId} onClose={() => setReporting(null)} onDone={() => { setReporting(null); reload(); }} />}
      {templatesOpen && <TemplatesModal storeId={storeId} initial={templates} onClose={() => setTemplatesOpen(false)} onSaved={t => { setTemplates(t); setTemplatesOpen(false); }} />}
      {requestOpen && <RequestReviewsModal storeId={storeId} onClose={() => setRequestOpen(false)} onSent={reload} />}
    </>
  );
}
