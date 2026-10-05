import { useEffect, useState } from 'react';
import { Button } from '@/components/comman/ui/Button';
import { Input } from '@/components/comman/ui/Input';
import { apiGetPublicPlatformConfig, type SocialNetwork } from '@/api/services/publicPlatformConfig';
import { apiUpdateSocialLinks } from '@/api/services/config/adminConfig';

const FIELDS: { key: SocialNetwork; label: string; placeholder: string }[] = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/edudeen' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/edudeen' },
  { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/edudeen' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/edudeen' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@edudeen' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@edudeen' },
];

/** Edudeen's social accounts — shown as icons in the site footer. Leave a field empty to hide that icon. */
export function SocialLinksCard() {
  const [links, setLinks] = useState<Partial<Record<SocialNetwork, string>>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGetPublicPlatformConfig()
      .then(res => setLinks(res.data?.socialLinks ?? {}))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = async () => {
    setError(''); setSaved(false);
    const bad = FIELDS.find(f => links[f.key] && !/^https?:\/\/\S+$/i.test(links[f.key]!.trim()));
    if (bad) { setError(`${bad.label}: enter a full link starting with https://`); return; }
    setBusy(true);
    try {
      await apiUpdateSocialLinks(Object.fromEntries(FIELDS.map(f => [f.key, (links[f.key] ?? '').trim()])));
      setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save social links.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
      <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] mb-1">Social links</p>
      <p className="text-[12.5px] text-slate mb-4">Shown as icons in the website footer. Empty fields are hidden.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
        {FIELDS.map(f => (
          <Input key={f.key} label={f.label} type="url" placeholder={f.placeholder} disabled={!loaded}
            value={links[f.key] ?? ''} onChange={e => { setSaved(false); setLinks(l => ({ ...l, [f.key]: e.target.value })); }} />
        ))}
      </div>
      {error && <p className="text-[12px] text-error mt-3" role="alert">{error}</p>}
      <div className="flex items-center gap-3 mt-4">
        <Button onClick={save} loading={busy} size="sm" disabled={!loaded}>Save social links</Button>
        {saved && <span className="text-[12px] text-success font-medium">Saved — live in the footer</span>}
      </div>
    </div>
  );
}
