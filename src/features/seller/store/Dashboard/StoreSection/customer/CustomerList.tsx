import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useUrlPage, useUrlParam } from '@/hooks/useUrlParam';
import { Users, ShoppingBag, DollarSign, X, MessageCircle, ListOrdered, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import {
  apiGetStoreCustomers, apiGetStoreCustomerDetail, apiSaveStoreCustomerNote,
  type StoreCustomer, type StoreCustomerDetail, type CustomerSortKey,
} from '@/api/services/store';
import { TabBar, type Tab } from '@/components/comman/ui/TabBar';
import { MetricCard } from '@/components/comman/ui/MetricCard';
import { Table, type TableColumn } from '@/components/comman/ui/Table';
import { Badge, StatusBadge } from '@/components/comman/ui/Badge';
import { SearchInput } from '@/components/comman/ui/SearchInput';
import { Modal } from '@/components/comman/ui/Modal';
import { formatMoney, formatMoneyCompact } from '@/utils/currency';
import { useDebouncedValue } from '@/hooks/seller/useInventorySearch';
import { FollowersTab } from './tabs/FollowersTab';

const TABS: Tab[] = [
  { id: 'customers', label: 'Customers' },
  { id: 'followers', label: 'Followers' },
];

const PER_PAGE = 20;
const SORT_KEYS: CustomerSortKey[] = ['orderCount', 'totalSpent', 'lastOrderAt', 'createdAt'];

function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

function useIsDesktop() {
  const q = '(min-width: 1024px)';
  const [v, setV] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setV(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return v;
}

/** "Free" instead of Rs 0 when a buyer only claimed free products. */
function ValueCell({ c, currency }: { c: StoreCustomer; currency?: string }) {
  if (c.orderCount > 0 && c.totalSpent === 0) return <Badge color="green" size="sm">Free</Badge>;
  return <span className="font-semibold text-charcoal">{formatMoneyCompact(c.totalSpent, currency)}</span>;
}

// ── Detail panel (read-only; the seller can never change a buyer's name/phone/e-mail) ─────────────
function CustomerPanel({ storeId, customerId, currency }: { storeId: string; customerId: string; currency?: string }) {
  const navigate = useNavigate();
  const [d, setD] = useState<StoreCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tryKey, setTryKey] = useState(0);

  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setSaveMsg(null);
    apiGetStoreCustomerDetail(storeId, customerId)
      .then(res => {
        if (cancelled) return;
        setD(res.data);
        setNote(res.data.note.note);
        setTags(res.data.note.tags);
        setTagInput('');
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this customer.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, customerId, tryKey]);

  function addTag(raw: string) {
    const v = raw.trim().replace(/,$/, '').trim();
    if (!v) return tags;
    if (v.length > 20) { setSaveMsg({ ok: false, text: 'A tag can be at most 20 characters.' }); return tags; }
    if (tags.some(t => t.toLowerCase() === v.toLowerCase())) { setTagInput(''); return tags; }
    if (tags.length >= 5) { setSaveMsg({ ok: false, text: 'You can add up to 5 tags.' }); return tags; }
    const next = [...tags, v];
    setTags(next); setTagInput(''); setSaveMsg(null);
    return next;
  }

  async function saveNote() {
    setSaving(true); setSaveMsg(null);
    try {
      const finalTags = tagInput.trim() ? addTag(tagInput) : tags; // a tag typed but not confirmed must not be lost
      const res = await apiSaveStoreCustomerNote(storeId, customerId, { note, tags: finalTags });
      setNote(res.data.note); setTags(res.data.tags); setTagInput('');
      setSaveMsg({ ok: true, text: 'Saved. Only you can see this.' });
    } catch (err) {
      setSaveMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save the note.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-2" aria-busy="true">
        <div className="animate-pulse h-14 w-14 rounded-full bg-bone self-center" />
        <div className="animate-pulse h-4 w-40 rounded bg-bone self-center" />
        <div className="animate-pulse h-16 rounded bg-bone" />
        <div className="animate-pulse h-32 rounded bg-bone" />
      </div>
    );
  }
  if (error || !d) {
    return (
      <div role="alert" className="py-6 text-center">
        <p className="text-[13px] text-error mb-3">{error || 'Could not load this customer.'}</p>
        <button type="button" onClick={() => setTryKey(k => k + 1)} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 border border-bone rounded-lg bg-white text-[13px] font-medium cursor-pointer">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const btn = 'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-lg text-[13px] font-semibold border cursor-pointer w-full';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center text-center">
        <div className="w-[52px] h-[52px] rounded-full text-base font-bold flex items-center justify-center mb-2 bg-[#f0eee6] text-[#5a5852]">{initialsOf(d.name)}</div>
        <p className="text-[15px] font-bold text-carbon flex items-center gap-2 flex-wrap justify-center">
          {d.name}
          {d.isRepeat && <Badge color="green" size="sm">Repeat customer</Badge>}
        </p>
        <p className="text-[12px] text-slate">Member since {fmtDate(d.createdAt)}</p>
        <p className="text-[12px] text-slate">{d.email}{d.phone ? ` · ${d.phone}` : ''}</p>
      </div>

      <dl className="grid grid-cols-2 gap-2 m-0">
        {[
          ['Orders', String(d.orderCount)],
          ['Total spent', d.orderCount > 0 && d.totalSpent === 0 ? 'Free' : formatMoneyCompact(d.totalSpent, currency)],
          ['First order', fmtDate(d.firstOrderAt)],
          ['Last order', fmtDate(d.lastOrderAt)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-bone px-3 py-2">
            <dt className="text-[12px] text-slate uppercase tracking-[0.05em]">{k}</dt>
            <dd className="m-0 text-[14px] font-bold text-carbon">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-2 gap-2">
        {d.conversationId ? (
          <button type="button" className={`${btn} bg-brand-royal text-white border-transparent`} onClick={() => navigate(`/store/${storeId}/messages?conv=${d.conversationId}`)}>
            <MessageCircle size={14} /> Message buyer
          </button>
        ) : (
          <button type="button" disabled className={`${btn} bg-white text-slate border-bone opacity-60 cursor-not-allowed`} title="This buyer has not messaged your store yet. Buyers start chats from your store page.">
            <MessageCircle size={14} /> Message buyer
          </button>
        )}
        <Link to={`/store/${storeId}/orders?tab=all&buyer=${d._id}`} className={`${btn} bg-white text-charcoal border-bone no-underline`}>
          <ListOrdered size={14} /> View orders
        </Link>
      </div>
      {!d.conversationId && <p className="text-[12px] text-slate -mt-2 m-0">No chat yet — buyers start a chat from your store page.</p>}

      <section aria-label="Latest orders">
        <h3 className="text-[13px] font-bold text-carbon m-0 mb-2">Latest orders</h3>
        {d.recentOrders.length === 0 ? (
          <p className="text-[12px] text-slate m-0">No orders yet.</p>
        ) : (
          <ul className="list-none p-0 m-0 flex flex-col divide-y divide-[#f0eee6] border border-bone rounded-lg">
            {d.recentOrders.map(o => {
              const inner = (
                <div className="flex items-center justify-between gap-2 px-3 py-2 min-h-[44px]">
                  <div className="min-w-0">
                    <p className="m-0 text-[13px] font-semibold text-charcoal truncate">{o.orderNumber}</p>
                    <p className="m-0 text-[12px] text-slate">{o.itemCount} item{o.itemCount === 1 ? '' : 's'} · {fmtDate(o.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {o.isFree ? <Badge color="green" size="sm">Free</Badge> : <span className="text-[13px] font-semibold text-charcoal">{formatMoney(o.amount, currency)}</span>}
                    <StatusBadge status={o.status} size="sm" />
                  </div>
                </div>
              );
              return (
                <li key={o.orderId}>
                  {o.isFreeClaim
                    ? inner
                    : <Link to={`/store/${storeId}/orders?tab=all&q=${encodeURIComponent(o.orderNumber)}`} className="block no-underline hover:bg-cream">{inner}</Link>}
                </li>
              );
            })}
          </ul>
        )}
        {d.orderCount > d.recentOrders.length && (
          <Link to={`/store/${storeId}/orders?tab=all&buyer=${d._id}`} className="inline-flex items-center min-h-[44px] text-[13px] font-semibold text-brand-royal">View all orders</Link>
        )}
      </section>

      <section aria-label="Private notes">
        <h3 className="text-[13px] font-bold text-carbon m-0 mb-1">Private notes</h3>
        <p className="text-[12px] text-slate m-0 mb-2">Only you can see this. The buyer never does.</p>
        <textarea
          value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={3}
          aria-label="Private note"
          className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white box-border resize-y"
          placeholder="e.g. Teacher at a school, buys class 5 bundles"
        />
        <p className="text-[12px] text-slate text-end m-0 mb-2">{note.length}/500</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-mist text-slate text-[12px] ps-2.5 pe-1 py-0.5">
              {t}
              <button type="button" aria-label={`Remove tag ${t}`} onClick={() => setTags(tags.filter(x => x !== t))} className="inline-flex items-center justify-center size-6 rounded-full bg-transparent border-0 cursor-pointer text-slate"><X size={12} /></button>
            </span>
          ))}
        </div>
        <input
          value={tagInput} maxLength={21}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
          onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
          aria-label="Add a tag"
          placeholder={tags.length >= 5 ? 'Tag limit reached' : 'Add a tag, press Enter (max 5)'}
          disabled={tags.length >= 5}
          className="w-full px-3 min-h-[44px] text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white box-border disabled:bg-cream"
        />
        {saveMsg && <p role={saveMsg.ok ? 'status' : 'alert'} className={`text-[12px] m-0 mt-2 ${saveMsg.ok ? 'text-success' : 'text-error'}`}>{saveMsg.text}</p>}
        <button type="button" onClick={() => void saveNote()} disabled={saving} className="mt-2 w-full min-h-[44px] bg-brand-orange border-none rounded-lg text-[13px] font-semibold text-white cursor-pointer disabled:opacity-50">
          {saving ? 'Saving…' : 'Save note'}
        </button>
      </section>
    </div>
  );
}

export default function StoreCustomerList() {
  usePageTitle('Customers');
  const { storeId, store } = useStoreWorkspace();
  const isDesktop = useIsDesktop();

  const [activeTab, setActiveTab] = useState('customers');
  // Search, sort and page live in the URL (shareable, survive reload).
  const [qParam, setQParam] = useUrlParam('q');
  const [sortParam, setSortParam] = useUrlParam('sort', 'lastOrderAt');
  const [dirParam, setDirParam] = useUrlParam('dir', 'desc');
  const [page, setPage] = useUrlPage();
  const sort: CustomerSortKey = (SORT_KEYS as string[]).includes(sortParam) ? (sortParam as CustomerSortKey) : 'lastOrderAt';
  const dir: 'asc' | 'desc' = dirParam === 'asc' ? 'asc' : 'desc';

  const [search, setSearch] = useState(qParam);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (debouncedSearch !== qParam) { setQParam(debouncedSearch); setPage(1); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const [customers, setCustomers] = useState<StoreCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ totalOrders: 0, totalRevenue: 0 });
  const [loaded, setLoaded] = useState(false);      // first answer received: later loads keep the old rows (dimmed)
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tryKey, setTryKey] = useState(0);
  const [selId, setSelId] = useState<string | null>(null);

  // A new buyer ordered / followed: refresh quietly.
  useLiveRefresh(['orders', 'customers'], () => setTryKey(k => k + 1), !!storeId && activeTab === 'customers');

  useEffect(() => {
    if (!storeId || activeTab !== 'customers') return;
    let cancelled = false;
    setRefreshing(true);
    setError('');
    apiGetStoreCustomers(storeId, page, PER_PAGE, qParam, sort, dir)
      .then(res => {
        if (cancelled) return;
        setCustomers(res.data.customers ?? []);
        setTotal(res.data.pagination.total);
        setSummary(res.data.summary);
        setLoaded(true);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load customers.'); })
      .finally(() => { if (!cancelled) setRefreshing(false); });
    return () => { cancelled = true; };
  }, [storeId, page, activeTab, qParam, sort, dir, tryKey]);

  function onSort(key: string) {
    const k = key as CustomerSortKey;
    if (k === sort) setDirParam(dir === 'desc' ? 'asc' : 'desc');
    else { setSortParam(k); setDirParam('desc'); }
    setPage(1);
  }

  const cur = store?.baseCurrency;
  const panelOpen = !!selId;
  const firstLoad = !loaded && !error;

  const columns: TableColumn<StoreCustomer>[] = [
    {
      key: 'name', header: 'Customer',
      render: c => (
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-full text-[12px] font-bold flex items-center justify-center shrink-0 bg-[#f0eee6] text-[#5a5852]">{initialsOf(c.name)}</div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-charcoal leading-[1.3] truncate max-w-[200px]">{c.name}</p>
            <p className="text-[12px] text-slate truncate max-w-[200px]">{c.email}</p>
          </div>
        </div>
      ),
    },
    ...(panelOpen ? [] : [{ key: 'phone', header: 'Phone', hideBelowXl: true, render: (c: StoreCustomer) => <span className="text-slate whitespace-nowrap">{c.phone || '—'}</span> }]),
    {
      key: 'orderCount', header: 'Orders', align: 'center', sortable: true,
      render: c => <Badge color={c.orderCount > 1 ? 'green' : 'orange'}>{c.orderCount}</Badge>,
    },
    { key: 'totalSpent', header: 'Order value', align: 'right', sortable: true, render: c => <ValueCell c={c} currency={cur} /> },
    { key: 'lastOrderAt', header: 'Last order', sortable: true, render: c => <span className="text-slate whitespace-nowrap">{fmtDate(c.lastOrderAt)}</span> },
    ...(panelOpen ? [] : [{ key: 'createdAt', header: 'Member since', sortable: true, hideBelowXl: true, render: (c: StoreCustomer) => <span className="text-slate whitespace-nowrap">{fmtDate(c.createdAt)}</span> }]),
  ];

  const panel = selId ? (
    <CustomerPanel key={selId} storeId={storeId} customerId={selId} currency={cur} />
  ) : null;

  return (
    <>
      <StorePageHeader title="Customers" subtitle="Manage buyer relationships and followers for this store." />

      <div className="px-4 md:px-7 pt-3">
        <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'followers' ? (
        <div className="px-4 md:px-7 pt-5 pb-8"><FollowersTab /></div>
      ) : (
        <div className="px-4 md:px-7 pt-5 pb-8 flex flex-col gap-5">
          <div className="flex flex-wrap gap-3">
            <MetricCard label="Customers" value={total.toLocaleString()} icon={<Users size={16} />} loading={firstLoad} />
            <MetricCard label="Orders" value={summary.totalOrders.toLocaleString()} icon={<ShoppingBag size={16} />} loading={firstLoad} />
            <MetricCard label="Order value" value={formatMoneyCompact(summary.totalRevenue, cur)} icon={<DollarSign size={16} />} loading={firstLoad} />
          </div>

          <div className={`grid grid-cols-1 gap-4 items-start ${panelOpen && isDesktop ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
            <div className="bg-white border border-bone rounded-[10px] min-w-0 overflow-hidden">
              <div className="px-4 md:px-5 py-3.5 border-b border-bone">
                <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or phone…" className="max-w-[320px]" />
              </div>

              {error ? (
                <div role="alert" className="p-6 text-center">
                  <p className="text-[13px] text-error mb-3">{error}</p>
                  <button type="button" onClick={() => setTryKey(k => k + 1)} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 border border-bone rounded-lg bg-white text-[13px] font-medium cursor-pointer">
                    <RefreshCw size={13} /> Retry
                  </button>
                </div>
              ) : (
                <div className={refreshing && loaded ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={refreshing}>
                  <Table
                    columns={columns}
                    data={customers}
                    keyExtractor={c => c._id}
                    onRowClick={c => setSelId(c._id)}
                    loading={firstLoad}
                    cardsBelow="md"
                    compact
                    sort={{ key: sort, direction: dir }}
                    onSortChange={onSort}
                    renderCard={c => (
                      <div className="flex items-center gap-3 min-h-[44px]">
                        <div className="w-9 h-9 rounded-full text-[12px] font-bold flex items-center justify-center shrink-0 bg-[#f0eee6] text-[#5a5852]">{initialsOf(c.name)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 text-[14px] font-semibold text-charcoal truncate">{c.name}</p>
                          <p className="m-0 text-[12px] text-slate truncate">{c.email}</p>
                          <p className="m-0 text-[12px] text-slate">{c.orderCount} order{c.orderCount === 1 ? '' : 's'} · Last {fmtDate(c.lastOrderAt)}</p>
                        </div>
                        <ValueCell c={c} currency={cur} />
                      </div>
                    )}
                    pagination={{ page, total, perPage: PER_PAGE, onChange: setPage, label: 'customers' }}
                    emptyState={{
                      icon: <Users size={28} className="text-brand-orange opacity-55" />,
                      title: qParam ? 'No customers match your search' : 'No customers found for this store yet',
                      description: qParam ? 'Try a different name, email or phone number.' : 'Customers who place an order from this store will show up here.',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Desktop: side panel. Under 1024px: full-screen sheet. */}
            {panel && isDesktop && (
              <aside className="w-full shrink-0" aria-label="Customer details">
                <div className="bg-white border border-bone rounded-[10px] px-[18px] py-5 lg:sticky lg:top-[70px] relative">
                  <button type="button" onClick={() => setSelId(null)} aria-label="Close customer details" className="absolute top-2 end-2 inline-flex items-center justify-center size-11 bg-transparent border-0 cursor-pointer text-slate"><X size={16} /></button>
                  {panel}
                </div>
              </aside>
            )}
          </div>
        </div>
      )}

      {panel && !isDesktop && (
        <Modal title="Customer" onClose={() => setSelId(null)} mobileSheet fullHeightMobile width={460}>
          {panel}
        </Modal>
      )}
    </>
  );
}
