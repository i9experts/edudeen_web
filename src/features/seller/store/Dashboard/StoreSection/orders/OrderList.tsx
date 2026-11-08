import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatPrice } from '@/utils/formatPrice';
import {
  ShoppingCart, RefreshCw,
  DollarSign, Clock, TrendingUp, CheckCheck, Truck, Eye,
} from 'lucide-react';
import { apiMarkOrderPaid, apiUpdateOrderStatus } from '@/api/services/orders';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import {
  Table,      type TableColumn,
  MetricCard,
  StatusBadge,
  Card,
  Avatar,
  SearchInput,
  FilterDropdown,
  Button,
  InlineError,
  TabBar,
} from '@/components/comman/ui';
import {
  apiGetSellerOrders,
  type SellerOrderTab,
  type SellerOrderCounts,
  type SellerOrder,
  type SellerOrderStats,
  type SellerOrderFilters,
} from '@/api/services/product';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { FreeClaimsCard } from './FreeClaimsCard';
import { orderAgeText, shipByBadge } from './shipByBadge';
import { OrderIdCopy } from './OrderIdCopy';
import { DuplicateChip } from '@/components/comman/ui/DuplicateChip';
import { formatMoney } from '@/utils/currency';
import {
  OrderDetailModal, edudeenCollects, EDUDEEN_COD_NOTE, canMarkPaid, canComplete, canProcess, canShip, paymentLabel,
} from './OrderDetailModal';

// ── Customer cell ──────────────────────────────────────────────────────────────
function CustomerCell({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={name} size={30} />
      <div className="min-w-0 max-w-[170px]">
        <p className="text-[13px] font-medium text-charcoal mb-[1px] truncate" title={name}>{name}</p>
        {/* Email shows from 1280px; below that it is in the order modal */}
        <p className="hidden xl:block text-[12px] text-slate truncate" title={email}>{email}</p>
      </div>
    </div>
  );
}

