import { useCallback, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { Input, Select } from '@/components/comman/ui/Input';
import { Toggle } from '@/components/comman/ui/Toggle';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import {
  apiListCampaigns, apiUpdateCampaign, type Campaign, type DiscountType,
} from '@/api/services/marketing/adminMarketing';
import { useReauth } from '@/contexts/reauthCtx';
import { inlineEditConfig } from '@/api/services/reauth';

export const CAMPAIGNS_CHANGED_EVENT = 'edudeen:campaigns-changed';

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, not the raw ISO string.
function toLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATE: Record<string, string> = { active: 'Live', draft: 'Draft', ended: 'Ended' };

/** Inline editor for the sale campaigns behind the home deals banner: title, discount, dates, active. Every save asks for the admin password. */
export default function DealsEditorModal({ onClose }: { onClose: () => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Campaign | null>(null);

  const load = useCallback(async () => {
    setError('');
    try { setCampaigns((await apiListCampaigns()).data ?? []); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load campaigns.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <Modal mobileSheet width={620} title="Edit deals banner" onClose={onClose} footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
        <p className="text-[12px] text-slate mb-3">The banner shows every live campaign. New campaigns are created in Admin → Marketing. Each save asks for your password and goes live immediately.</p>
        {error && <p className="text-[12px] text-error mb-2" role="alert">{error}</p>}
        {loading ? (
          <div className="flex flex-col gap-2"><SkeletonBox className="h-[56px] w-full" /><SkeletonBox className="h-[56px] w-full" /></div>
        ) : campaigns.length === 0 ? (
          <p className="text-[13px] text-slate py-6 text-center">No campaigns yet. Create one in Admin → Marketing.</p>
        ) : (
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {campaigns.map(c => (
              <li key={c._id} className="flex items-center gap-3 rounded-xl border border-bone p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-carbon truncate">{c.name}</p>
                  <p className="text-[12px] text-slate truncate">
                    {STATE[c.status] ?? c.status}
                    {c.discountValue != null ? ` · ${c.discountType === 'percentage' ? `${c.discountValue}%` : c.discountValue} off` : ''}
                    {` · ${new Date(c.startDate).toLocaleDateString()} - ${new Date(c.endDate).toLocaleDateString()}`}
                  </p>
                </div>
                <button type="button" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-bone bg-white text-charcoal cursor-pointer hover:bg-fog">
                  <Pencil size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
      {editing && <CampaignForm campaign={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); window.dispatchEvent(new Event(CAMPAIGNS_CHANGED_EVENT)); }} />}
    </>
  );
}

function CampaignForm({ campaign, onClose, onSaved }: { campaign: Campaign; onClose: () => void; onSaved: () => void }) {
  const { confirm } = useReauth();
  const [name, setName] = useState(campaign.name);
  const [discountType, setDiscountType] = useState<DiscountType | ''>(campaign.discountType ?? '');
  const [discountValue, setDiscountValue] = useState(campaign.discountValue != null ? String(campaign.discountValue) : '');
  const [startDate, setStartDate] = useState(toLocal(campaign.startDate));
  const [endDate, setEndDate] = useState(toLocal(campaign.endDate));
  const [active, setActive] = useState(campaign.status === 'active');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = async () => {
    setError('');
    if (!name.trim()) { setError('The title is required.'); return; }
    if (!startDate || !endDate) { setError('Start and end dates are required.'); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError('End date must be after start date.'); return; }
    const value = Number(discountValue);
    if (discountType && (!discountValue || !Number.isFinite(value) || value <= 0 || (discountType === 'percentage' && value > 100))) {
      setError(discountType === 'percentage' ? 'Enter a percentage between 1 and 100.' : 'Enter a discount amount above 0.');
      return;
    }
    if (campaign.sponsorType === 'platform' && !discountType) { setError('A platform-sponsored campaign needs a discount.'); return; }
    const token = await confirm();
    if (!token) return; // not confirmed: nothing is changed
    const cfg = inlineEditConfig(token);
    setBusy(true);
    try {
      await apiUpdateCampaign(campaign._id, {
        name: name.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        ...(discountType ? { discountType, discountValue: value } : {}),
        // Same request as the other fields: the server applies everything or nothing.
        ...(active !== (campaign.status === 'active') ? { status: active ? 'active' as const : 'draft' as const } : {}),
      }, cfg);
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save the campaign.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal mobileSheet width={520} title="Edit campaign" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={update} loading={busy}>Update</Button></>}>
      <div className="flex flex-col gap-3">
        <Input label="Title" value={name} maxLength={100} onChange={e => setName(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Discount type" value={discountType} onChange={e => setDiscountType(e.target.value as DiscountType | '')}>
            <option value="">No discount shown</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </Select>
          <Input label="Discount value" type="number" min={0} value={discountValue} disabled={!discountType} onChange={e => setDiscountValue(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Start" type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input label="End" type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <Toggle label="Active (live on the site)" checked={active} onChange={setActive} />
        {campaign.status === 'ended' && active && <p className="text-[12px] text-slate">This campaign had ended; turning it on makes it live again if the dates cover today.</p>}
        {error && <p className="text-[12px] text-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
