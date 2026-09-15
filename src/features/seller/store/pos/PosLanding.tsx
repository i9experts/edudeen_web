import { useNavigate } from 'react-router-dom';
import { Monitor, CheckCircle2, Users, Receipt, BarChart3, ArrowRight, KeyRound } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { Button } from '@/components/comman/ui/Button';
import { Badge } from '@/components/comman/ui/Badge';

const FEATURES = [
  { icon: Receipt,   title: 'In-person checkout', desc: 'Ring up sales fast with barcode scan, search, and custom items.' },
  { icon: Users,     title: 'Employees & registers', desc: 'Give staff their own PIN login, registers, and shifts.' },
  { icon: BarChart3, title: 'Reports & reconciliation', desc: 'Daily and range reports, cash drawer reconciliation, audit log.' },
];

export function PosLanding() {
  usePageTitle('Point of Sale');
  const navigate = useNavigate();
  const { store, storeId } = useStoreWorkspace();
  const posEnabled = store?.enabledTools?.includes('pos_register') ?? false;

  return (
    <>
      <StorePageHeader
        title="Point of Sale"
        subtitle="Turn any device into a register and sell face-to-face."
      />

      <div className="px-3 sm:px-7 pt-5 pb-8">
        <div className="bg-white border border-bone rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-8 py-10 flex flex-col items-center text-center border-b border-bone">
            <div className="w-16 h-16 rounded-2xl bg-brand-pale-orange flex items-center justify-center mb-5">
              <Monitor size={28} className="text-brand-orange" />
            </div>

            {posEnabled ? (
              <Badge color="green" dot>Active on this store</Badge>
            ) : (
              <Badge color="orange" dot>Requires subscription</Badge>
            )}

            <p className="text-[22px] font-bold text-carbon mt-4 mb-2">
              Sell in person with Edudeen POS
            </p>
            <p className="text-[14px] text-slate max-w-[440px] leading-[1.6] mb-7">
              {posEnabled
                ? 'POS is active on this store. Open the register to start a shift and take sales.'
                : 'Unlock the point-of-sale terminal to accept in-person payments, manage employees and registers, and track every sale alongside your online store.'}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {!posEnabled && (
                <Button size="lg" variant="outline" iconRight={<ArrowRight size={16} />} onClick={() => navigate('/seller/subscriptions')}>
                  Subscribe Now
                </Button>
              )}
              <Button size="lg" icon={<Monitor size={16} />} onClick={() => navigate(`/store/${storeId}/pos/register`)}>
                Open POS
              </Button>
            </div>

            <button
              onClick={() => navigate(`/store/${storeId}/pos/login`)}
              className="flex items-center gap-[6px] mt-5 text-[12px] text-slate bg-transparent border-0 cursor-pointer hover:text-brand-orange"
            >
              <KeyRound size={13} />
              Employee? Log in with your PIN instead
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-bone">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="px-6 py-6">
                <Icon size={18} className="text-brand-orange mb-3" />
                <p className="text-[13px] font-semibold text-carbon mb-1">{title}</p>
                <p className="text-[12px] text-slate leading-[1.5]">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {posEnabled && (
          <div className="flex items-center gap-2 mt-4 text-[12px] text-slate">
            <CheckCircle2 size={14} className="text-success" />
            Employees, registers, shifts, settings, reports and the audit log are all inside the terminal's "Manage" tab.
          </div>
        )}
      </div>
    </>
  );
}
