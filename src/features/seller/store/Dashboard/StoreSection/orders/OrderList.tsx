import { useState, useEffect } from 'react';
import {
  ShoppingCart, RefreshCw,
  DollarSign, Clock, TrendingUp, CheckCheck, Truck, Eye,
} from 'lucide-react';
import { apiMarkOrderPaid, apiUpdateOrderStatus } from '@/api/services/orders';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import {
  Table,      type TableColumn,
  MetricCard,
  Badge,      StatusBadge,
  Card,
  Avatar,
  SearchInput,
  FilterDropdown,
  Button,
  InlineError,
} from '@/components/comman/ui';
import {
  apiGetSellerOrders,
  type SellerOrder,
  type SellerOrderStats,
  type SellerOrderFilters,
} from '@/api/services/product';
import { usePageTitle } from '@/hooks/usePageTitle';
import { currencySymbol, formatMoney } from '@/utils/currency';
import {
  OrderDetailModal, canMarkPaid, canComplete, canProcess, canShip, paymentLabel,
} from './OrderDetailModal';

// ── Customer cell ──────────────────────────────────────────────────────────────
function CustomerCell({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={name} size={30} />
      <div>
        <p className="text-[13px] font-medium text-charcoal mb-[1px]">{name}</p>
        <p className="text-[12px] text-slate">{email}</p>
      </div>
    </div>
  );
}

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];
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
  const [statusF,     setStatusF]     = useState('');
  const [typeF,       setTypeF]       = useState<SellerOrderFilters['type']>('');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [busyId,        setBusyId]        = useState<string | null>(null);
  const [selected,      setSelected]      = useState<SellerOrder | null>(null);

  const LIMIT = 10;
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

    apiGetSellerOrders(storeId, page, LIMIT, { status: statusF, type: typeF, q })
      .then(res => {
        if (cancelled) return;
        setOrders(res.data.orders ?? []);
        setStats(res.data.stats);
        setTotalOrders(res.data.pagination.totalOrders);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load orders.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [storeId, page, refreshKey, q, statusF, typeF]);

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

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns: TableColumn<SellerOrder>[] = [
    {
      key: 'no', header: '#', width: '48px',
      render: (_, i) => (
        <span className="text-[12px] text-slate font-medium">
          {(page - 1) * LIMIT + i + 1}
        </span>
      ),
    },
    {
      key: 'orderNumber', header: 'Order',
      render: o => (
        <span className="text-[12px] font-bold text-brand-deep-orange font-mono">
          {o.orderNumber}
        </span>
      ),
    },
    {
      key: 'customer', header: 'Customer',
      render: o => <CustomerCell name={o.customer.name} email={o.customer.email} />,
    },
    {
      key: 'product', header: 'Product',
      render: o => (
        <span className="text-[13px] text-carbon max-w-[180px] truncate block">{o.product}</span>
      ),
    },
    {
      key: 'type', header: 'Type',
      render: o => (
        <Badge color={o.type === 'digital' ? 'blue' : 'orange'}>
          {o.type === 'digital' ? (o.productType === 'educational' ? 'Educational' : 'Digital') : o.type === 'mixed' ? 'Mixed' : 'Physical'}
        </Badge>
      ),
    },
    {
      key: 'date', header: 'Date',
      render: o => (
        <span className="text-[12px] text-slate whitespace-nowrap">
          {new Date(o.date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'amount', header: 'Amount', align: 'right',
      render: o => (
        <span className="text-[13px] font-bold text-charcoal whitespace-nowrap">
          {currencySymbol(o.currency ?? store?.baseCurrency)}{o.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'paymentType', header: 'Payment',
      render: o => (
        <div className="flex flex-col gap-[2px]">
          <span className="text-[12px] text-slate capitalize">{paymentLabel(o.paymentType)}</span>
          {o.isPaid
            ? <span className="text-[12px] font-semibold text-success">Paid</span>
            : <span className="text-[12px] font-semibold text-[#b36200]">Unpaid</span>
          }
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: o => <StatusBadge status={o.status} />,
    },
    {
      key: 'actions', header: '', align: 'center', width: '170px',
      render: o => {
        const busy = busyId === o.orderId;

        const run = (fn: () => Promise<unknown>, patch: Partial<SellerOrder>) => {
          if (busy) return;
          setBusyId(o.orderId);
          fn()
            .then(() => patchOrder(o.orderId, patch))
            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Action failed.'))
            .finally(() => setBusyId(null));
        };

        // One inline "next step" that the backend will actually accept
        // (see OrderDetailModal's can* helpers). Shipping needs a tracking
        // number, so "Ship" opens the detail view instead of firing blind.
        const primary =
          canShip(o) && o.status === 'processing'
            ? { label: 'Ship', icon: <Truck size={12} />, onClick: () => setSelected(o) }
          : canProcess(o)
            ? { label: 'Process', icon: <RefreshCw size={12} />, onClick: () => run(() => apiUpdateOrderStatus({ orderId: o.orderId, storeId, status: 'processing' }), { status: 'processing' }) }
          : canMarkPaid(o) && (o.type === 'digital' || o.status === 'shipped' || o.status === 'delivered')
            ? { label: 'Mark Paid', icon: <CheckCheck size={12} />, onClick: () => run(() => apiMarkOrderPaid(o.orderId), { isPaid: true, status: 'completed' }) }
          : canComplete(o)
            ? { label: 'Complete', icon: <CheckCheck size={12} />, onClick: () => run(() => apiUpdateOrderStatus({ orderId: o.orderId, storeId, status: 'completed' }), { status: 'completed' }) }
          : null;

        return (
          <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
            {primary && (
              <Button variant="ghost" size="xs" disabled={busy} loading={busy} onClick={primary.onClick} icon={!busy && primary.icon}>
                {primary.label}
              </Button>
            )}
            <Button variant="ghost" size="xs" onClick={() => setSelected(o)} icon={<Eye size={12} />} aria-label={`View order ${o.orderNumber}`}>
              View
            </Button>
          </div>
        );
      },
    },
  ];

  const hasFilters = !!(search || statusF || typeF);

  return (
    <>
      <StorePageHeader
        title="Orders"
        subtitle={loading ? 'Loading…' : `${totalOrders} order${totalOrders !== 1 ? 's' : ''}`}
      />

      <div className="px-4 lg:px-7 py-5 flex flex-col gap-5">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Total Orders"
            value={stats?.totalOrders ?? 0}
            icon={<ShoppingCart size={16} />}
            loading={loading && !stats}
          />
          <MetricCard
            label="Revenue"
            value={stats ? `${formatMoney(stats.revenue, store?.baseCurrency)}` : 0}
            icon={<DollarSign size={16} />}
            loading={loading && !stats}
          />
          <MetricCard
            label="Pending"
            value={stats?.pending ?? 0}
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
              <p className="text-[14px] font-bold text-charcoal shrink-0">All Orders</p>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Order #, customer or product…"
                className="w-full sm:w-[200px] sm:ml-auto"
              />
              <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-end">
                <FilterDropdown
                  value={statusF}
                  onChange={v => changeFilter(() => setStatusF(v))}
                  placeholder="All Status"
                  options={STATUS_OPTIONS.map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
                  className="shrink-0"
                />
                <FilterDropdown
                  value={typeF ?? ''}
                  onChange={v => changeFilter(() => setTypeF(v as SellerOrderFilters['type']))}
                  placeholder="All Types"
                  options={TYPE_OPTIONS}
                  className="shrink-0"
                />
                <Button variant="outline" size="xs" onClick={() => changeFilter(() => { setSearch(''); setStatusF(''); setTypeF(''); })}>Clear</Button>
                <Button
                  variant="outline" size="xs" onClick={handleRetry} icon={<RefreshCw size={11} />}
                >
                  Refresh
                </Button>
              </div>
            </div>

            <Table
              cardsBelow="lg"
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

      </div>

      {selected && (
        <OrderDetailModal
          order={selected}
          storeId={storeId}
          onClose={() => setSelected(null)}
          onUpdated={patchOrder}
        />
      )}
    </>
  );
}
