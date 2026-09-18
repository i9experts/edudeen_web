import { useState, useEffect } from 'react';
import {
  ShoppingCart, RefreshCw,
  DollarSign, Clock, TrendingUp, CheckCheck, Truck,
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
  ActionMenu,
  Button,
  InlineError,
} from '@/components/comman/ui';
import {
  apiGetSellerOrders,
  type SellerOrder,
  type SellerOrderStats,
} from '@/api/services/product';
import { usePageTitle } from '@/hooks/usePageTitle';
import { currencySymbol } from '@/utils/currency';

// ── Customer cell ──────────────────────────────────────────────────────────────
function CustomerCell({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={name} size={30} />
      <div>
        <p className="text-[13px] font-medium text-charcoal mb-[1px]">{name}</p>
        <p className="text-[11px] text-slate">{email}</p>
      </div>
    </div>
  );
}

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
  const [typeF,       setTypeF]       = useState('');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [markingPaidId,    setMarkingPaidId]    = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const LIMIT = 10;
  // No server-side order search endpoint exists — when searching, fetch a
  // much larger page instead of the normal small one so the search covers
  // (up to) the whole order list rather than silently only ever matching
  // whatever 10 rows happened to already be on screen (same pattern as
  // StoreProductList's SEARCH_LIMIT).
  const SEARCH_LIMIT = 1000;

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    const isSearching = debouncedSearch.trim().length > 0;
    const [fetchPage, fetchLimit] = isSearching ? [1, SEARCH_LIMIT] : [page, LIMIT];

    apiGetSellerOrders(storeId, fetchPage, fetchLimit)
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
  }, [storeId, page, refreshKey, debouncedSearch]);

  const handlePageChange = (p: number) => {
    setLoading(true);
    setError('');
    setSearch('');
    setPage(p);
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRefreshKey(k => k + 1);
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    if (q &&
      !o.orderNumber.toLowerCase().includes(q) &&
      !o.customer.name.toLowerCase().includes(q) &&
      !o.product.toLowerCase().includes(q)
    ) return false;
    if (statusF && o.status !== statusF) return false;
    if (typeF   && o.type   !== typeF)   return false;
    return true;
  });

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
          {o.type === 'digital' ? (o.productType === 'educational' ? 'Educational' : 'Digital') : 'Physical'}
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
          {currencySymbol(store?.baseCurrency)}{o.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'paymentType', header: 'Payment',
      render: o => (
        <div className="flex flex-col gap-[2px]">
          <span className="text-[12px] text-slate capitalize">{o.paymentType.replace(/_/g, ' ')}</span>
          {o.isPaid
            ? <span className="text-[10px] font-semibold text-success">Paid</span>
            : <span className="text-[10px] font-semibold text-[#b36200]">Unpaid</span>
          }
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: o => <StatusBadge status={o.status} />,
    },
    {
      key: 'actions', header: '', align: 'center', width: '150px',
      render: o => {
        const busy = markingPaidId === o.orderId || updatingStatusId === o.orderId;

        const changeStatus = (status: 'processing' | 'shipped' | 'completed' | 'cancelled') => {
          if (busy) return;
          setUpdatingStatusId(o.orderId);
          apiUpdateOrderStatus({ orderId: o.orderId, storeId, status })
            .then(() => {
              setOrders(prev =>
                prev.map(x => x.orderId === o.orderId ? { ...x, status } : x)
              );
            })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : 'Failed to update status.');
            })
            .finally(() => setUpdatingStatusId(null));
        };

        const markPaid = () => {
          if (busy) return;
          setMarkingPaidId(o.orderId);
          apiMarkOrderPaid(o.orderId)
            .then(() => setOrders(prev => prev.map(x => x.orderId === o.orderId ? { ...x, isPaid: true } : x)))
            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to mark as paid.'))
            .finally(() => setMarkingPaidId(null));
        };

        // One primary inline action (the single most useful next step for
        // this order), everything else tucked in the overflow menu — same
        // "primary + overflow" convention the admin marketplace table uses,
        // instead of cramming every status transition into one menu.
        const primary = !o.isPaid
          ? { label: 'Mark Paid', icon: <CheckCheck size={12} />, onClick: markPaid, loading: markingPaidId === o.orderId }
          : o.status === 'pending'
          ? { label: 'Process', icon: <RefreshCw size={12} />, onClick: () => changeStatus('processing'), loading: updatingStatusId === o.orderId }
          : o.status !== 'completed' && o.status !== 'cancelled'
          ? { label: 'Ship', icon: <Truck size={12} />, onClick: () => changeStatus('shipped'), loading: updatingStatusId === o.orderId }
          : null;

        const overflowItems = [
          ...(o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'pending' ? [{
            label: 'Mark Completed', icon: <CheckCheck size={13} />, onClick: () => changeStatus('completed'),
          }] : []),
        ];

        return (
          <div className="flex items-center justify-center gap-1">
            {primary && (
              <Button variant="ghost" size="xs" disabled={busy} loading={primary.loading} onClick={primary.onClick} icon={!primary.loading && primary.icon}>
                {primary.label}
              </Button>
            )}
            {overflowItems.length > 0 && <ActionMenu align="right" items={overflowItems} />}
          </div>
        );
      },
    },
  ];

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
            value={stats ? `${currencySymbol(store?.baseCurrency)}${stats.revenue.toLocaleString()}` : 0}
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
            value={stats ? `${currencySymbol(store?.baseCurrency)}${stats.avgOrder.toLocaleString()}` : 0}
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
                placeholder="Search orders…"
                className="w-full sm:w-[200px] sm:ml-auto"
              />
              <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-end">
                <FilterDropdown
                  value={statusF}
                  onChange={setStatusF}
                  placeholder="All Status"
                  options={['pending', 'completed', 'cancelled', 'processing'].map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
                  className="shrink-0"
                />
                <FilterDropdown
                  value={typeF}
                  onChange={setTypeF}
                  placeholder="All Types"
                  options={['digital', 'physical'].map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
                  className="shrink-0"
                />
                <Button variant="outline" size="xs" onClick={() => { setSearch(''); setStatusF(''); setTypeF(''); }}>Clear</Button>
                <Button
                  variant="outline" size="xs" onClick={handleRetry} icon={<RefreshCw size={11} />}
                >
                  Refresh
                </Button>
              </div>
            </div>

            <Table
              columns={columns}
              data={filtered}
              keyExtractor={o => o.orderId}
              loading={loading}
              emptyState={{
                icon: <ShoppingCart size={30} className="text-brand-orange opacity-55" />,
                title: search || statusF || typeF ? 'No orders match your filters' : 'No orders yet',
                description:
                  search || statusF || typeF
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
    </>
  );
}
