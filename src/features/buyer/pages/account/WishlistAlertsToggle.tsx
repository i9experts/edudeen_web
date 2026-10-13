import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Toggle } from '@/components/comman/ui';
import { apiGetPreferences, apiUpdatePreferences } from '@/api/services/notifications';

// One switch for "tell me when a saved item drops in price or is back in stock".
// There is no second subscription: the retention cron (RetentionService.runWishlistAlerts)
// already watches every saved item and notifies unless the buyer muted the
// "promotions" notification category - this toggle is that same preference.
export function WishlistAlertsToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    apiGetPreferences()
      .then(res => { if (alive) setOn(res.data.prefs?.promotions !== false); })
      .catch(() => { if (alive) setError('Could not load your alert setting.'); });
    return () => { alive = false; };
  }, []);

  const change = async (next: boolean) => {
    const prev = on;
    setOn(next); setSaving(true); setError('');
    try {
      await apiUpdatePreferences({ promotions: next });
    } catch (err) {
      setOn(prev);
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-5 py-3 border-b border-bone flex items-center gap-3 flex-wrap">
      <Bell size={14} className="text-brand-orange shrink-0" aria-hidden />
      <div className="flex-1 min-w-[200px]">
        <p className="text-[13px] font-semibold text-charcoal">Tell me when the price drops / it is back in stock</p>
        <p className="text-[12px] text-slate">We notify you about saved items by email and in the app.</p>
        {error && <p className="text-[12px] text-error mt-1">{error}</p>}
      </div>
      <Toggle checked={on === true} onChange={change} disabled={on === null || saving} label="Tell me when the price drops or it is back in stock" />
    </div>
  );
}