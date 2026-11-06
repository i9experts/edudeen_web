import { useEffect, useState } from 'react';
import { Download, Package, Search } from 'lucide-react';
import { Badge, Button, FilterDropdown, Table, type TableColumn } from '@/components/comman/ui';
import {
  useSellerAnalyticsFreeToPaid,
  useSellerAnalyticsProductTable,
} from '@/hooks/seller/useSellerAnalytics';
import { useDebouncedValue } from '@/hooks/seller/useInventorySearch';
import {
  apiSellerAnalyticsProductTableExport,
  type ProductTableRow,
  type ProductTableSort,
  type SellerAnalyticsParams,
} from '@/api/services/analytics/analytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatNumber, formatPercent } from '@/components/comman/analytics/format';
import { formatMoneyCompact } from '@/utils/currency';

const PER_PAGE = 10;

const SORTS: { value: ProductTableSort; label: string }[] = [
  { value: 'revenue', label: 'Sort by revenue' },
  { value: 'orders', label: 'Sort by orders' },
  { value: 'views', label: 'Sort by views' },
  { value: 'conversion', label: 'Sort by conversion' },
  { value: 'claims', label: 'Sort by free claims' },
  { value: 'name', label: 'Sort by name' },
];

const WINDOWS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

const TYPE_LABEL: Record<ProductTableRow['type'], string> = { physical: 'Physical', digital: 'Digital', course: 'Course' };

const INFO = {
  revenue: 'Booked order value per product (cancelled orders and free claims excluded). All products together equal "Order value (booked)" on the Overview tab for the same dates.',
  conversion: 'Orders divided by views of that product page. Only orders from the day we started counting visits are used.',
};

/** Product table (views, orders, booked revenue, conversion, free claims) + Free -> Paid, for ONE store. */
export function SellerProductTableCard({ params, storeId, currency }: { params: SellerAnalyticsParams; storeId: string; currency?: string | null }) {
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 350);
  const [sort, setSort] = useState<ProductTableSort>('revenue');
  const [page, setPage] = useState(1);
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => { setPage(1); }, [q, sort, params.range, params.from, params.to, storeId]);

  const table = useSellerAnalyticsProductTable({ ...params, storeId, q, sort, page, limit: PER_PAGE });
  const f2p = useSellerAnalyticsFreeToPaid({ ...params, storeId, days: Number(days) as 7 | 30 | 90 });

  const d = table.data;
  const noViews = d ? !d.viewsAvailable : false;

  async function exportCsv() {
    setExporting(true); setExportError('');
    try { await apiSellerAnalyticsProductTableExport({ ...params, storeId, q, sort }); }
    catch (e) { setExportError(e instanceof Error ? e.message : 'Could not export.'); }
    finally { setExporting(false); }
  }

  const columns: TableColumn<ProductTableRow>[] = [
    { key: 'name', header: 'Product', render: r => (
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate" translate="no">{r.name}</span>
        <Badge color="gray" size="sm">{TYPE_LABEL[r.type]}</Badge>
      </div>
    ) },
    ...(noViews ? [] : [{ key: 'views', header: 'Views', align: 'right' as const, render: (r: ProductTableRow) => r.views == null ? '—' : formatNumber(r.views) }]),
    { key: 'orders', header: 'Orders', align: 'right', render: r => formatNumber(r.orders) },
    { key: 'revenue', header: 'Revenue', align: 'right', render: r => formatMoneyCompact(r.revenue, currency) },
    ...(noViews ? [] : [{ key: 'conversionPercent', header: 'Conversion', align: 'right' as const, render: (r: ProductTableRow) => r.conversionPercent == null ? '—' : formatPercent(r.conversionPercent) }]),
    { key: 'freeClaims', header: 'Free claims', align: 'right', render: r => formatNumber(r.freeClaims) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-bone rounded-[10px]">
        <div className="px-4 sm:px-5 pt-4 pb-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-charcoal">Product performance</p>
              <p className="text-[12px] text-slate">
                Views, orders and booked revenue per product.
                {d && <> Total <span className="font-semibold text-carbon num">{formatMoneyCompact(d.totalRevenue, currency)}</span>.</>}
              </p>
            </div>
            <Button variant="outline" size="sm" icon={<Download size={14} />} loading={exporting} onClick={() => { void exportCsv(); }}>Export CSV</Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="relative flex-1 min-w-0">
              <span className="sr-only">Search products</span>
              <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate pointer-events-none" aria-hidden />
              <input
                type="search"
                value={search}
                maxLength={100}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products"
                className="w-full h-10 ps-9 pe-3 rounded-lg border border-bone bg-white text-[14px] text-carbon outline-none focus:border-brand-royal"
              />
            </label>
            <FilterDropdown options={SORTS} value={sort} onChange={v => setSort(v as ProductTableSort)} />
          </div>
          {exportError && <p role="alert" className="text-[12px] text-error">{exportError}</p>}
          {noViews
            ? <p className="text-[12px] text-slate">Views and conversion appear once we start counting visits to your store. Orders and revenue are already complete.</p>
            : <p className="text-[12px] text-slate">{INFO.revenue} {INFO.conversion}</p>}
        </div>

        {table.error ? (
          <div className="px-4 sm:px-5 pb-5"><AnalyticsErrorState message={table.error} onRetry={() => { void table.refetch(); }} /></div>
        ) : (
          <Table
            columns={columns}
            data={d?.products ?? []}
            keyExtractor={r => r.productId}
            loading={table.loading && !d}
            emptyState={{
              icon: <Package size={28} className="text-slate/50" />,
              title: q ? 'No products match your search' : 'No products yet',
            }}
            pagination={{ page, total: d?.pagination.total ?? 0, perPage: PER_PAGE, onChange: setPage, label: 'products' }}
          />
        )}
      </div>

      <div className="bg-white border border-bone rounded-[10px] px-4 sm:px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-charcoal">Free to paid</p>
            <p className="text-[12px] text-slate">Buyers who claimed a free product and later paid for something in your store.</p>
          </div>
          <FilterDropdown options={WINDOWS} value={days} onChange={v => setDays(v as '7' | '30' | '90')} />
        </div>
        {f2p.error ? (
          <AnalyticsErrorState message={f2p.error} onRetry={() => { void f2p.refetch(); }} />
        ) : f2p.loading && !f2p.data ? (
          <div className="h-16 rounded-lg bg-bone/60 animate-pulse" aria-busy="true" />
        ) : f2p.data && f2p.data.claimers === 0 ? (
          <p className="text-[13px] text-slate">No one claimed a free product for the first time in this period.</p>
        ) : f2p.data ? (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="text-[28px] font-bold text-carbon num leading-none">
              {f2p.data.percent == null ? '—' : formatPercent(f2p.data.percent)}
            </p>
            <p className="text-[13px] text-slate flex-1 min-w-[200px]">
              {f2p.data.percent == null
                ? `Too early: the ${f2p.data.days}-day window has not closed for any of the ${formatNumber(f2p.data.claimers)} new claimers yet.`
                : `${formatNumber(f2p.data.converted)} of ${formatNumber(f2p.data.matured)} claimers paid within ${f2p.data.days} days of their first free claim.`}
              {f2p.data.pending > 0 && f2p.data.percent != null && ` ${formatNumber(f2p.data.pending)} more are still inside their ${f2p.data.days}-day window and are not counted yet.`}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
