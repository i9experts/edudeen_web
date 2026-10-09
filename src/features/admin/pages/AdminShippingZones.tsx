import { useCallback, useEffect, useState } from 'react';
import { Truck, Plus, Pencil, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, Modal, EmptyState, SkeletonBox } from '@/components/comman/ui';
import { AdminStudioHeader, ADMIN_GUTTER } from '@/features/admin/components/studio';
import {
  apiAdminSeedDefaultShippingZones, apiAdminListShippingZones, apiAdminCreateShippingZone, apiAdminUpdateShippingZone, apiAdminDeleteShippingZone,
  shippingZoneLabel, type ShippingZone, type ShippingZonePayload,
} from '@/api/services/shipping';

const INPUT = 'w-full py-[9px] px-3 text-[13px] border border-bone rounded-lg outline-none bg-white text-charcoal focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10';
const LABEL = 'block text-[12px] font-medium text-graphite mb-[6px]';

type Draft = { country: string; province: string; city: string; shippingPrice: string; estimatedDeliveryTime: string; active: boolean };
const EMPTY: Draft = { country: 'Pakistan', province: '', city: '', shippingPrice: '', estimatedDeliveryTime: '3-5 days', active: true };

const toDraft = (z: ShippingZone): Draft => ({
  country: z.country, province: z.province ?? '', city: z.city ?? '',
  shippingPrice: String(z.shippingPrice), estimatedDeliveryTime: z.estimatedDeliveryTime ?? '', active: z.status !== 'inactive',
});

