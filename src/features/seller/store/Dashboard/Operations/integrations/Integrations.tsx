import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { StorePageHeader } from '@/components/layouts/StoreLayout';
import { CreditCard, BarChart2, Mail, Package, Zap, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ComingSoonBanner } from '@/components/comman/ui';

type AppTab = 'connected' | 'available';

interface AppDef {
  id: string; Icon: LucideIcon; iconBg: string; name: string; desc: string;
}

const CONNECTED_APPS: AppDef[] = [
  { id: 'stripe',           Icon: CreditCard, iconBg: '#EEF2FF', name: 'Stripe',           desc: 'Accept credit cards, Apple Pay, Google Pay.'  },
  { id: 'google-analytics', Icon: BarChart2,  iconBg: '#FFF8E1', name: 'Google Analytics', desc: 'Track store traffic and conversions.'          },
  { id: 'mailchimp',        Icon: Mail,       iconBg: '#FFF3E0', name: 'Mailchimp',        desc: 'Sync customers and send email campaigns.'      },
  { id: 'shippo',           Icon: Package,    iconBg: '#E8F5E9', name: 'Shippo',           desc: 'Discounted shipping labels and tracking.'      },
  { id: 'zapier',           Icon: Zap,        iconBg: '#FFF3E0', name: 'Zapier',           desc: 'Connect Edudeen to 5,000+ apps.'               },
];

const WEBHOOK_EVENTS = [
  'order.created','order.paid','order.fulfilled',
  'product.updated','refund.issued','review.posted',
];

const metrics = [
  { label: 'Connected Apps', value: String(CONNECTED_APPS.length), sub: 'Active integrations'  },
  { label: 'Last Sync',      value: '2:14 PM', sub: 'All apps synced today' },
  { label: 'Available Apps', value: '50+',     sub: 'In app marketplace'   },
] as const;

