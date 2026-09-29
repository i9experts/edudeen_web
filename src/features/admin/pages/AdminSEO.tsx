import { useState } from 'react';
import {
  LineChart, Settings, ListChecks, FileText, FolderTree, HelpCircle,
  Map, ArrowRightLeft, Link2, Plug, Radar,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TabBar, type Tab } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';

import { AnalyticsTab } from './seo/AnalyticsTab';
import { SettingsTab } from './seo/SettingsTab';
import { RulesTab } from './seo/RulesTab';
import { LandingPagesTab } from './seo/LandingPagesTab';
import { CategoryMetaTab } from './seo/CategoryMetaTab';
import { FaqMetaTab } from './seo/FaqMetaTab';
import { SitemapTab } from './seo/SitemapTab';
import { RedirectsTab } from './seo/RedirectsTab';
import { CanonicalTab } from './seo/CanonicalTab';
import { IntegrationsTab } from './seo/IntegrationsTab';
import { MonitoringTab } from './seo/MonitoringTab';

const TABS: Tab[] = [
  { id: 'analytics',     label: 'Analytics',       icon: <LineChart size={14} /> },
  { id: 'settings',      label: 'Settings',        icon: <Settings size={14} /> },
  { id: 'rules',         label: 'SEO Rules',       icon: <ListChecks size={14} /> },
  { id: 'landing-pages', label: 'Landing Pages',   icon: <FileText size={14} /> },
  { id: 'categories',    label: 'Category Meta',   icon: <FolderTree size={14} /> },
  { id: 'faqs',          label: 'FAQ Meta',        icon: <HelpCircle size={14} /> },
  { id: 'sitemap',       label: 'Sitemap',         icon: <Map size={14} /> },
  { id: 'redirects',     label: 'Redirects',       icon: <ArrowRightLeft size={14} /> },
  { id: 'canonical',     label: 'Canonical URLs',  icon: <Link2 size={14} /> },
  { id: 'integrations',  label: 'Integrations',    icon: <Plug size={14} /> },
  { id: 'monitoring',    label: 'Monitoring',      icon: <Radar size={14} /> },
];

export function AdminSEO() {
  usePageTitle('SEO');
  const [activeTab, setActiveTab] = useState('analytics');

  return (
    <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
      <AdminStudioHeader
        inset
        eyebrow="Edudeen team workspace · Growth"
        title="Platform SEO"
        subtitle="Marketplace-wide search visibility, structured data, and technical SEO controls."
      />

      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'analytics'     && <AnalyticsTab />}
      {activeTab === 'settings'      && <SettingsTab />}
      {activeTab === 'rules'         && <RulesTab />}
      {activeTab === 'landing-pages' && <LandingPagesTab />}
      {activeTab === 'categories'    && <CategoryMetaTab />}
      {activeTab === 'faqs'          && <FaqMetaTab />}
      {activeTab === 'sitemap'       && <SitemapTab />}
      {activeTab === 'redirects'     && <RedirectsTab />}
      {activeTab === 'canonical'     && <CanonicalTab />}
      {activeTab === 'integrations'  && <IntegrationsTab />}
      {activeTab === 'monitoring'    && <MonitoringTab />}
    </div>
  );
}
