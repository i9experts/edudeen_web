import { Building2, Loader2, User } from 'lucide-react';
import { useStoreCampaigns } from '@/hooks/store/useStoreCampaigns';
import { currencySymbol } from '@/utils/currency';
import type { JoinableCampaign } from '@/api/services/marketing';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function timing(c: JoinableCampaign): string {
  const now = Date.now();
  const start = new Date(c.startDate).getTime();
  const end = new Date(c.endDate).getTime();
  if (start > now) return `Starts ${day(c.startDate)} · ends ${day(c.endDate)}`;
  const left = end - now;
  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  return `Ends in ${days > 0 ? `${days}d ${hours}h` : `${Math.max(hours, 0)}h`} (${day(c.endDate)})`;
}

function headline(c: JoinableCampaign): string {
  if (!c.discountType || c.discountValue == null) return 'Featured sale';
  return c.discountType === 'percentage' ? `${c.discountValue}% off` : `${currencySymbol(c.currency ?? 'USD')}${c.discountValue} off`;
}

/** "Join a running sale": the admin campaigns this store can join right now (or soon). The seller ticks which of THIS
 *  product's listings take part; the sale applies only to ticked products. Nothing is ticked by default. */
export function CampaignPicker({ storeId, value, onChange }: {
  storeId: string;
  /** null = not loaded yet (edit page) */
  value: string[] | null;
  onChange: (next: string[]) => void;
}) {
  const { campaigns, loading, error } = useStoreCampaigns(storeId);
  const selected = value ?? [];
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  if (loading && campaigns.length === 0) {
    return <p className="flex items-center gap-2 text-[13px] text-slate"><Loader2 size={14} className="animate-spin" /> Loading running sales…</p>;
  }
  if (error && campaigns.length === 0) return <p className="text-[13px] text-error">{error}</p>;
  if (campaigns.length === 0) {
    return <p className="text-[13px] text-slate">No sale is running or about to start. When the Edudeen team launches one, it shows up here.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-slate leading-relaxed">
        The sale applies only to products you tick. While a sale runs, your own discounts and sale prices on that product are hidden; they come back when it ends.
      </p>
      <ul className="list-none p-0 m-0 flex flex-col gap-2">
        {campaigns.map(c => {
          const on = selected.includes(c._id);
          return (
            <li key={c._id}>
              <label className={`flex items-start gap-3 px-3.5 py-3 rounded-lg border cursor-pointer transition-colors ${on ? 'border-brand-royal bg-brand-royal/5' : 'border-bone bg-white hover:border-brand-royal/40'}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(c._id)}
                  disabled={value === null}
                  className="mt-[3px] size-4 accent-[#174771] cursor-pointer"
                />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-carbon">{c.name}</span>
                    <span className="text-[12px] font-bold text-brand-orange bg-brand-pale-orange rounded-full px-2 py-[1px]">{headline(c)}</span>
                  </span>
                  <span className="block text-[12px] text-slate mt-0.5">{timing(c)}</span>
                  <span className="flex items-center gap-1 text-[12px] text-slate mt-1">
                    {c.sponsorType === 'platform'
                      ? <><Building2 size={12} className="text-success" /> Edudeen covers this discount</>
                      : <><User size={12} /> The discount comes out of your payout{!c.isJoined && ' (ticking joins your store)'}</>}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