function ZoneModal({ zone, onClose, onSaved }: { zone: ShippingZone | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(zone ? toDraft(zone) : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof Draft, v: string | boolean) => setD(p => ({ ...p, [k]: v }));

  const save = async () => {
    const price = Number(d.shippingPrice);
    if (!d.country.trim()) { setError('Country is required.'); return; }
    if (d.shippingPrice.trim() === '' || !Number.isFinite(price) || price < 0) { setError('Enter a shipping price of 0 or more.'); return; }
    const payload: ShippingZonePayload = {
      country: d.country.trim(),
      province: d.province.trim() || null,
      city: d.city.trim() || null,
      shippingPrice: price,
      estimatedDeliveryTime: d.estimatedDeliveryTime.trim() || null,
      status: d.active ? 'active' : 'inactive',
    };
    setSaving(true);
    setError('');
    try {
      if (zone) await apiAdminUpdateShippingZone(zone._id, payload);
      else await apiAdminCreateShippingZone(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this zone.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={zone ? 'Edit shipping zone' : 'New shipping zone'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving}>{zone ? 'Save changes' : 'Create zone'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor="zone-country">Country</label>
          <input id="zone-country" className={INPUT} value={d.country} onChange={e => set('country', e.target.value)} />
        </div>
        <div>
          <label className={LABEL} htmlFor="zone-province">Province / State</label>
          <input id="zone-province" className={INPUT} value={d.province} onChange={e => set('province', e.target.value)} placeholder="e.g. Sindh — blank = whole country" />
        </div>
        <div>
          <label className={LABEL} htmlFor="zone-city">City</label>
          <input id="zone-city" className={INPUT} value={d.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Karachi — blank = whole province" />
        </div>
        <div>
          <label className={LABEL} htmlFor="zone-price">Shipping price (PKR)</label>
          <input id="zone-price" className={INPUT} inputMode="numeric" value={d.shippingPrice} onChange={e => set('shippingPrice', e.target.value)} placeholder="0 = free" />
        </div>
        <div>
          <label className={LABEL} htmlFor="zone-eta">Delivery time</label>
          <input id="zone-eta" className={INPUT} value={d.estimatedDeliveryTime} onChange={e => set('estimatedDeliveryTime', e.target.value)} placeholder="e.g. 2-3 days" />
        </div>
        <label className="sm:col-span-2 flex items-center gap-2 text-[12.5px] text-graphite cursor-pointer">
          <input type="checkbox" checked={d.active} onChange={e => set('active', e.target.checked)} className="w-[15px] h-[15px] accent-brand-orange" />
          Offer this zone at checkout
        </label>
      </div>
      <p className="text-[12px] text-slate mt-3">
        Buyers see the zone for their city first, then their province's, then a country-wide one — so one country-wide zone covers everywhere else.
      </p>
      {error && <p role="alert" className="text-[12px] text-error mt-2">{error}</p>}
    </Modal>
  );
}

export function AdminShippingZones() {
  usePageTitle('Shipping Zones');
  const [zones, setZones] = useState<ShippingZone[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ShippingZone | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ShippingZone | null>(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState('');

  // Adds the starter Pakistan zones that don't exist yet (existing zones are never changed).
  const seedDefaults = async () => {
    if (!window.confirm('Add the default Pakistan delivery zones? Zones you already have are not changed.')) return;
    setSeeding(true);
    setError('');
    setNotice('');
    try {
      const res = await apiAdminSeedDefaultShippingZones();
      setNotice(res.message);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the default zones.');
    } finally {
      setSeeding(false);
    }
  };

  const load = useCallback(() => {
    setError('');
    apiAdminListShippingZones()
      .then(res => setZones(res.data ?? []))
      .catch(err => { setZones([]); setError(err instanceof Error ? err.message : 'Failed to load shipping zones.'); });
  }, []);
  useEffect(load, [load]);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try { await apiAdminDeleteShippingZone(deleting._id); setDeleting(null); load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete zone.'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Commerce"
        title="Shipping Zones"
        subtitle="Where physical orders can be delivered, and what buyers pay for shipping. Prices are in PKR."
        actions={
          <>
            <Button variant="outline" onClick={seedDefaults} loading={seeding}>Add default PK zones</Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setEditing('new')}>New zone</Button>
          </>
        }
      />

      <div className={clsx(ADMIN_GUTTER, 'pt-6 pb-8 flex flex-col gap-4')}>
        {zones !== null && zones.length === 0 && !error && (
          <div className="text-[12.5px] text-charcoal bg-brand-pale-orange/50 border border-brand-orange/20 rounded-xl px-4 py-3">
            No zones yet, so checkout offers free <b>Standard delivery</b> everywhere. Add a country-wide zone (leave province and city blank) to start charging shipping.
          </div>
        )}
        {error && <p role="alert" className="text-[13px] text-error">{error}</p>}
        {notice && <p role="status" className="text-[13px] text-success">{notice}</p>}

        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          {zones === null ? (
            <div className="p-5 flex flex-col gap-3">
              <SkeletonBox height={40} rounded="8px" /><SkeletonBox height={40} rounded="8px" />
            </div>
          ) : zones.length === 0 ? (
            <EmptyState icon={<Truck size={28} className="text-slate" />} title="No shipping zones" description="Create one to set delivery prices for buyers." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-cream text-[12px] uppercase tracking-[0.06em] text-slate">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Delivers to</th>
                    <th className="px-5 py-3 font-semibold">Price</th>
                    <th className="px-5 py-3 font-semibold">Delivery time</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-bone">
                  {zones.map(z => (
                    <tr key={z._id}>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-carbon">{shippingZoneLabel(z)}</p>
                        <p className="text-[12px] text-slate">{z.country}</p>
                      </td>
                      <td className="px-5 py-3 font-semibold text-carbon">{z.shippingPrice > 0 ? `Rs ${z.shippingPrice.toLocaleString()}` : 'Free'}</td>
                      <td className="px-5 py-3 text-charcoal">{z.estimatedDeliveryTime || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={clsx('text-[12px] font-semibold px-2 py-[2px] rounded-full', z.status === 'inactive' ? 'bg-bone text-slate' : 'bg-success-bg text-success')}>
                          {z.status === 'inactive' ? 'Off' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button aria-label={`Edit ${shippingZoneLabel(z)}`} onClick={() => setEditing(z)} className="size-8 rounded-lg flex items-center justify-center text-slate hover:text-carbon hover:bg-cream cursor-pointer bg-transparent border-0"><Pencil size={14} /></button>
                          <button aria-label={`Delete ${shippingZoneLabel(z)}`} onClick={() => setDeleting(z)} className="size-8 rounded-lg flex items-center justify-center text-slate hover:text-error hover:bg-error-bg cursor-pointer bg-transparent border-0"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <ZoneModal
          zone={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {deleting && (
        <Modal title="Delete shipping zone?" onClose={() => setDeleting(null)} footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={busy}>Cancel</Button>
            <Button variant="primary" onClick={remove} loading={busy}>Delete</Button>
          </>
        }>
          <p className="text-[13px] text-slate">Buyers in <b>{shippingZoneLabel(deleting)}</b> will no longer see this shipping option.</p>
        </Modal>
      )}
    </div>
  );
}
