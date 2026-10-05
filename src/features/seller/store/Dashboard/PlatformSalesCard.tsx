import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Check, ArrowRight, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/comman/ui';
import { useStoreCampaigns } from '@/hooks/store/useStoreCampaigns';
import type { JoinableCampaign } from '@/api/services/marketing';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { currencySymbol } from '@/utils/currency';

// A fixed discount is denominated in the campaign's own currency (the platform
// pivot); fall back to the store's base currency only if it's missing.
function offLabel(c: JoinableCampaign, storeCurrency?: string | null) {
  if (!c.discountValue) return null;
  return c.discountType === 'percentage' ? `${c.discountValue}% off` : `${currencySymbol(c.currency ?? storeCurrency)}${c.discountValue} off`;
}

function whenLabel(c: JoinableCampaign) {
  const now = Date.now();
  const start = new Date(c.startDate).getTime();
  const end = new Date(c.endDate).getTime();
  const day = 86_400_000;
  const fmt = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (start > now) return `Starts ${fmt(start)}`;
  const left = Math.ceil((end - now) / day);
  return left <= 1 ? 'Ends today' : `Ends in ${left} days`;
}

/** Store dashboard: Edudeen-wide sales running now (or soon), with Join right
 *  here — sellers no longer have to find them under Marketing. Hidden when
 *  there are none. */
export function PlatformSalesCard({ storeId }: { storeId: string }) {
  const navigate = useNavigate();
  const { store } = useStoreWorkspace();
  const { campaigns, loading, toggle } = useStoreCampaigns(storeId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (loading || campaigns.length === 0) return null;
  const shown = campaigns.slice(0, 3);

  const join = async (c: JoinableCampaign) => {
    setBusyId(c._id);
    setError('');
    try { await toggle(c); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not join this sale.'); }
    finally { setBusyId(null); }
  };

  return (
    <section aria-labelledby="platform-sales-title" className="dash-section-enter rounded-2xl border border-brand-green/25 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 bg-gradient-to-r from-brand-orange via-[#2f6b4f] to-brand-green text-white">
        <div className="flex items-center gap-3 min-w-0">
          <span className="size-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><Megaphone size={17} /></span>
          <div className="min-w-0">
            <p id="platform-sales-title" className="text-[15px] font-bold leading-tight">Edudeen sales</p>
            <p className="text-[12px] text-white/80 truncate">Sitewide sales buyers see on the homepage — join to put your products in front of them.</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/store/${storeId}/marketing?tab=platform`)}
          className="hidden sm:inline-flex items-center gap-1 text-[12.5px] font-semibold text-white/90 hover:text-white bg-transparent border-0 cursor-pointer shrink-0"
        >
          View all <ArrowRight size={13} />
        </button>
      </div>

      <ul className="divide-y divide-bone">
        {shown.map(c => {
          const off = offLabel(c, store?.baseCurrency);
          const isPlatform = c.sponsorType === 'platform';
          return (
            <li key={c._id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14px] font-bold text-carbon">{c.name}</p>
                  {off && <span className="text-[11px] font-bold px-2 py-[2px] rounded-full bg-brand-gold/15 text-[#8a7700]">{off}</span>}
                </div>
                <p className="flex items-center gap-1.5 text-[12px] text-slate mt-1">
                  <Clock size={11} /> {whenLabel(c)}
                  <span aria-hidden>·</span>
                  {isPlatform ? 'Edudeen pays the discount' : 'Discount comes from your earnings'}
                </p>
              </div>
              {isPlatform ? (
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-success shrink-0">
                  <Check size={14} /> You're included
                </span>
              ) : c.isJoined ? (
                <span className={clsx('inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-success shrink-0')}>
                  <Check size={14} /> Joined
                </span>
              ) : (
                <Button size="sm" className="shrink-0" loading={busyId === c._id} onClick={() => join(c)}>
                  Join sale
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {(error || campaigns.length > shown.length) && (
        <div className="px-5 sm:px-6 py-3 border-t border-bone flex items-center justify-between gap-3">
          {error ? <p className="text-[12px] text-error">{error}</p> : <span />}
          {campaigns.length > shown.length && (
            <button
              onClick={() => navigate(`/store/${storeId}/marketing?tab=platform`)}
              className="text-[12.5px] font-semibold text-brand-orange bg-transparent border-0 cursor-pointer"
            >
              +{campaigns.length - shown.length} more →
            </button>
          )}
        </div>
      )}
    </section>
  );
}
