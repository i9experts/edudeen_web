import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, DollarSign, Store, Send, Receipt, FileText, Landmark, CalendarCheck } from 'lucide-react';
import { AdminStudioHeader, ADMIN_GUTTER } from '../components/studio';
import { FinanceMonthlySettlementTab } from './finance/FinanceMonthlySettlementTab';
import { Button, Input, TabBar, type Tab } from '@/components/comman/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminFinanceExport } from '@/hooks/admin/useAdminFinance';
import { AnalyticsFilterBar } from '@/components/comman/analytics/AnalyticsFilterBar';
import {
  CSV_SECTION_OPTIONS,
  DEFAULT_ADMIN_FINANCE_FILTERS,
  GRANULARITY_OPTIONS,
  TAB_TO_CSV_SECTION,
  toAdminFinanceParams,
} from '../components/finance/financeFilters';
import { FinanceOverviewTab } from './finance/FinanceOverviewTab';
import { FinanceRevenueTab } from './finance/FinanceRevenueTab';
import { FinanceSellersTab } from './finance/FinanceSellersTab';
import { FinancePayoutsTab } from './finance/FinancePayoutsTab';
import { FinancePayoutMethodsTab } from './finance/FinancePayoutMethodsTab';
import { FinanceTransactionsTab } from './finance/FinanceTransactionsTab';
import { FinanceReportsTab } from './finance/FinanceReportsTab';

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
  { id: 'revenue', label: 'Revenue', icon: <DollarSign size={14} /> },
  { id: 'sellers', label: 'Sellers', icon: <Store size={14} /> },
  { id: 'payouts', label: 'Payouts', icon: <Send size={14} /> },
  { id: 'monthly-payouts', label: 'Monthly Payouts', icon: <CalendarCheck size={14} /> },
  { id: 'payout-methods', label: 'Payout Methods', icon: <Landmark size={14} /> },
  { id: 'transactions', label: 'Transactions', icon: <Receipt size={14} /> },
  { id: 'reports', label: 'Reports', icon: <FileText size={14} /> },
];

export function AdminFinance() {
  usePageTitle('Finance');
  // The active tab lives in the URL (?tab=…) so a tab can be deep-linked —
  // the sidebar's "Monthly Payouts" entry points straight at its tab.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam && TABS.some(t => t.id === tabParam) ? tabParam : 'overview';
  const setActiveTab = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'overview') next.delete('tab'); else next.set('tab', id);
    setSearchParams(next, { replace: true });
  };
  const [filters, setFilters] = useState(DEFAULT_ADMIN_FINANCE_FILTERS);
  const [csvSection, setCsvSection] = useState(TAB_TO_CSV_SECTION.overview);
  const { exportReport, exporting } = useAdminFinanceExport();

  useEffect(() => { setCsvSection(TAB_TO_CSV_SECTION[activeTab] ?? 'transactions'); }, [activeTab]);

  const params = useMemo(() => toAdminFinanceParams(filters), [filters]);

  return (
    <>
    <AdminStudioHeader
      eyebrow="Edudeen team workspace · Finance"
      title="Finance & payouts"
      subtitle="Platform revenue, commission, seller balances, and the payout approval queue."
    />
    <div className={`${ADMIN_GUTTER} pt-6 pb-8 flex flex-col gap-5`}>
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {/* The date-range filter bar drives every tab except Monthly Payouts,
          which has its own month + currency controls. */}
      {activeTab !== 'monthly-payouts' && (
      <AnalyticsFilterBar
        filters={filters}
        onChange={setFilters}
        exporting={exporting}
        onExportPdf={() => exportReport({ ...params, format: 'pdf' })}
        onExportCsv={() => exportReport({ ...params, format: 'csv', section: csvSection as never })}
        granularityOptions={GRANULARITY_OPTIONS}
        granularity={filters.granularity}
        onGranularityChange={(v) => setFilters({ ...filters, granularity: v as typeof filters.granularity })}
        csvSections={CSV_SECTION_OPTIONS}
        csvSection={csvSection}
        onCsvSectionChange={setCsvSection}
        advanced={
          <>
            <div className="w-[220px]">
              <Input
                label="Store ID"
                placeholder="Drill down to one store…"
                value={filters.storeId}
                onChange={(e) => setFilters({ ...filters, storeId: e.target.value.trim() })}
              />
            </div>
            <div className="w-[220px]">
              <Input
                label="Seller ID"
                placeholder="Drill down to one seller…"
                value={filters.sellerId}
                onChange={(e) => setFilters({ ...filters, sellerId: e.target.value.trim() })}
              />
            </div>
            {(filters.storeId || filters.sellerId) && (
              <Button variant="ghost" size="sm" onClick={() => setFilters({ ...filters, storeId: '', sellerId: '' })}>
                Clear
              </Button>
            )}
          </>
        }
      />
      )}

      {activeTab === 'overview' && <FinanceOverviewTab params={params} />}
      {activeTab === 'revenue' && <FinanceRevenueTab params={params} />}
      {activeTab === 'sellers' && <FinanceSellersTab />}
      {activeTab === 'payouts' && <FinancePayoutsTab />}
      {activeTab === 'payout-methods' && <FinancePayoutMethodsTab />}
      {activeTab === 'transactions' && <FinanceTransactionsTab params={params} />}
      {activeTab === 'reports' && <FinanceReportsTab params={params} />}
      {activeTab === 'monthly-payouts' && <FinanceMonthlySettlementTab onOpenPayouts={() => setActiveTab('payouts')} />}
    </div>
    </>
  );
}
