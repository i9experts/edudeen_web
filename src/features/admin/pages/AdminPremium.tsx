import { useSearchParams, Link } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TabBar } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import { apiAdminPremiumStats } from '@/api/services/adminPremium';
import { PremiumOverviewTab } from './premium/PremiumOverviewTab';
import { PremiumPlansTab } from './premium/PremiumPlansTab';
import { PremiumMembersTab } from './premium/PremiumMembersTab';
import { PremiumPaymentsTab } from './premium/PremiumPaymentsTab';
import { useLoad } from './premium/useLoad';

const TAB_IDS = ['overview', 'plans', 'members', 'payments'] as const;
type TabId = (typeof TAB_IDS)[number];

export function AdminPremium() {
  usePageTitle('Premium');
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: TabId = (TAB_IDS as readonly string[]).includes(raw ?? '') ? (raw as TabId) : 'overview';
  const status = params.get('status') ?? '';
  const { data: stats } = useLoad(() => apiAdminPremiumStats().then(r => r.data), []);

  const goTo = (t: string, extra?: string) => `/admin/premium?tab=${t}${extra ? `&${extra}` : ''}`;
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'plans', label: 'Plans' },
    { id: 'members', label: 'Members' },
    { id: 'payments', label: 'Payments', count: stats?.pendingPayments || undefined },
  ];

  return (
    <div>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Commerce"
        title="Edudeen Premium"
        subtitle="Buyer membership: plans, members and bank-transfer payments."
        actions={<Link to="/admin/manual-payments" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-orange no-underline"><Landmark size={14} />Order payment proofs</Link>}
      />
      <div className="px-4 sm:px-7 pt-5 pb-8 flex flex-col gap-4">
        <TabBar tabs={tabs} active={tab} onChange={id => setParams({ tab: id })} />
        {tab === 'overview' && <PremiumOverviewTab goTo={goTo} />}
        {tab === 'plans' && <PremiumPlansTab />}
        {tab === 'members' && <PremiumMembersTab key={`m-${status}`} initialStatus={status} />}
        {tab === 'payments' && <PremiumPaymentsTab key={`p-${status}`} initialStatus={status} />}
      </div>
    </div>
  );
}
