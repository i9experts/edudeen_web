import { useEffect, useState } from 'react';
import { Button } from '@/components/comman/ui/Button';
import { Input, Textarea } from '@/components/comman/ui/Input';
import { apiGetPublicPlatformConfig, type HomeContent } from '@/api/services/publicPlatformConfig';
import { apiUpdateHomeContent } from '@/api/services/config/adminConfig';
import { apiUploadPublicFile } from '@/api/upload';

/** Homepage copy the admin controls: hero text + image, the tick strip and the four trust items. Leave a field blank to use the built-in default. */
export function HomeContentCard() {
  const [c, setC] = useState<HomeContent>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiGetPublicPlatformConfig()
      .then(res => setC(res.data?.homeContent ?? {}))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const set = <K extends keyof HomeContent>(k: K, v: HomeContent[K]) => { setSaved(false); setC(p => ({ ...p, [k]: v })); };
  const legal = c.legalPages ?? {};
  const setLegal = (key: string, patch: { text?: string; lastUpdated?: string }) => { setSaved(false); setC(p => ({ ...p, legalPages: { ...(p.legalPages ?? {}), [key]: { ...(p.legalPages?.[key] ?? {}), ...patch } } })); };
  const uploadHero = async (file?: File) => {
    if (!file) return;
    setError(''); setUploading(true);
    try { const res = await apiUploadPublicFile(file); set('heroImageUrl', res.data.url); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not upload the image.'); }
    finally { setUploading(false); }
  };
  const promise = (c.promiseItems ?? []).join('\n');
  const trust = c.trustItems ?? [];

  const save = async () => {
    setError(''); setSaved(false); setBusy(true);
    try {
      await apiUpdateHomeContent({
        ...c,
        legalPages: c.legalPages,
        promiseItems: promise.split('\n').map(s => s.trim()).filter(Boolean),
        trustItems: trust.filter(t => t.label.trim()),
      });
      setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save homepage content.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
      <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] mb-1">Homepage content</p>
      <p className="text-[12.5px] text-slate mb-4">The hero, tick strip and trust items on the home page. Leave a field blank to use the default. Banners are managed in Admin → Banners.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
        <Input label="Small heading" value={c.heroEyebrow ?? ''} disabled={!loaded} onChange={e => set('heroEyebrow', e.target.value)} />
        <div>
          <Input label="Hero image link (https://…)" value={c.heroImageUrl ?? ''} disabled={!loaded} onChange={e => set('heroImageUrl', e.target.value)} />
          <label className="inline-block mt-2 text-[12px] font-semibold text-brand-orange cursor-pointer">
            {uploading ? 'Uploading…' : 'Or upload an image'}
            <input type="file" accept="image/*" className="hidden" disabled={!loaded || uploading} onChange={e => { void uploadHero(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>
        <Input label="Headline" value={c.heroTitle ?? ''} disabled={!loaded} onChange={e => set('heroTitle', e.target.value)} />
        <Input label="Headline (coloured second line)" value={c.heroHighlight ?? ''} disabled={!loaded} onChange={e => set('heroHighlight', e.target.value)} />
        <Input label="Main button" value={c.heroPrimaryLabel ?? ''} disabled={!loaded} onChange={e => set('heroPrimaryLabel', e.target.value)} />
        <Input label="Second button" value={c.heroSecondaryLabel ?? ''} disabled={!loaded} onChange={e => set('heroSecondaryLabel', e.target.value)} />
      </div>
      <div className="mt-[14px] flex flex-col gap-[14px]">
        <Textarea label="Hero paragraph" rows={2} value={c.heroText ?? ''} disabled={!loaded} onChange={e => set('heroText', e.target.value)} />
        <Input label="Badge on the hero image" value={c.heroBadge ?? ''} disabled={!loaded} onChange={e => set('heroBadge', e.target.value)} />
        <Textarea label="Tick strip (one per line, up to 6)" rows={3} value={promise} disabled={!loaded}
          onChange={e => set('promiseItems', e.target.value.split('\n'))} />
      </div>
      <p className="text-[12px] font-semibold text-carbon mt-4 mb-2">Trust items (up to 4)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <Input label={`Title ${i + 1}`} value={trust[i]?.label ?? ''} disabled={!loaded}
              onChange={e => { const t = [...trust]; while (t.length <= i) t.push({ label: '', sub: '' }); t[i] = { ...t[i], label: e.target.value }; set('trustItems', t); }} />
            <Input label="Subtitle" value={trust[i]?.sub ?? ''} disabled={!loaded}
              onChange={e => { const t = [...trust]; while (t.length <= i) t.push({ label: '', sub: '' }); t[i] = { ...t[i], sub: e.target.value }; set('trustItems', t); }} />
          </div>
        ))}
      </div>
      <p className="text-[12px] font-semibold text-carbon mt-5 mb-2">Feature block and app link</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
        <Input label="Category the buttons open (name)" value={c.featuredCategory ?? ''} disabled={!loaded} onChange={e => set('featuredCategory', e.target.value)} />
        <Input label="Google Play link" value={c.googlePlayUrl ?? ''} disabled={!loaded} onChange={e => set('googlePlayUrl', e.target.value)} />
        <Input label="Block small heading" value={c.featureEyebrow ?? ''} disabled={!loaded} onChange={e => set('featureEyebrow', e.target.value)} />
        <Input label="Block heading" value={c.featureHeading ?? ''} disabled={!loaded} onChange={e => set('featureHeading', e.target.value)} />
        <Input label="Block link text" value={c.featureLinkLabel ?? ''} disabled={!loaded} onChange={e => set('featureLinkLabel', e.target.value)} />
      </div>
      <div className="mt-[14px]"><Textarea label="Block paragraph" rows={2} value={c.featureText ?? ''} disabled={!loaded} onChange={e => set('featureText', e.target.value)} /></div>
      <p className="text-[12px] font-semibold text-carbon mt-5 mb-1">Legal pages</p>
      <p className="text-[11.5px] text-slate mb-2">Leave blank to keep the built-in text. Start a section with a line like "## Section title", separate paragraphs with a blank line.</p>
      {([['privacy-policy', 'Privacy Policy'], ['terms-of-service', 'Terms of Service'], ['cookie-policy', 'Cookie Policy']] as const).map(([key, label]) => (
        <div key={key} className="mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-[10px] items-end">
            <span className="text-[12px] font-medium text-charcoal">{label}</span>
            <Input label="Last updated" placeholder="October 7, 2026" value={legal[key]?.lastUpdated ?? ''} disabled={!loaded} onChange={e => setLegal(key, { lastUpdated: e.target.value })} />
          </div>
          <Textarea rows={5} value={legal[key]?.text ?? ''} disabled={!loaded} onChange={e => setLegal(key, { text: e.target.value })} />
        </div>
      ))}
      {error && <p className="text-[12px] text-error mt-3" role="alert">{error}</p>}
      <div className="flex items-center gap-3 mt-4">
        <Button onClick={save} loading={busy} size="sm" disabled={!loaded}>Save homepage content</Button>
        {saved && <span className="text-[12px] text-success font-medium">Saved — live on the homepage</span>}
      </div>
    </div>
  );
}
