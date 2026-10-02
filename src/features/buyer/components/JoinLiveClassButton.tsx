import { useState } from 'react';
import { Video, Loader2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { apiGetLiveAccess } from '@/api/services/classroom';

/**
 * Fetches the buyer-only meeting link on click (it's never in a page payload)
 * and opens it. Before the class it also shows when it starts.
 */
export function JoinLiveClassButton({ productId, startsAt }: { productId: string; startsAt?: string | null }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const start = startsAt ? new Date(startsAt) : null;

  const join = async () => {
    setBusy(true);
    // Open the tab first (popup blockers allow it only on the click itself).
    const tab = window.open('', '_blank');
    try {
      const res = await apiGetLiveAccess(productId);
      if (res.data.ended) { tab?.close(); toast.error('This class has ended.'); return; }
      if (tab) tab.location.href = res.data.meetingUrl; else window.location.href = res.data.meetingUrl;
    } catch (err) {
      tab?.close();
      toast.error(err instanceof Error ? err.message : 'Could not open the class link.');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={join} disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-royal text-white px-3 py-[7px] text-[12.5px] font-bold border-none cursor-pointer disabled:opacity-60">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />} Join live class
      </button>
      {start && <span className="text-[11px] text-slate">{start.toLocaleString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>}
    </div>
  );
}
