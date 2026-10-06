import { useState } from 'react';
import { clsx } from 'clsx';
import { Construction, AlertTriangle, CalendarClock, Power } from 'lucide-react';
import { Button, Input, Textarea, Modal } from '@/components/comman/ui';
import { useUpdateMaintenanceMode } from '@/hooks/admin/useAdminConfig';
import type { PlatformConfig } from '@/api/services/config/adminConfig';
import {
  MAINTENANCE_SCOPE_INFO, MAINTENANCE_TYPE_INFO, type MaintenanceScope, type MaintenanceType,
} from '@/api/services/maintenance';

const SCOPES = Object.keys(MAINTENANCE_SCOPE_INFO) as MaintenanceScope[];
const TYPES = Object.keys(MAINTENANCE_TYPE_INFO) as MaintenanceType[];

const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

/**
 * Maintenance control: what is down (scopes), what kind of work it is (type),
 * what users are told, and when — switch on now, or schedule it so users see a
 * heads-up notice first. Admin tools and sign-in always stay reachable.
 */
export function MaintenanceCard({ config, onSaved }: { config: PlatformConfig; onSaved: (c: PlatformConfig) => void }) {
  const { update, submitting, error } = useUpdateMaintenanceMode();
  const m = config.maintenance;
  const armed = m?.enabled ?? config.maintenanceMode;
  const [type, setType] = useState<MaintenanceType>(m?.type ?? 'scheduled_upgrade');
  const [scopes, setScopes] = useState<MaintenanceScope[]>(m?.scopes?.length ? m.scopes : ['all']);
  const [title, setTitle] = useState(m?.title ?? '');
  const [message, setMessage] = useState(m?.message ?? '');
  const [startsAt, setStartsAt] = useState(toLocalInput(m?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(m?.endsAt));
  const [statusNote, setStatusNote] = useState(m?.statusNote ?? '');
  const [confirming, setConfirming] = useState(false);
  const [localError, setLocalError] = useState('');

  const futureStart = startsAt && new Date(startsAt).getTime() > Date.now();
  const state: 'off' | 'scheduled' | 'live' = !armed ? 'off' : m?.startsAt && new Date(m.startsAt).getTime() > Date.now() ? 'scheduled' : 'live';
  const info = MAINTENANCE_TYPE_INFO[type];

  const toggleScope = (s: MaintenanceScope) => setScopes(cur => {
    if (s === 'all') return ['all'];
    const without = cur.filter(x => x !== 'all' && x !== s);
    const next = cur.includes(s) ? without : [...without, s];
    return next.length ? next : ['all'];
  });

  const pickType = (t: MaintenanceType) => {
    // Only overwrite wording the admin hasn't customised.
    if (!title || title === MAINTENANCE_TYPE_INFO[type].defaultTitle) setTitle(MAINTENANCE_TYPE_INFO[t].defaultTitle);
    if (!message || message === MAINTENANCE_TYPE_INFO[type].defaultMessage) setMessage(MAINTENANCE_TYPE_INFO[t].defaultMessage);
    setType(t);
  };

  const payload = (enable: boolean) => ({
    maintenanceMode: enable, scopes, type,
    title: title.trim() || info.defaultTitle, message: message.trim() || info.defaultMessage,
    startsAt: toIso(startsAt), endsAt: toIso(endsAt), statusNote: statusNote.trim(),
  });

  async function apply(enable: boolean) {
    setLocalError('');
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) { setLocalError('The expected end must be after the start.'); setConfirming(false); return; }
    const res = await update(payload(enable));
    if (res) onSaved(typeof res === 'object' ? res : { ...config, maintenanceMode: enable });
    setConfirming(false);
  }

  const pill = {
    off:       'bg-[#eef1f2] text-slate',
    scheduled: 'bg-[#fff4d6] text-[#8a6100]',
    live:      'bg-error-bg text-error',
  }[state];

  return (
    <>
      <div className="bg-white rounded-[10px] px-[22px] py-5 transition-[border-color] duration-200" style={{ border: state === 'live' ? '2px solid #C13030' : '1px solid #E1E7EA' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] flex items-center gap-[6px] mb-[3px]">
              <Construction size={16} className="text-error" /> Maintenance
            </p>
            <p className="text-[12px] text-slate max-w-[60ch]">
              Say what is down and why. Only the areas you pick are blocked; admin tools and sign-in always keep working, and you can browse the site as an admin.
            </p>
          </div>
          <span className={clsx('rounded-full px-3 py-1 text-[11.5px] font-bold', pill)}>
            {state === 'off' ? 'Off' : state === 'scheduled' ? 'Scheduled' : 'Live now'}
          </span>
        </div>

        {/* What kind of work */}
        <p className="text-[12px] font-semibold text-charcoal mt-5 mb-2">What kind of work?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {TYPES.map(t => (
            <button key={t} type="button" onClick={() => pickType(t)} aria-pressed={type === t}
              className={clsx('text-start rounded-lg border px-3 py-2 cursor-pointer bg-white', type === t ? 'border-brand-orange ring-2 ring-brand-pale-orange' : 'border-bone hover:border-[#c5c4bc]')}>
              <span className="block text-[13px] font-semibold text-carbon">{MAINTENANCE_TYPE_INFO[t].label}</span>
              <span className="block text-[11.5px] text-slate">{MAINTENANCE_TYPE_INFO[t].blurb}</span>
            </button>
          ))}
        </div>

        {/* What is affected */}
        <p className="text-[12px] font-semibold text-charcoal mt-5 mb-2">What is affected?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SCOPES.map(s => (
            <label key={s} className={clsx('flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer', scopes.includes(s) ? 'border-brand-orange bg-brand-pale-orange/30' : 'border-bone')}>
              <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} className="mt-[3px] accent-brand-orange" />
              <span>
                <span className="block text-[13px] font-semibold text-carbon">{MAINTENANCE_SCOPE_INFO[s].label}</span>
                <span className="block text-[11.5px] text-slate">{MAINTENANCE_SCOPE_INFO[s].hint}</span>
              </span>
            </label>
          ))}
        </div>

        {/* What users read */}
        <div className="grid grid-cols-1 gap-3 mt-5">
          <Input label="Headline users see" value={title} onChange={e => setTitle(e.target.value)} placeholder={info.defaultTitle} maxLength={120} />
          <Textarea label="Message" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder={info.defaultMessage} maxLength={1000} />
        </div>

        {/* When */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <Input label="Starts (leave empty to start now)" type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
          <Input label="Expected to finish" type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
        </div>
        <div className="mt-3">
          <Input label="Live progress note (optional)" value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="e.g. Database migration 60% done" maxLength={300} />
        </div>

        {/* Preview */}
        <div className="mt-4 rounded-lg bg-cream border border-bone px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate m-0 mb-1">Users will see</p>
          <p className="text-[14px] font-bold text-carbon m-0">{title.trim() || info.defaultTitle}</p>
          <p className="text-[12.5px] text-charcoal m-0 mt-1">{message.trim() || info.defaultMessage}</p>
          <p className="text-[11.5px] text-slate m-0 mt-2">
            Affects: {scopes.includes('all') ? MAINTENANCE_SCOPE_INFO.all.label : scopes.map(s => MAINTENANCE_SCOPE_INFO[s].label).join(', ')}
            {endsAt && ` · Back around ${new Date(endsAt).toLocaleString()}`}
          </p>
        </div>

        {(error || localError) && <p className="mt-3 text-[12px] text-error" role="alert">{error || localError}</p>}

        <div className="flex flex-wrap items-center gap-2 mt-4">
          {state === 'off' ? (
            <Button variant="danger" loading={submitting} icon={futureStart ? <CalendarClock size={14} /> : <Power size={14} />} onClick={() => (futureStart ? apply(true) : setConfirming(true))}>
              {futureStart ? 'Schedule maintenance' : 'Turn on now'}
            </Button>
          ) : (
            <>
              <Button variant="primary" loading={submitting} onClick={() => apply(true)}>Save changes</Button>
              <Button variant="outline" loading={submitting} onClick={() => apply(false)}>{state === 'scheduled' ? 'Cancel schedule' : 'Turn off — back online'}</Button>
            </>
          )}
          {state === 'live' && <span className="text-[11.5px] font-semibold text-error inline-flex items-center gap-1"><AlertTriangle size={12} /> Users are being blocked right now.</span>}
        </div>
      </div>

      {confirming && (
        <Modal mobileSheet title="Turn on maintenance now?" onClose={() => setConfirming(false)}
          footer={<><Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button><Button variant="danger" loading={submitting} onClick={() => apply(true)}>Turn on now</Button></>}>
          <p className="text-[13px] text-charcoal leading-[1.6] px-5 py-4 m-0">
            This immediately blocks <b>{scopes.includes('all') ? 'the whole platform' : scopes.map(s => MAINTENANCE_SCOPE_INFO[s].label.toLowerCase()).join(', ')}</b> for every buyer and seller.
            Admin tools and sign-in stay available. Prefer a heads-up first? Set a start time to schedule it instead.
          </p>
        </Modal>
      )}
    </>
  );
}