export function StoreIntegrations() {
  usePageTitle('Integrations');
  const [activeTab,   setActiveTab]   = useState<AppTab>('connected');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiKey]      = useState('sk_live_••••••••••••••••••••••••4821');
  const [webhookUrl,  setWebhookUrl]  = useState('');

  const filteredApps = CONNECTED_APPS.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <StorePageHeader
        title="Apps & Integrations"
        subtitle="Connect your favorite tools and extend Edudeen's power."
        actions={
          <div className="flex items-center gap-1.5 border border-bone rounded-lg px-3 bg-white transition-shadow duration-150 focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange/50">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8C8A82" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="border-none outline-none text-[13px] py-2 w-[120px] sm:w-[200px] text-charcoal bg-transparent"
            />
          </div>
        }
      />

      <div className="px-4 lg:px-7 pb-8 pt-5 flex flex-col gap-5">

        <ComingSoonBanner message="Apps & Integrations isn't connected to a real integrations backend yet — connections, API keys, and webhooks shown are illustrative." />

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {metrics.map(m => (
            <div key={m.label} className="bg-white border border-bone rounded-[10px] px-5 py-4">
              <p className="text-[11px] font-medium text-slate uppercase tracking-[0.06em] mb-1">{m.label}</p>
              <p className="text-[28px] font-bold text-carbon leading-[1.15]">{m.value}</p>
              <p className="text-xs text-slate mt-1">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('connected')}
            className="px-4 py-[7px] rounded-[20px] text-[13px] font-medium cursor-pointer border-none transition-all duration-[120ms] flex items-center gap-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
            style={{
              background: activeTab === 'connected' ? '#141413' : '#fff',
              color:      activeTab === 'connected' ? '#fff'    : '#4A4945',
              border: activeTab !== 'connected' ? '1px solid #E8E6DC' : '1px solid transparent',
            }}
          >
            <Check size={13} /> Connected ({CONNECTED_APPS.length})
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className="px-4 py-[7px] rounded-[20px] text-[13px] font-medium cursor-pointer border-none transition-all duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
            style={{
              background: activeTab === 'available' ? '#141413' : '#fff',
              color:      activeTab === 'available' ? '#fff'    : '#4A4945',
              border: activeTab !== 'available' ? '1px solid #E8E6DC' : '1px solid transparent',
            }}
          >
            Available (6)
          </button>
        </div>

        {/* Connected Apps Grid */}
        {activeTab === 'connected' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApps.map(app => (
              <div key={app.id} className="bg-white border border-bone rounded-[10px] px-4 sm:px-[22px] py-5 relative transition-transform duration-200 hover:-translate-y-[1px]">
                <div className="absolute top-4 right-4">
                  <span className="px-[9px] py-[3px] rounded-[5px] text-[11px] font-semibold bg-[#e3f4ea] text-[#1e7a3c] flex items-center gap-1">
                    <Check size={10} /> Connected
                  </span>
                </div>
                <div className="w-[46px] h-[46px] rounded-[10px] flex items-center justify-center mb-3 shrink-0" style={{ background: app.iconBg }}>
                  <app.Icon size={22} style={{ color: '#6B7280' }} />
                </div>
                <p className="text-[16px] font-bold text-carbon mb-1 pr-[80px]">{app.name}</p>
                <p className="text-[13px] text-slate mb-4 leading-[1.5]">{app.desc}</p>
                <div className="flex items-center gap-2">
                  <button
                    disabled
                    title="Not connected to a backend yet"
                    className="px-[14px] py-[5px] bg-white border border-bone rounded-[7px] text-xs text-graphite opacity-50 cursor-not-allowed"
                  >
                    Configure
                  </button>
                  <button
                    disabled
                    title="Not connected to a backend yet"
                    className="px-[14px] py-[5px] bg-[#fdecea] border border-[#f5c6c2] rounded-[7px] text-xs font-medium text-[#c0392b] opacity-50 cursor-not-allowed"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'available' && (
          <div className="flex items-center justify-center py-[60px] text-slate text-[14px]">
            Browse 50+ available apps in the marketplace.
          </div>
        )}

        {/* Developer Tools */}
        <div className="bg-white border border-bone rounded-[10px] px-4 sm:px-[22px] py-5 mt-1">
          <p className="text-[15px] font-bold text-carbon mb-5">Developer Tools — API &amp; Webhooks</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            <div>
              <p className="text-xs font-medium text-graphite mb-1.5">API Key</p>
              <input
                readOnly
                value={apiKey}
                className="w-full font-mono text-xs text-graphite px-3 py-[9px] rounded-lg border border-bone bg-cream outline-none box-border"
              />
              <div className="flex gap-2 mt-2">
                <button
                  disabled
                  title="Not connected to a backend yet"
                  className="px-[14px] py-[5px] bg-white border border-bone rounded-[7px] text-xs text-graphite opacity-50 cursor-not-allowed"
                >
                  Copy
                </button>
                <button
                  disabled
                  title="Not connected to a backend yet"
                  className="px-[14px] py-[5px] bg-[#fdecea] border border-[#f5c6c2] rounded-[7px] text-xs font-medium text-[#c0392b] opacity-50 cursor-not-allowed"
                >
                  Regenerate
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-graphite mb-1.5">Webhook URL</p>
              <div className="flex items-center gap-2">
                <input
                  placeholder="https://your-app.com/webhooks/edudeen"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  className="flex-1 px-3 py-[9px] text-[13px] border border-bone rounded-lg bg-white text-charcoal outline-none transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50"
                />
                <button
                  disabled
                  title="Not connected to a backend yet"
                  className="px-4 py-[9px] bg-brand-orange border-none rounded-lg text-xs font-semibold text-white opacity-50 cursor-not-allowed shrink-0"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-graphite mb-[10px]">Active Webhook Events</p>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map(event => (
                <span key={event} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e3f4ea] rounded-[20px] text-[11px] font-medium text-[#1e7a3c]">
                  <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                  {event}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
