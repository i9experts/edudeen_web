import { useState } from 'react';
import { LayoutDashboard, ListChecks, Wallet, Receipt, Sparkles } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TabBar, type Tab } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';

import { OverviewTab } from './ai-studio/OverviewTab';
import { GenerationsTab } from './ai-studio/GenerationsTab';
import { WalletsTab } from './ai-studio/WalletsTab';
import { TransactionsTab } from './ai-studio/TransactionsTab';
import { PlatformGenerateTab } from './ai-studio/PlatformGenerateTab';
import { AskDataTab } from './ai-studio/AskDataTab';

const TABS: Tab[] = [
  { id: 'overview',     label: 'Overview',           icon: <LayoutDashboard size={14} /> },
  { id: 'generations',  label: 'Generations',        icon: <ListChecks size={14} /> },
  { id: 'wallets',      label: 'Wallets',            icon: <Wallet size={14} /> },
  { id: 'transactions', label: 'Transactions',       icon: <Receipt size={14} /> },
  { id: 'generate',     label: 'Generate for Edudeen', icon: <Sparkles size={14} /> },
  { id: 'ask',          label: 'Ask your data',      icon: <Sparkles size={14} /> },
];

export function AdminAiStudio() {
  usePageTitle('AI Studio');
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div>
      <AdminStudioHeader eyebrow="Edudeen team workspace · Growth" title="AI Studio" subtitle="Cross-store AI usage oversight, credit wallets, and Edudeen's own AI-generated content." />

      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview'     && <OverviewTab />}
      {activeTab === 'generations'  && <GenerationsTab />}
      {activeTab === 'wallets'      && <WalletsTab />}
      {activeTab === 'transactions' && <TransactionsTab />}
      {activeTab === 'generate'     && <PlatformGenerateTab />}
      {activeTab === 'ask'          && <AskDataTab />}
      </div>
    </div>
  );
}
