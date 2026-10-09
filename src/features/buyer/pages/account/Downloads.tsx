import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Clock, Star, Search, LibraryBig, PlayCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { Card, EmptyState, SkeletonBox, PageHeader, Button } from '@/components/comman/ui';
import { apiGetMyLibrary, type LibraryItem } from '@/api/services/orders';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { CURRICULUM_LABEL, LICENSE_LABEL } from '@/constants/learning';
import { DigitalFileDownloads } from '@/features/buyer/components/DigitalFileDownloads';
import { JoinLiveClassButton } from '@/features/buyer/components/JoinLiveClassButton';

// "My Library" — every digital resource the buyer owns, findable by subject,
// grade or name, instead of a flat list buried in order history.

const GRADE_LABEL = new Map<string, string>(EDUCATION_LEVELS.map(l => [l.value, l.label]));
type GroupBy = 'subject' | 'grade' | 'none';

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

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter(i =>
      (!term || i.name.toLowerCase().includes(term) || (i.storeName ?? '').toLowerCase().includes(term))
      && (!subject || subjectOf(i) === subject)
      && (!grade || gradeOf(i) === grade));
  }, [items, q, subject, grade]);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [['All resources', filtered] as const];
    const key = groupBy === 'subject' ? subjectOf : gradeOf;
    const map = new Map<string, LibraryItem[]>();
    for (const i of filtered) { const k = key(i); map.set(k, [...(map.get(k) ?? []), i]); }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupBy]);

  const ready = items.filter(i => i.isPaid).length;

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
                  <h2 className="px-4 md:px-5 pt-4 pb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-slate">{label} · {list.length}</h2>
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
                        {item.isPaid ? (
                          <div className="flex flex-col items-start gap-2">
                            {item.deliveryFormat === 'course' && (
                              <Link to={`/course/${item.slug ?? item.productId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-royal text-white px-3 py-[7px] text-[12.5px] font-bold no-underline">
                                <PlayCircle size={13} /> Start learning
                              </Link>
                            )}
                            {item.deliveryFormat === 'live_class' && <JoinLiveClassButton productId={item.productId} startsAt={item.liveStartsAt} />}
                            {(item.deliveryFormat === 'download' || !item.deliveryFormat || item.fileCount > 0) && <DigitalFileDownloads orderId={item.orderId} productId={item.productId} />}
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
        <p className="text-[12px] text-slate mt-3 inline-flex items-center gap-1.5"><Download size={12} /> Files stay here for good — download them again whenever you need.</p>
      )}
    </div>
  );
}
