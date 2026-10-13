import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Clock, Star, Search, LibraryBig, PlayCircle, Mail, Loader2, Ban, CalendarX2 } from 'lucide-react';
import { clsx } from 'clsx';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { Card, EmptyState, SkeletonBox, PageHeader, Button } from '@/components/comman/ui';
import { apiGetMyLibrary, apiResendDownloadLink, type LibraryItem } from '@/api/services/orders';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { CURRICULUM_LABEL, LICENSE_LABEL } from '@/constants/learning';
import { DigitalFileDownloads } from '@/features/buyer/components/DigitalFileDownloads';
import { JoinLiveClassButton } from '@/features/buyer/components/JoinLiveClassButton';
import { NextUpRail } from '@/features/buyer/components/NextUpRail';

// "My Library" — every digital resource the buyer owns, findable by subject,
// grade or name, instead of a flat list buried in order history.

const GRADE_LABEL = new Map<string, string>(EDUCATION_LEVELS.map(l => [l.value, l.label]));
type GroupBy = 'subject' | 'grade' | 'none';
type Sort = 'recent' | 'name';
const RECENT_DAYS = 30;

const typesOf = (i: LibraryItem): string[] => {
  if (i.deliveryFormat === 'course') return ['Course'];
  if (i.deliveryFormat === 'live_class') return ['Live class'];
  return (i.fileTypes ?? []).map(e => e.toUpperCase());
};
function formatSize(bytes?: number) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// "Lost my link?" - emails a My Library link for this purchase to the account email.
function ResendLink({ orderId, productId }: { orderId: string; productId: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState('');
  const send = async () => {
    setState('busy'); setError('');
    try { await apiResendDownloadLink(orderId, productId); setState('sent'); }
    catch (err) { setState('idle'); setError(err instanceof Error ? err.message : 'Could not send the email. Please try again.'); }
  };
  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={send} disabled={state !== 'idle'}
        className={clsx('inline-flex items-center gap-1.5 text-[12px] font-semibold bg-transparent border-none p-0', state === 'idle' ? 'text-brand-orange cursor-pointer hover:underline' : 'text-slate cursor-default')}>
        {state === 'busy' ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
        {state === 'sent' ? 'Sent to your email' : 'Re-send download link to my email'}
      </button>
      {error && <p className="text-[12px] text-error leading-tight">{error}</p>}
    </div>
  );
}

function ItemImg({ src, name }: { src: string | null; name: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) return <ProductCoverFallback name={name} size="sm" className="w-[64px] h-[64px] rounded-[10px] shrink-0" />;
  return <img loading="lazy" decoding="async" src={src} alt="" onError={() => setErr(true)} className="w-[64px] h-[64px] rounded-[10px] object-cover shrink-0 border border-[#edebe2]" />;
}

const subjectOf = (i: LibraryItem) => i.subCategory ?? i.category ?? 'Other';
const gradeOf = (i: LibraryItem) => (i.educationLevel === 'other' ? i.customLevel : i.educationLevel ? GRADE_LABEL.get(i.educationLevel) : null) ?? 'Any age';

export function Downloads() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('subject');
  const [type, setType] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [recentOnly, setRecentOnly] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    apiGetMyLibrary()
      .then(res => { if (alive) setItems(res.data.items ?? []); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load your library.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reload]);

  const subjects = useMemo(() => [...new Set(items.map(subjectOf))].sort(), [items]);
  const grades = useMemo(() => [...new Set(items.map(gradeOf))].sort(), [items]);

  const types = useMemo(() => [...new Set(items.flatMap(typesOf))].sort(), [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const since = Date.now() - RECENT_DAYS * 86_400_000;
    const list = items.filter(i =>
      (!term || i.name.toLowerCase().includes(term) || (i.storeName ?? '').toLowerCase().includes(term))
      && (!subject || subjectOf(i) === subject)
      && (!grade || gradeOf(i) === grade)
      && (!type || typesOf(i).includes(type))
      && (!recentOnly || new Date(i.purchasedAt).getTime() >= since));
    return sort === 'name'
      ? [...list].sort((a, b) => a.name.localeCompare(b.name))
      : [...list].sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
  }, [items, q, subject, grade, type, recentOnly, sort]);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [['All resources', filtered] as const];
    const key = groupBy === 'subject' ? subjectOf : gradeOf;
    const map = new Map<string, LibraryItem[]>();
    for (const i of filtered) { const k = key(i); map.set(k, [...(map.get(k) ?? []), i]); }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupBy]);

  const ready = items.filter(i => i.isPaid && !i.unavailable).length;

  return (
    <div>
      <Card padding="none">
        <div className="hidden lg:block px-5 pt-5 pb-4 border-b border-bone">
          <PageHeader
            eyebrow="Account"
            title="My Library"
            description={loading ? 'Your digital resources' : `${ready} resource${ready !== 1 ? 's' : ''} ready to download, any time`}
          />
        </div>

        {!loading && !error && items.length > 0 && (
          <div className="px-4 md:px-5 py-3 border-b border-bone flex flex-wrap items-center gap-2">
            <label className="relative flex-1 min-w-[200px] max-w-[320px]">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate" aria-hidden />
              <input
                id="library-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search your library…" aria-label="Search your library"
                className="w-full ps-8 pe-3 py-[8px] rounded-lg border border-bone text-[13px] outline-none focus:border-brand-orange"
              />
            </label>
            <select id="library-subject" aria-label="Subject" value={subject} onChange={e => setSubject(e.target.value)} className="rounded-lg border border-bone px-3 py-[8px] text-[13px] bg-white">
              <option value="">All subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select id="library-grade" aria-label="Grade" value={grade} onChange={e => setGrade(e.target.value)} className="rounded-lg border border-bone px-3 py-[8px] text-[13px] bg-white">
              <option value="">All grades</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {types.length > 1 && (
              <select id="library-type" aria-label="Type" value={type} onChange={e => setType(e.target.value)} className="rounded-lg border border-bone px-3 py-[8px] text-[13px] bg-white">
                <option value="">All types</option>
                {types.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            )}
            <select id="library-sort" aria-label="Sort by" value={sort} onChange={e => setSort(e.target.value as Sort)} className="rounded-lg border border-bone px-3 py-[8px] text-[13px] bg-white">
              <option value="recent">Newest first</option>
              <option value="name">Name A-Z</option>
            </select>
            <button type="button" aria-pressed={recentOnly} onClick={() => setRecentOnly(v => !v)}
              className={clsx('rounded-lg border px-3 py-[7px] text-[12.5px] cursor-pointer', recentOnly ? 'border-carbon bg-carbon text-white' : 'border-bone bg-white text-graphite hover:bg-cream')}>
              Last 30 days
            </button>
            <div role="group" aria-label="Group by" className="ms-auto inline-flex rounded-lg border border-bone overflow-hidden">
              {(['subject', 'grade', 'none'] as GroupBy[]).map(g => (
                <button key={g} type="button" aria-pressed={groupBy === g} onClick={() => setGroupBy(g)}
                  className={clsx('px-3 py-[7px] text-[12.5px] border-none cursor-pointer', groupBy === g ? 'bg-carbon text-white' : 'bg-white text-graphite hover:bg-cream')}>
                  {g === 'none' ? 'List' : `By ${g}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-5 flex flex-col gap-3">{[1, 2, 3].map(i => <SkeletonBox key={i} height={88} rounded="12px" />)}</div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="text-[13px] text-error text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setReload(n => n + 1)}>Try again</Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<LibraryBig size={28} className="text-brand-orange opacity-55" />}
            title="Your library is empty"
            description="Worksheets, e-books, courses and other digital resources you buy will appear here, ready to download any time."
            action={{ label: 'Browse resources', onClick: () => navigate('/') }}
            className="py-12"
          />
        ) : filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-slate">Nothing matches — try a different search or clear the filters.</p>
        ) : (
          <div className="flex flex-col">
            {groups.map(([label, list]) => (
              <section key={label} aria-label={label}>
                {groupBy !== 'none' && (
                  <h2 className="px-4 md:px-5 pt-4 pb-1 text-[12px] font-bold uppercase tracking-[0.1em] text-slate">{label} · {list.length}</h2>
                )}
                <ul className="divide-y divide-[#f5f4ef] list-none p-0 m-0">
                  {list.map(item => (
                    <li key={item.productId} className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 px-4 md:px-5 py-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <ItemImg src={item.image} name={item.name} />
                        <div className="min-w-0">
                          <Link to={`/product/${item.slug ?? item.productId}`} className="block text-[13px] font-semibold text-charcoal hover:text-brand-orange truncate">{item.name}</Link>
                          <p className="text-[12px] text-slate mt-[2px]">
                            {[item.storeName, gradeOf(item), item.licenseType ? LICENSE_LABEL[item.licenseType] : null, ...item.curricula.slice(0, 2).map(c => CURRICULUM_LABEL[c] ?? c)].filter(Boolean).join(' · ')}
                          </p>
                          {(typesOf(item).length > 0 || item.totalSize) ? (
                            <p className="mt-1 flex flex-wrap items-center gap-1.5">
                              {typesOf(item).map(x => <span key={x} className="rounded bg-[#eef0ff] px-1.5 py-[1px] text-[12px] font-bold text-[#3851d1]">{x}</span>)}
                              {item.fileCount > 1 && <span className="text-[12px] text-slate">{item.fileCount} files</span>}
                              {formatSize(item.totalSize) && <span className="text-[12px] text-slate">{formatSize(item.totalSize)}</span>}
                            </p>
                          ) : null}
                          <p className="text-[12px] text-slate mt-[2px]">
                            Bought {new Date(item.purchasedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                            <Link to={`/account/orders/${item.orderId}`} className="text-slate hover:text-brand-orange underline">Order {item.orderNumber}</Link>
                          </p>
                          {item.reviewable && (
                            <Link to={`/product/${item.slug ?? item.productId}#write-review`} className="inline-flex items-center gap-[5px] mt-1.5 text-[12px] font-semibold text-brand-orange hover:underline">
                              <Star size={11} /> Write a review
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 ps-[76px] sm:ps-0">
                        {item.unavailable === 'removed' ? (
                          <div className="max-w-[240px] rounded-[9px] bg-[#fff0f0] px-3 py-2 text-[12px] text-error">
                            <p className="flex items-center gap-1.5 font-semibold"><Ban size={12} /> No longer available</p>
                            <p className="mt-1 text-graphite">Edudeen removed this resource, so it cannot be downloaded. Contact support if you think this is a mistake.</p>
                          </div>
                        ) : item.unavailable === 'expired' ? (
                          <div className="max-w-[240px] rounded-[9px] bg-[#fff4dc] px-3 py-2 text-[12px] text-[#b36200]">
                            <p className="flex items-center gap-1.5 font-semibold"><CalendarX2 size={12} /> Download time ended</p>
                            <p className="mt-1 text-graphite">The download period set by the seller has ended. Message the seller to ask for access again.</p>
                          </div>
                        ) : item.isPaid ? (
                          <div className="flex flex-col items-start gap-2">
                            {item.deliveryFormat === 'course' && (
                              <Link to={`/course/${item.slug ?? item.productId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-royal text-white px-3 py-[7px] text-[12.5px] font-bold no-underline">
                                <PlayCircle size={13} /> Start learning
                              </Link>
                            )}
                            {item.deliveryFormat === 'live_class' && <JoinLiveClassButton productId={item.productId} startsAt={item.liveStartsAt} />}
                            {(item.deliveryFormat === 'download' || !item.deliveryFormat || item.fileCount > 0) && <DigitalFileDownloads orderId={item.orderId} productId={item.productId} />}
                            <ResendLink orderId={item.orderId} productId={item.productId} />
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-[5px] px-2.5 py-[5px] rounded-[7px] text-[12px] font-semibold bg-[#fff4dc] text-[#b36200]">
                            <Clock size={11} /> Available once payment is confirmed
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>
      {!loading && items.length > 0 && (
        <div className="mt-4">
          <NextUpRail
            seedProductId={[...items].sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())[0]?.productId}
            ownedProductIds={items.map(i => i.productId)}
          />
        </div>
      )}
      {!loading && items.length > 0 && (
        <p className="text-[12px] text-slate mt-3 inline-flex items-center gap-1.5"><Download size={12} /> Files stay here for good — download them again whenever you need.</p>
      )}
    </div>
  );
}