const TABS: { id: SellerOrderTab; label: string }[] = [
  { id: 'needs_action', label: 'Needs action' },
  { id: 'shipped',      label: 'Shipped' },
  { id: 'delivered',    label: 'Delivered' },
  { id: 'completed',    label: 'Completed' },
  { id: 'cancelled',    label: 'Cancelled' },
  { id: 'all',          label: 'All' },
];
const DEFAULT_TAB: SellerOrderTab = 'needs_action';
const BADGE_CLASS = {
  grey:  'bg-cream text-slate',
  amber: 'bg-[#fff4e0] text-[#8a4b00]',
  red:   'bg-error-bg text-error',
} as const;
const TYPE_OPTIONS: { value: NonNullable<SellerOrderFilters['type']>; label: string }[] = [
  { value: 'physical', label: 'Physical' },
  { value: 'digital',  label: 'Digital' },
  { value: 'mixed',    label: 'Mixed' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export function StoreOrderList() {
  usePageTitle('Orders');
  const { storeId, store } = useStoreWorkspace();

  const [orders,      setOrders]      = useState<SellerOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [stats,       setStats]       = useState<SellerOrderStats | null>(null);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Tab lives in the URL (?tab=), so a refresh or a shared link keeps it; default = Needs action.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: SellerOrderTab = TABS.some(t => t.id === rawTab) ? (rawTab as SellerOrderTab) : DEFAULT_TAB;
  const [counts, setCounts] = useState<SellerOrderCounts | null>(null);
  // Dashboard 'Action required' links: ?action=toship|overdue (same predicate the dashboard counts use).
  const rawAction = searchParams.get('action');
  const actionF: 'toship' | 'overdue' | '' = rawAction === 'toship' || rawAction === 'overdue' ? rawAction : '';
  const clearAction = () => setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete('action'); return n; }, { replace: true });
  const setTab = (id: string) => {
    setLoading(true); setError(''); setPage(1);
    setSearchParams(prev => {
      const n = new URLSearchParams(prev);
      n.delete('action');
      if (id === DEFAULT_TAB) n.delete('tab'); else n.set('tab', id);
      return n;
    });
  };
  // Stat cards / links change ?tab= from outside: restart at page 1.
  useEffect(() => { setPage(1); }, [tab, actionF]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);
  const [typeF,       setTypeF]       = useState<SellerOrderFilters['type']>('');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [busyId,        setBusyId]        = useState<string | null>(null);
  const [selected,      setSelected]      = useState<SellerOrder | null>(null);

  const LIMIT = 10;
  // A buyer just checked out / paid / cancelled: the new order appears here without a refresh (quiet re-read, no skeleton).
  useLiveRefresh(['orders'], () => setRefreshKey(k => k + 1));
  // Status/type filters and search (?q= — order number, buyer name/email,
  // item name) all run server-side, so pagination stays intact while searching.

  useEffect(() => {
    if (search.trim() === debouncedSearch.trim()) return;
    const id = setTimeout(() => {
      // A new term restarts at page 1.
      setLoading(true);
      setError('');
      setPage(1);
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const q = debouncedSearch.trim();

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;

    apiGetSellerOrders(storeId, page, LIMIT, { tab, type: typeF, q, action: actionF })
      .then(res => {
        if (cancelled) return;
        setOrders(res.data.orders ?? []);
        setStats(res.data.stats);
        if (res.data.counts) setCounts(res.data.counts);
        setError('');
        setTotalOrders(res.data.pagination.totalOrders);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load orders.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [storeId, page, refreshKey, q, tab, typeF, actionF]);

  const handlePageChange = (p: number) => {
    setLoading(true);
    setError('');
    setPage(p);
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRefreshKey(k => k + 1);
  };

  const changeFilter = (fn: () => void) => { setLoading(true); setError(''); setPage(1); fn(); };

  const patchOrder = (orderId: string, patch: Partial<SellerOrder>) => {
    setOrders(prev => prev.map(x => x.orderId === orderId ? { ...x, ...patch } : x));
    setSelected(prev => prev && prev.orderId === orderId ? { ...prev, ...patch } : prev);
  };

  // ── Shared row pieces (table + phone card) ──────────────────────────────────
  const money = (o: SellerOrder, n: number) => formatPrice(n, o.currency ?? store?.baseCurrency);
  const typeLabel = (o: SellerOrder) => o.type === 'digital' ? 'Digital' : o.type === 'mixed' ? 'Mixed' : 'Physical';
  const itemsSuffix = (o: SellerOrder) => (o.itemCount && o.itemCount > 1 ? ` ×${o.itemCount}` : '');
  // Age + ship-by only for physical packages that are still waiting to ship.
  const shipInfo = (o: SellerOrder) => {
    const waiting = o.type !== 'digital' && (o.status === 'pending' || o.status === 'processing');
    return { waiting, sb: waiting ? shipByBadge(o.shipBy, now) : null };
  };
  const dateText = (o: SellerOrder, withYear = true) =>
    new Date(o.date).toLocaleDateString('en-PK', { ...(withYear ? { year: 'numeric' as const } : {}), month: 'short', day: 'numeric' });

  // One inline "next step" that the backend will actually accept (see OrderDetailModal's can* helpers).
  // Shipping needs a tracking number, so "Ship" opens the detail view instead of firing blind.
  const rowActions = (o: SellerOrder, big: boolean) => {
    const busy = busyId === o.orderId;
    const run = (fn: () => Promise<unknown>, patch: Partial<SellerOrder>, refresh = false) => {
      if (busy) return;
      setBusyId(o.orderId);
      fn()
        .then(() => { patchOrder(o.orderId, patch); if (refresh) setRefreshKey(k => k + 1); })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Action failed.'))
        .finally(() => setBusyId(null));
    };
    const sz = big ? 14 : 12;
    const primary =
      canShip(o) && o.status === 'processing'
        ? { label: 'Ship', icon: <Truck size={sz} />, onClick: () => setSelected(o) }
      : canProcess(o)
        ? { label: 'Process', icon: <RefreshCw size={sz} />, onClick: () => run(() => apiUpdateOrderStatus({ orderId: o.orderId, storeId, status: 'processing' }), { status: 'processing' }) }
      : canMarkPaid(o) && (o.type === 'digital' || o.status === 'shipped' || o.status === 'delivered')
        ? { label: 'Mark Paid', icon: <CheckCheck size={sz} />, onClick: () => run(() => apiMarkOrderPaid(o.orderId, storeId), { isPaid: true }, true) }
      : canComplete(o)
        ? { label: 'Complete', icon: <CheckCheck size={sz} />, onClick: () => run(() => apiUpdateOrderStatus({ orderId: o.orderId, storeId, status: 'completed' }), { status: 'completed' }) }
      : null;
    const cls = big ? 'min-h-[44px] flex-1' : 'whitespace-nowrap';
    return (
      <div className={big ? 'flex items-stretch gap-2' : 'flex items-center justify-center gap-1'} onClick={e => e.stopPropagation()}>
        {primary && (
          <Button variant={big ? 'primary' : 'ghost'} size={big ? 'sm' : 'xs'} className={cls} disabled={busy} loading={busy} onClick={primary.onClick} icon={!busy && primary.icon}>
            {primary.label}
          </Button>
        )}
        <Button variant={big ? 'outline' : 'ghost'} size={big ? 'sm' : 'xs'} className={cls} onClick={() => setSelected(o)} icon={<Eye size={sz} />} aria-label={`View order ${o.orderNumber}`}>
          View
        </Button>
      </div>
    );
  };

  const payChips = (o: SellerOrder) => (
    <>
      <span className="text-[12px] text-slate capitalize">{paymentLabel(o.paymentType)}</span>
      <span className={`text-[12px] font-semibold ${o.isPaid ? 'text-success' : 'text-[#b36200]'}`}>{o.isPaid ? 'Paid' : 'Unpaid'}</span>
    </>
  );
  const codInfo = (o: SellerOrder) => {
    if (o.isPaid || o.paymentType !== 'cash_on_delivery') return null;
    if (edudeenCollects(o)) return EDUDEEN_COD_NOTE;
    return (o.codAmount ?? 0) > 0 ? `Cash to collect: ${money(o, o.codAmount!)}` : null;
  };

  // ── Columns ──────────────────────────────────────────────────────────────────
  // ≥1280: every column. 768-1279: email + Status columns drop (status joins the Payment cell). <768: cards.
  const columns: TableColumn<SellerOrder>[] = [
    {
      key: 'orderNumber', header: 'Order',
      render: o => (
        <div className="flex flex-col items-start gap-1">
          <OrderIdCopy orderNumber={o.orderNumber} />
          <DuplicateChip other={o.possibleDuplicate} />
        </div>
      ),
    },
    {
      key: 'customer', header: 'Customer',
      render: o => <CustomerCell name={o.customer.name} email={o.customer.email} />,
    },
    {
      key: 'product', header: 'Product',
      render: o => (
        <div className="max-w-[150px] xl:max-w-[170px]">
          <span className="text-[13px] text-carbon truncate block" title={o.product}>{o.product}{itemsSuffix(o)}</span>
          <span className="text-[12px] text-slate block">{typeLabel(o)}</span>
        </div>
      ),
    },
    {
      key: 'date', header: 'Date',
      render: o => {
        const { waiting, sb } = shipInfo(o);
        return (
          <div className="flex flex-col items-start gap-1">
            {/* 1280-1535: no year, so the 8 columns fit without sideways scroll */}
            <span className="text-[12px] text-slate whitespace-nowrap">
              <span className="2xl:hidden">{dateText(o, false)}</span>
              <span className="hidden 2xl:inline">{dateText(o)}</span>
            </span>
            {sb ? (
              <span className={`text-[12px] font-semibold px-2 py-[2px] rounded-full whitespace-nowrap ${BADGE_CLASS[sb.tone]}`}>{sb.label}</span>
            ) : waiting ? (
              <span className="text-[12px] text-slate whitespace-nowrap">{orderAgeText(o.date, now)}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'amount', header: 'Amount', align: 'right',
      render: o => <span className="text-[13px] font-bold text-charcoal whitespace-nowrap">{money(o, o.amount)}</span>,
    },
    {
      key: 'paymentType', header: 'Payment',
      render: o => {
        const cod = codInfo(o);
        return (
          <div className="flex flex-col items-start gap-1 max-w-[190px]">
            <span className="flex items-center gap-1.5 whitespace-nowrap">{payChips(o)}</span>
            {/* 768-1279: status is merged here (its own column only shows from 1280) */}
            <span className="xl:hidden"><StatusBadge status={o.status} /></span>
            {cod && <span className="hidden xl:block text-[12px] text-slate truncate max-w-full" title={cod}>{cod}</span>}
          </div>
        );
      },
    },
    {
      key: 'status', header: 'Status', hideBelowXl: true,
      render: o => <StatusBadge status={o.status} />,
    },
    {
      key: 'actions', header: '', align: 'center', width: '150px', sticky: true,
      render: o => rowActions(o, false),
    },
  ];

  const orderCard = (o: SellerOrder) => {
    const { waiting, sb } = shipInfo(o);
    const cod = codInfo(o);
    return (
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <OrderIdCopy orderNumber={o.orderNumber} />
          <span className="text-[12px] text-slate whitespace-nowrap">{dateText(o)}</span>
        </div>
        {o.possibleDuplicate && <DuplicateChip other={o.possibleDuplicate} />}
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={o.customer.name} size={30} />
          <p className="m-0 text-[14px] font-semibold text-charcoal truncate">{o.customer.name}</p>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[13px] text-carbon truncate" title={o.product}>{o.product}{itemsSuffix(o)}</p>
            <p className="m-0 text-[12px] text-slate">{typeLabel(o)}</p>
          </div>
          <span className="text-[14px] font-bold text-charcoal whitespace-nowrap">{money(o, o.amount)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {payChips(o)}
          <StatusBadge status={o.status} />
          {sb ? (
            <span className={`text-[12px] font-semibold px-2 py-[2px] rounded-full whitespace-nowrap ${BADGE_CLASS[sb.tone]}`}>{sb.label}</span>
          ) : waiting ? (
            <span className="text-[12px] text-slate">{orderAgeText(o.date, now)}</span>
          ) : null}
        </div>
        {cod && <p className="m-0 text-[12px] text-slate">{cod}</p>}
        {rowActions(o, true)}
      </div>
    );
  };

  const hasFilters = !!(search || typeF || actionF);
  const tabLabel = TABS.find(t => t.id === tab)?.label ?? 'Orders';

  return (
    <>
      <StorePageHeader
        title="Orders"
        subtitle={loading ? 'Loading…' : `${totalOrders} order${totalOrders !== 1 ? 's' : ''}`}
        tabs={
          <TabBar
            dense
            active={tab}
            onChange={setTab}
            tabs={TABS.map(t => ({ id: t.id, label: t.label, count: counts ? counts[t.id] : undefined }))}
          />
        }
      />

      <div className="px-4 lg:px-7 py-5 flex flex-col gap-5">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricCard
            label="Total Orders"
            to="?tab=all"
            value={counts?.all ?? stats?.totalOrders ?? 0}
            icon={<ShoppingCart size={16} />}
            loading={loading && !stats}
          />
          <MetricCard
            label="Order value"
            value={stats ? `${formatMoney(stats.orderValue ?? stats.revenue, store?.baseCurrency)}` : 0}
            icon={<DollarSign size={16} />}
            loading={loading && !stats}
          />
          <MetricCard
            label="Paid revenue"
            value={stats ? `${formatMoney(stats.paidRevenue ?? 0, store?.baseCurrency)}` : 0}
            icon={<DollarSign size={16} />}
            loading={loading && !stats}
          />
          <MetricCard
            label="Pending"
            to="?tab=needs_action"
            value={counts?.needs_action ?? stats?.pending ?? 0}
            icon={<Clock size={16} />}
            loading={loading && !stats}
          />
          <MetricCard
            label="Avg. Order"
            value={stats ? `${formatMoney(stats.avgOrder, store?.baseCurrency)}` : 0}
            icon={<TrendingUp size={16} />}
            loading={loading && !stats}
          />
        </div>

        {/* Error */}
        {error && <InlineError message={error} onRetry={handleRetry} />}

        {/* Table */}
        {!error && (
          <Card padding="none">
            <div className="px-4 sm:px-5 pt-4 pb-3 flex flex-col gap-2.5">
              <p className="text-[14px] font-bold text-charcoal shrink-0">{actionF === 'overdue' ? 'Overdue orders' : actionF === 'toship' ? 'Orders to ship' : `${tabLabel} orders`}</p>
              {tab === 'needs_action' && !actionF && counts && (counts.toShip > 0 || counts.overdue > 0) && (
                <p className="m-0 text-[12.5px] text-slate">
                  {counts.toShip} to ship{counts.overdue > 0 && <> · <span className="font-semibold text-error">{counts.overdue} overdue</span></>} · most urgent first
                </p>
              )}
              {actionF && (
                <p className="m-0 text-[12.5px] text-slate">
                  {actionF === 'overdue' ? 'Paid or cash-on-delivery physical orders not shipped within 48 hours.' : 'Paid or cash-on-delivery physical orders waiting for you to ship.'}{' '}
                  <button type="button" className="font-semibold underline bg-transparent border-0 p-0 cursor-pointer text-brand-royal" onClick={() => changeFilter(clearAction)}>Show all orders</button>
                </p>
              )}
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Order #, customer or product…"
                className="w-full sm:w-[200px] sm:ml-auto"
              />
              <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-end">
                <FilterDropdown
                  value={typeF ?? ''}
                  onChange={v => changeFilter(() => setTypeF(v as SellerOrderFilters['type']))}
                  placeholder="All Types"
                  options={TYPE_OPTIONS}
                  className="shrink-0"
                />
                <Button variant="outline" size="xs" onClick={() => changeFilter(() => { setSearch(''); setTypeF(''); if (actionF) clearAction(); })}>Clear</Button>
                <Button
                  variant="outline" size="xs" onClick={handleRetry} icon={<RefreshCw size={11} />}
                >
                  Refresh
                </Button>
              </div>
            </div>

            <Table
              cardsBelow="md"
              compact
              rowHeight={72}
              renderCard={orderCard}
              columns={columns}
              data={orders}
              keyExtractor={o => o.orderId}
              onRowClick={o => setSelected(o)}
              loading={loading}
              emptyState={{
                icon: <ShoppingCart size={30} className="text-brand-orange opacity-55" />,
                title: hasFilters ? 'No orders match your filters' : 'No orders yet',
                description:
                  hasFilters
                    ? 'Try adjusting your search or filters.'
                    : 'Orders from your store will appear here once customers start purchasing.',
              }}
              pagination={{
                page,
                total:    totalOrders,
                perPage:  LIMIT,
                onChange: handlePageChange,
                label:    'orders',
              }}
            />
          </Card>
        )}

        {/* Free claims are not orders: collapsed, below the table */}
        {storeId && <FreeClaimsCard storeId={storeId} />}

      </div>

      {selected && (
        <OrderDetailModal
          order={selected}
          storeId={storeId}
          onClose={() => setSelected(null)}
          onUpdated={patchOrder}
          onOpenOrder={(id, number) => {
            const other = orders.find(x => x.orderId === id);
            if (other) { setSelected(other); return; }
            // Not on this page: close and search for it by order number.
            setSelected(null);
            setTab('all');
            setSearch(number);
          }}
        />
      )}
    </>
  );
}
