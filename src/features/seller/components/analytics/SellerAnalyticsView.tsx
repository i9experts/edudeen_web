import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, DollarSign, Package, Users, Globe2, Lock } from 'lucide-react';
import { Button } from '@/components/comman/ui/Button';
import { apiGetStoreEntitlements } from '@/api/services/platformPlans';
import { TabBar, type Tab } from '@/components/comman/ui';
import { AnalyticsFilterBar } from '@/components/comman/analytics/AnalyticsFilterBar';
import { useSellerAnalyticsExport } from '@/hooks/seller/useSellerAnalytics';
import type { SellerExportSection } from '@/api/services/analytics/analytics';
import type { SupportedCurrency } from '@/api/services/store';
import {
  CSV_SECTION_OPTIONS,
  TAB_TO_CSV_SECTION,
  applyFiltersToSearch,
  customRangeError,
  filtersFromSearch,
  pktToday,
  shiftDate,
  toSellerAnalyticsParams,
} from './sellerAnalyticsFilters';
import { SellerOverviewTab } from './tabs/SellerOverviewTab';
import { SellerRevenueTab } from './tabs/SellerRevenueTab';
import { SellerProductsTab } from './tabs/SellerProductsTab';
import { SellerCustomersTab } from './tabs/SellerCustomersTab';
import { SellerTrafficPaymentsTab } from './tabs/SellerTrafficPaymentsTab';

const TABS: Tab[] = [
  { id: 'overview',  label: 'Overview',  icon: <LayoutDashboard size={14} /> },
  { id: 'revenue',   label: 'Revenue',   icon: <DollarSign size={14} /> },
  { id: 'products',  label: 'Products',  icon: <Package size={14} /> },
  { id: 'customers', label: 'Customers', icon: <Users size={14} /> },
  { id: 'traffic',   label: 'Traffic & Payments', icon: <Globe2 size={14} /> },
];

interface SellerAnalyticsViewProps {
  /** `null` means "every store the seller owns" — the cross-store view. */
  storeId: string | null;
  /** Passed in by the caller rather than resolved here — this component is
   *  shared across two different layout trees (StoreLayout's per-store page
   *  and SellerLayout's cross-store page) that each source "the current
   *  store's currency" from a different context, and only one of those
   *  contexts (`ActiveStoreProvider`) is actually mounted under SellerLayout.
   *  Calling that hook unconditionally here crashed every visit to the
   *  per-store Analytics page. `null` (cross-store "All Stores" view) means
   *  no single currency can be shown correctly — tabs fall back to a plain
   *  "$" in that case, since the underlying analytics aggregation doesn't
   *  yet convert/group multi-store amounts by currency (a real backend gap,
   *  not something this display alone can safely resolve). */
  currency: SupportedCurrency | null;
}

/**
 * The full analytics dashboard for one store, or for every store the seller owns
 * — shared by `StoreAnalytics` (routed at `/store/:storeId/analytics`,
 * always one store from the URL) and `SellerAnalytics` (routed at
 * `/seller/analytics`, storeId from a store picker that also offers "All Stores").
 * Mirrors the `AdminAnalytics` page structure 1:1 (filter bar + TabBar + tab panels)
 * scoped down to the 5 tabs the seller-side backend module actually supports.
 * Export (PDF/CSV) stays single-store only — hidden when `storeId` is null.
 */
