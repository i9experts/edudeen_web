import { useEffect, useState } from 'react';
import { Button } from '@/components/comman/ui/Button';
import { Input, Textarea } from '@/components/comman/ui/Input';
import { apiGetPublicPlatformConfig, type HomeContent, type AboutContent } from '@/api/services/publicPlatformConfig';
import { apiUpdateHomeContent } from '@/api/services/config/adminConfig';
import { apiUploadPublicFile } from '@/api/upload';
import { storeUrlProblem } from '@/utils/storeLinks';

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
  const about: AboutContent = c.about ?? {};
  const setAbout = (patch: Partial<AboutContent>) => { setSaved(false); setC(p => ({ ...p, about: { ...(p.about ?? {}), ...patch } })); };
  const pillars = about.pillars ?? [];
  const setPillar = (i: number, patch: { title?: string; desc?: string }) => { const t = [...pillars]; while (t.length <= i) t.push({ title: '', desc: '' }); t[i] = { ...t[i], ...patch }; setAbout({ pillars: t }); };
  const legal = c.legalPages ?? {};
  const setLegal = (key: string, patch: { text?: string; lastUpdated?: string }) => { setSaved(false); setC(p => ({ ...p, legalPages: { ...(p.legalPages ?? {}), [key]: { ...(p.legalPages?.[key] ?? {}), ...patch } } })); };
  const uploadHero = async (file?: File, key: 'heroImageUrl' | 'heroImageMobileUrl' = 'heroImageUrl') => {
    if (!file) return;
    setError(''); setUploading(true);
    try {
      const res = await apiUploadPublicFile(file);
      set(key, res.data.url);
      // Publish the picture right away (the PUT only touches the keys it is given) so it does not depend on
      // remembering to press 'Save homepage content' further down.
      await apiUpdateHomeContent({ [key]: res.data.url });
      setSaved(true);
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not upload the image.'); }
    finally { setUploading(false); }
  };
  const promise = (c.promiseItems ?? []).join('\n');
  const trust = c.trustItems ?? [];

  const thresholds = c.statsThresholds ?? { sellers: 50, buyers: 500, products: 100 };
  const setThreshold = (k: 'sellers' | 'buyers' | 'products', v: string) => set('statsThresholds', { ...thresholds, [k]: Math.max(0, Math.floor(Number(v) || 0)) });
  const ur = c.ur ?? {};
  const contact = c.contact ?? {};
  const setContact = (k: keyof NonNullable<HomeContent['contact']>, v: string) => set('contact', { ...contact, [k]: v });
  const setUr = (k: keyof NonNullable<HomeContent['ur']>, v: string) => set('ur', { ...ur, [k]: v });
  const googleProblem = storeUrlProblem(c.googlePlayUrl);
  const appStoreProblem = storeUrlProblem(c.appStoreUrl);

  const save = async () => {
    setError(''); setSaved(false);
    if (googleProblem || appStoreProblem) { setError(googleProblem || appStoreProblem); return; }
    setBusy(true);
    try {
      await apiUpdateHomeContent({
        ...c,
        legalPages: c.legalPages,
        about: c.about,
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
        <div>
          <Input label="Phone hero image link - small screens (optional, tall/square crop works best)" value={c.heroImageMobileUrl ?? ''} disabled={!loaded} onChange={e => set('heroImageMobileUrl', e.target.value)} />
          <label className="inline-block mt-2 text-[12px] font-semibold text-brand-orange cursor-pointer">
            {uploading ? 'Uploading...' : 'Or upload a phone image'}
            <input type="file" accept="image/*" className="hidden" disabled={!loaded || uploading} onChange={e => { void uploadHero(e.target.files?.[0], 'heroImageMobileUrl'); e.target.value = ''; }} />
          </label>
          <p className="text-[12px] text-slate mt-1">No image? The hero shows the Edudeen brand gradient and artwork. Recommended: 1600x900 desktop, 900x700 phone, keep the subject near the centre.</p>
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
        <Input label="App Store link (public link only - blank shows Coming soon)" value={c.appStoreUrl ?? ''} disabled={!loaded} error={appStoreProblem || undefined} onChange={e => set('appStoreUrl', e.target.value)} />
        <Input label="Google Play link (public link only - blank shows Coming soon)" value={c.googlePlayUrl ?? ''} disabled={!loaded} error={googleProblem || undefined} onChange={e => set('googlePlayUrl', e.target.value)} />
        <Input label="Block small heading" value={c.featureEyebrow ?? ''} disabled={!loaded} onChange={e => set('featureEyebrow', e.target.value)} />
        <Input label="Block heading" value={c.featureHeading ?? ''} disabled={!loaded} onChange={e => set('featureHeading', e.target.value)} />
        <Input label="Block link text" value={c.featureLinkLabel ?? ''} disabled={!loaded} onChange={e => set('featureLinkLabel', e.target.value)} />
      </div>
      <div className="mt-[14px]"><Textarea label="Block paragraph" rows={2} value={c.featureText ?? ''} disabled={!loaded} onChange={e => set('featureText', e.target.value)} /></div>
      <p className="text-[12px] font-semibold text-carbon mt-5 mb-1">Support contact (footer)</p>
      <p className="text-[12px] text-slate mb-2">Shown in the website footer and trust strip. A blank field is simply not shown.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
        <Input label="Support phone" value={contact.phone ?? ''} disabled={!loaded} maxLength={30} onChange={e => setContact('phone', e.target.value)} />
        <Input label="WhatsApp number (with country code)" value={contact.whatsapp ?? ''} disabled={!loaded} maxLength={30} onChange={e => setContact('whatsapp', e.target.value)} />
        <Input label="Support email" value={contact.email ?? ''} disabled={!loaded} maxLength={120} onChange={e => setContact('email', e.target.value)} />
        <Input label="Business address" value={contact.address ?? ''} disabled={!loaded} maxLength={300} onChange={e => setContact('address', e.target.value)} />
      </div>
      <p className="text-[12px] font-semibold text-carbon mt-5 mb-1">Homepage numbers (stats)</p>
      <p className="text-[12px] text-slate mb-2">The homepage only shows its numbers once ALL three totals are reached; below that it shows plain trust points (verified sellers, secure checkout, cash on delivery) instead.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px]">
        <Input label="Active sellers needed" type="number" min={0} value={String(thresholds.sellers)} disabled={!loaded} onChange={e => setThreshold('sellers', e.target.value)} />
        <Input label="Registered buyers needed" type="number" min={0} value={String(thresholds.buyers)} disabled={!loaded} onChange={e => setThreshold('buyers', e.target.value)} />
        <Input label="Resources listed needed" type="number" min={0} value={String(thresholds.products)} disabled={!loaded} onChange={e => setThreshold('products', e.target.value)} />
      </div>
      <p className="text-[12px] font-semibold text-carbon mt-5 mb-1">Urdu text (optional)</p>
      <p className="text-[12px] text-slate mb-2">Shown instead of the English text when a visitor uses the Urdu site. Leave blank to use the built-in Urdu / English.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]" dir="rtl">
        <Input label="Small heading" value={ur.heroEyebrow ?? ''} disabled={!loaded} onChange={e => setUr('heroEyebrow', e.target.value)} />
        <Input label="Headline" value={ur.heroTitle ?? ''} disabled={!loaded} onChange={e => setUr('heroTitle', e.target.value)} />
        <Input label="Headline (coloured second line)" value={ur.heroHighlight ?? ''} disabled={!loaded} onChange={e => setUr('heroHighlight', e.target.value)} />
        <Input label="Hero badge" value={ur.heroBadge ?? ''} disabled={!loaded} onChange={e => setUr('heroBadge', e.target.value)} />
        <Input label="Main button" value={ur.heroPrimaryLabel ?? ''} disabled={!loaded} onChange={e => setUr('heroPrimaryLabel', e.target.value)} />
        <Input label="Second button" value={ur.heroSecondaryLabel ?? ''} disabled={!loaded} onChange={e => setUr('heroSecondaryLabel', e.target.value)} />
        <Input label="Block small heading" value={ur.featureEyebrow ?? ''} disabled={!loaded} onChange={e => setUr('featureEyebrow', e.target.value)} />
        <Input label="Block heading" value={ur.featureHeading ?? ''} disabled={!loaded} onChange={e => setUr('featureHeading', e.target.value)} />
        <Input label="Block link text" value={ur.featureLinkLabel ?? ''} disabled={!loaded} onChange={e => setUr('featureLinkLabel', e.target.value)} />
      </div>
      <div className="mt-[14px]" dir="rtl"><Textarea label="Hero paragraph" rows={2} value={ur.heroText ?? ''} disabled={!loaded} onChange={e => setUr('heroText', e.target.value)} /></div>
      <div className="mt-[14px]" dir="rtl"><Textarea label="Block paragraph" rows={2} value={ur.featureText ?? ''} disabled={!loaded} onChange={e => setUr('featureText', e.target.value)} /></div>
      <p className="text-[12px] font-semibold text-carbon mt-5 mb-1">About page</p>
      <p className="text-[12px] text-slate mb-2">Leave a field blank to keep the built-in text.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
        <Input label="Small heading" value={about.eyebrow ?? ''} disabled={!loaded} onChange={e => setAbout({ eyebrow: e.target.value })} />
        <Input label="Main heading" value={about.heading ?? ''} disabled={!loaded} onChange={e => setAbout({ heading: e.target.value })} />
      </div>
      <div className="mt-[14px]"><Textarea label="Intro paragraph" rows={3} value={about.intro ?? ''} disabled={!loaded} onChange={e => setAbout({ intro: e.target.value })} /></div>
      <p className="text-[12px] font-medium text-charcoal mt-3 mb-2">Four highlight cards</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex flex-col gap-2">
            <Input label={`Card ${i + 1} title`} value={pillars[i]?.title ?? ''} disabled={!loaded} onChange={e => setPillar(i, { title: e.target.value })} />
            <Textarea label="Text" rows={2} value={pillars[i]?.desc ?? ''} disabled={!loaded} onChange={e => setPillar(i, { desc: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px] mt-3">
        <Input label="Section 2 small heading" value={about.approachEyebrow ?? ''} disabled={!loaded} onChange={e => setAbout({ approachEyebrow: e.target.value })} />
        <Input label="Section 2 heading" value={about.approachHeading ?? ''} disabled={!loaded} onChange={e => setAbout({ approachHeading: e.target.value })} />
      </div>
      <div className="mt-[10px]"><Textarea label="Section 2 text" rows={3} value={about.approachText ?? ''} disabled={!loaded} onChange={e => setAbout({ approachText: e.target.value })} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px] mt-3">
        <Input label="Section 3 small heading" value={about.headedEyebrow ?? ''} disabled={!loaded} onChange={e => setAbout({ headedEyebrow: e.target.value })} />
        <Input label="Section 3 heading" value={about.headedHeading ?? ''} disabled={!loaded} onChange={e => setAbout({ headedHeading: e.target.value })} />
      </div>
      <div className="mt-[10px]"><Textarea label="Section 3 text" rows={3} value={about.headedText ?? ''} disabled={!loaded} onChange={e => setAbout({ headedText: e.target.value })} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px] mt-3">
        <Input label="Bottom banner heading" value={about.ctaHeading ?? ''} disabled={!loaded} onChange={e => setAbout({ ctaHeading: e.target.value })} />
        <Input label="Bottom banner button" value={about.ctaButton ?? ''} disabled={!loaded} onChange={e => setAbout({ ctaButton: e.target.value })} />
      </div>      <p className="text-[12px] font-semibold text-carbon mt-5 mb-1">Legal pages</p>
      <p className="text-[12px] text-slate mb-2">Leave blank to keep the built-in text. Start a section with a line like "## Section title", separate paragraphs with a blank line.</p>
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
