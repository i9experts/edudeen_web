import { useEffect, useState } from 'react';
import { Video, Loader2, PlayCircle, Ban, Clock } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { apiGetLiveAccess } from '@/api/services/classroom';
import { formatLocalWithZone, formatPkt } from '@/utils/pkTime';
import { safeHttpUrl } from '@/utils/safeRedirect';

const JOIN_OPENS_MS = 30 * 60000;

/**
 * Buyer-only joining control. The meeting link is fetched on click (never in a page payload).
 * The button shows only inside the join window (30 min before start until the class ends);
 * a cancelled class shows a notice and a finished one shows the replay link when the seller added it.
 */
export function JoinLiveClassButton({ productId, startsAt, endsAt, status }: {
  productId: string; startsAt?: string | null; endsAt?: string | null; status?: 'upcoming' | 'completed' | 'cancelled';
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(status === 'cancelled');
  const [now, setNow] = useState(() => Date.now());
  const start = startsAt ? new Date(startsAt).getTime() : null;
  const end = endsAt ? new Date(endsAt).getTime() : start ? start + 60 * 60000 : null;
  const finished = status === 'completed' || (end !== null && now > end);

  // Re-evaluate the window while the page is open.
  useEffect(() => {
    if (!start) return;
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, [start]);

  // After the class, ask once for the replay link.
  useEffect(() => {
    if (!finished || cancelled) return;
    let alive = true;
    apiGetLiveAccess(productId).then(res => {
      if (!alive) return;
      if (res.data.status === 'cancelled') setCancelled(true);
      else setRecording(safeHttpUrl(res.data.recordingUrl ?? '') || null);
    }).catch(() => {});
    return () => { alive = false; };
  }, [finished, cancelled, productId]);

  const join = async () => {
    setBusy(true);
    // Open the tab first (popup blockers allow it only on the click itself).
    const tab = window.open('', '_blank');
    try {
      const res = await apiGetLiveAccess(productId);
      if (res.data.status === 'cancelled') { tab?.close(); setCancelled(true); toast.error('This class was cancelled.'); return; }
      if (res.data.ended) { tab?.close(); toast.error('This class has ended.'); return; }
      if (!res.data.meetingUrl) {
        tab?.close();
        const opens = res.data.opensAt ? formatLocalWithZone(res.data.opensAt) : 'shortly before the class';
        toast.error(`The class link opens 30 minutes before the start (${opens}). We will remind you.`);
        return;
      }
      const url = safeHttpUrl(res.data.meetingUrl);
      if (!url) { tab?.close(); toast.error('The class link looks invalid. Please contact the seller.'); return; }
      if (tab) tab.location.href = url; else window.location.href = url;
    } catch (err) {
      tab?.close();
      toast.error(err instanceof Error ? err.message : 'Could not open the class link.');
    } finally { setBusy(false); }
  };

  const time = startsAt ? `${formatLocalWithZone(startsAt)} · ${formatPkt(startsAt)}` : '';

  if (cancelled) {
    return (
      <div className="flex flex-col items-start gap-1 min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 text-error px-3 py-[7px] text-[12.5px] font-bold"><Ban size={13} /> Class cancelled</span>
        <span className="text-[12px] text-slate">The seller cancelled this class. Contact Edudeen support about a refund.</span>
      </div>
    );
  }
  if (finished) {
    return (
      <div className="flex flex-col items-start gap-1 min-w-0">
        {recording ? (
          <a href={recording} target="_blank" rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-royal text-white px-3 py-[7px] text-[12.5px] font-bold no-underline"><PlayCircle size={13} /> Watch recording</a>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-fog text-slate px-3 py-[7px] text-[12.5px] font-semibold">Class completed</span>
        )}
        {time && <span className="text-[12px] text-slate">{time}</span>}
      </div>
    );
  }
  const open = start === null || now >= start - JOIN_OPENS_MS;
  return (
    <div className="flex flex-col items-start gap-1 min-w-0">
      {open ? (
        <button type="button" onClick={join} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-royal text-white px-3 py-[7px] text-[12.5px] font-bold border-none cursor-pointer disabled:opacity-60">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />} Join live class
        </button>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-fog text-slate px-3 py-[7px] text-[12.5px] font-semibold"><Clock size={13} /> Join opens 30 min before</span>
      )}
      {time && <span className="text-[12px] text-slate">{time}</span>}
    </div>
  );
}