export function SellerAnalyticsView({ storeId, currency }: SellerAnalyticsViewProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  // Everything beyond the Overview tab is the "Advanced analytics" plan feature.
  const [advanced, setAdvanced] = useState<{ allowed: boolean; requiredPlan: string | null } | null>(null);
  // Until the plan answer arrives (or fails) nothing plan-dependent renders: no flash of Pro tabs/Export, then a lock.
  const [planKnown, setPlanKnown] = useState(!storeId); // cross-store view has no plan gate
  useEffect(() => {
    if (!storeId) { setPlanKnown(true); return; }
    let cancelled = false;
    setPlanKnown(false);
    apiGetStoreEntitlements(storeId)
      .then(res => { if (!cancelled) setAdvanced((res.data.advancedAnalyticsAllowed as { allowed: boolean; requiredPlan: string | null } | undefined) ?? null); })
      .catch(() => {}) // unknown → leave unlocked; the server still enforces the plan
      .finally(() => { if (!cancelled) setPlanKnown(true); });
    return () => { cancelled = true; };
  }, [storeId]);
  const planLocked = !!storeId && advanced?.allowed === false;

  // The range lives in the URL (?range=custom&from=&to=&compare=1) so refresh / shared links keep it.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => filtersFromSearch(searchParams), [searchParams]);
  const setFilters = useCallback((next: typeof filters) => {
    let f = next;
    // Choosing "Custom" starts from the last 30 days instead of two empty boxes.
    if (f.range === 'custom' && !f.from && !f.to && filters.range !== 'custom') {
      const today = pktToday();
      f = { ...f, from: shiftDate(today, -29), to: today };
    }
    setSearchParams(prev => applyFiltersToSearch(prev, f), { replace: true });
  }, [filters.range, setSearchParams]);

  const today = pktToday();
  const dateError = filters.range === 'custom' ? customRangeError(filters.from, filters.to, today) : '';
  const rangeReady = !dateError; // nothing is fetched until both custom dates are valid

  const [csvSection, setCsvSection] = useState(TAB_TO_CSV_SECTION.overview);
  const { exportReport, exporting } = useSellerAnalyticsExport();

  useEffect(() => { setCsvSection(TAB_TO_CSV_SECTION[activeTab] ?? 'revenue'); }, [activeTab]);

  const params = useMemo(() => toSellerAnalyticsParams(filters, storeId), [filters, storeId]);

  // The upsell lists exactly the tabs that are locked right now (+ exports), not a hand-written text.
  const lockedItems = [...TABS.filter(t => t.id !== 'overview').map(t => t.label), 'PDF and CSV exports'];

  return (
    <div className="flex flex-col gap-5">
      <AnalyticsFilterBar
        filters={filters}
        onChange={setFilters}
        exporting={exporting}
        onExportPdf={() => exportReport({ ...params, format: 'pdf' })}
        onExportCsv={() => exportReport({ ...params, format: 'csv', section: csvSection as SellerExportSection })}
        csvSections={CSV_SECTION_OPTIONS}
        csvSection={csvSection}
        onCsvSectionChange={setCsvSection}
        showExport={!!storeId && planKnown && !planLocked && rangeReady}
        dateMax={today}
        dateError={dateError}
      />
      <p className="text-[12px] text-slate -mt-3">Times in PKT (Pakistan Standard Time)</p>

      {!planKnown ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="h-10 rounded-lg bg-bone/60 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 rounded-[10px] bg-bone/60 animate-pulse" />)}
          </div>
        </div>
      ) : (
        <>
          {/* Without Advanced analytics only Overview exists: no row of locked tabs, one upgrade card instead. */}
          {!planLocked && <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />}

          {rangeReady && (
            <>
              {(planLocked || activeTab === 'overview') && <SellerOverviewTab params={params} compareToPreviousPeriod={filters.compareToPreviousPeriod} currency={currency} storeId={storeId} />}
              {!planLocked && activeTab === 'revenue'   && <SellerRevenueTab params={params} currency={currency} />}
              {!planLocked && activeTab === 'products'  && <SellerProductsTab params={params} currency={currency} />}
              {!planLocked && activeTab === 'customers' && <SellerCustomersTab params={params} currency={currency} />}
              {!planLocked && activeTab === 'traffic'   && <SellerTrafficPaymentsTab params={params} currency={currency} />}
            </>
          )}

          {planLocked && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 bg-white border border-bone rounded-xl px-6 py-6">
              <div className="size-12 rounded-full bg-brand-pale-orange flex items-center justify-center shrink-0"><Lock size={20} className="text-brand-orange" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-carbon">Upgrade to unlock advanced analytics</p>
                <p className="text-[12.5px] text-slate leading-[1.6] mb-2">
                  Your Overview stays free.{advanced?.requiredPlan ? ` The ${advanced.requiredPlan} plan adds:` : ' A higher plan adds:'}
                </p>
                <ul className="m-0 pl-4 text-[12.5px] text-charcoal leading-[1.7] grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  {lockedItems.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <Button variant="primary" size="md" onClick={() => navigate(`/store/${storeId}/plan-billing`)}>See plans</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
