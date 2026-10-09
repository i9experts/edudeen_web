import { useEffect, useState } from 'react';
import { Share2, Link2Off } from 'lucide-react';
import { Button } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { shareLink } from '@/utils/share';
import { apiCreateWishlistShare, apiGetMyWishlistShare, apiRevokeWishlistShare } from '@/api/services/retention';

/**
 * "Share" for the Saved page: creates (or reuses) one public read-only link and hands it to the phone's share sheet
 * ("send to Abba") or copies it. "Stop sharing" revokes the link so the old URL stops working.
 */
export function ShareSavedControl() {
  const toast = useToast();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { apiGetMyWishlistShare().then(r => setActive(!!r.data.active)).catch(() => {}); }, []);

  const share = async () => {
    setBusy(true);
    try {
      const res = await apiCreateWishlistShare();
      setActive(true);
      const url = res.data.url;
      if (!url) throw new Error('Could not create the link.');
      const r = await shareLink(url, 'My saved resources on Edudeen', 'Have a look at the learning resources I saved on Edudeen.');
      if (r === 'copied') toast.success('Link copied - paste it in WhatsApp or a message');
      else if (r === 'failed') toast.error('Could not share the link.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the link.');
    } finally { setBusy(false); }
  };

  const stop = async () => {
    setBusy(true);
    try { await apiRevokeWishlistShare(); setActive(false); toast.success('Sharing turned off - the old link no longer works'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not turn sharing off.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" icon={<Share2 size={13} />} onClick={share} loading={busy}>Share</Button>
      {active && <Button variant="ghost" size="sm" icon={<Link2Off size={13} />} onClick={stop} disabled={busy}>Stop sharing</Button>}
    </div>
  );
}
