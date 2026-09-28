import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { SellerPageHeader } from '@/components/layouts/SellerLayout';
import { MapPin, Truck, Tag, Home, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useShippingZones } from '@/hooks/shipping/useShippingZones';
import { Button, SkeletonBox, EmptyState } from '@/components/comman/ui';

// ── Data ──────────────────────────────────────────────────────────────────────
const TABS: { id: string; Icon: LucideIcon; label: string }[] = [
  { id: 'zones',    Icon: MapPin, label: 'Zones'              },
  { id: 'carriers', Icon: Truck,  label: 'Carriers'           },
  { id: 'labels',   Icon: Tag,    label: 'Labels & Tracking'  },
  { id: 'local',    Icon: Home,   label: 'Local Delivery'     },
];

// ── Component ─────────────────────────────────────────────────────────────────
export function SellerShipping() {
  usePageTitle('Shipping');
  const [activeTab, setActiveTab] = useState('zones');
  const { zones, loading, error, refetch } = useShippingZones();

  return (
    <>
      <SellerPageHeader
        title="Shipping"
        subtitle="Platform-wide shipping zones and rates used at checkout."
        actions={
          <Button variant="primary" size="sm" disabled title="Per-seller shipping zones aren't available yet — zones shown are platform-wide.">
            + Add Shipping Zone
          </Button>
        }
      />

      <div className="px-4 lg:px-7 pt-5 pb-8 flex flex-col gap-5">

        {/* ── Metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white border border-bone rounded-[10px] px-5 py-4">
            <p className="text-[11px] font-medium text-slate uppercase tracking-[0.06em] mb-1">Active Zones</p>
            <p className="text-[28px] font-bold text-carbon leading-[1.15]">{loading ? '—' : zones.filter(z => z.status === 'active').length}</p>
            <p className="text-xs text-slate mt-1">Platform-wide, used at checkout</p>
          </div>
          <div className="bg-white border border-bone rounded-[10px] px-5 py-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-slate shrink-0" />
            <p className="text-xs text-slate leading-[1.5]">
              Per-seller shipping analytics (labels printed, on-time delivery) aren't available yet.
            </p>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="border-b border-bone overflow-x-auto -mx-7 px-7 sm:mx-0 sm:px-0 sm:overflow-visible">
          <div className="flex items-center gap-0 w-max sm:w-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] cursor-pointer border-none bg-transparent transition-all duration-[120ms] -mb-px whitespace-nowrap shrink-0"
                style={{
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  borderBottom: `2px solid ${activeTab === tab.id ? '#174771' : 'transparent'}`,
                  color: activeTab === tab.id ? '#0F3354' : '#8C8A82',
                }}
              >
                <tab.Icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Zones Tab ── */}
        {activeTab === 'zones' && (
          loading ? (
            <div className="flex flex-col gap-3.5">
              {[1, 2, 3].map(i => <SkeletonBox key={i} height={90} rounded="10px" />)}
            </div>
          ) : error ? (
            <div className="bg-white border border-bone rounded-[10px] px-5 py-8 text-center">
              <p className="text-[13px] text-error mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>Try again</Button>
            </div>
          ) : zones.length === 0 ? (
            <EmptyState icon={<MapPin size={28} className="text-slate/50" />} title="No shipping zones configured" description="Platform shipping zones will appear here once configured." />
          ) : (
            <div className="flex flex-col gap-3.5">
              {zones.map(zone => (
                <div key={zone._id} className="bg-white border border-bone rounded-[10px] px-4 sm:px-[22px] py-[18px]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-carbon mb-[3px]">{zone.city}, {zone.province}</p>
                      <p className="text-xs text-slate">{zone.country} · Est. delivery {zone.estimatedDeliveryTime}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Shipping zones are a Pakistan-domestic geography feature — always
                          PKR-priced regardless of a store's own baseCurrency (see
                          checkout.service.ts's SHIPPING_ZONE_CURRENCY constant), so this
                          is intentionally never store-currency-dependent. */}
                      <span className="text-sm font-bold text-brand-orange">Rs {zone.shippingPrice.toLocaleString()}</span>
                      <span className={`px-2.5 py-[3px] rounded-[5px] text-[11px] font-semibold ${zone.status === 'active' ? 'bg-[#e3f4ea] text-[#1e7a3c]' : 'bg-bone text-slate'}`}>
                        {zone.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Placeholder Tabs ── */}
        {activeTab !== 'zones' && (
          <div className="flex items-center justify-center h-[180px] bg-white border border-bone rounded-[10px]">
            <p className="text-[13px] text-slate">
              {TABS.find(t => t.id === activeTab)?.label} — coming soon
            </p>
          </div>
        )}

      </div>
    </>
  );
}
