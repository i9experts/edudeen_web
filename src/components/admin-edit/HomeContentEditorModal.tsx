import { useMemo, useState } from 'react';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { Input, Textarea } from '@/components/comman/ui/Input';
import type { AboutContent, HomeContent } from '@/api/services/publicPlatformConfig';
import { apiUpdateHomeContent } from '@/api/services/config/adminConfig';
import { apiUploadPublicFile } from '@/api/upload';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { useReauth } from '@/contexts/reauthCtx';
import { inlineEditConfig } from '@/api/services/reauth';

export type HomeSection = 'hero' | 'promise' | 'trust' | 'feature' | 'about' | 'legal';

const TITLES: Record<HomeSection, string> = {
  hero: 'Edit hero', promise: 'Edit tick strip', trust: 'Edit trust items', feature: 'Edit feature block', about: 'Edit About page', legal: 'Edit legal page',
};

type Pillar = { title: string; desc: string };

/** Edits ONE section of PlatformConfig.homeContent. The API merges per key, so only that section's keys are sent. */
export default function HomeContentEditorModal({ section, legalKey, legalInitialText, onClose }: {
  section: HomeSection;
  /** For 'legal': privacy-policy | terms-of-service | cookie-policy */
  legalKey?: string;
  /** For 'legal': the built-in text to start from when the admin has not written any yet. */
  legalInitialText?: string;
  onClose: () => void;
}) {
  const { config, refresh } = usePublicPlatformConfig();
  const { confirm } = useReauth();
  const hc: HomeContent = config?.homeContent ?? {};
  const [c, setC] = useState<HomeContent>(() => ({ ...hc }));
  const [about, setAbout] = useState<AboutContent>(() => ({ ...(hc.about ?? {}) }));
  const [legalText, setLegalText] = useState(() => (legalKey && hc.legalPages?.[legalKey]?.text) || legalInitialText || '');
  const [legalDate, setLegalDate] = useState(() => (legalKey && hc.legalPages?.[legalKey]?.lastUpdated) || '');
  const [promise, setPromise] = useState(() => (hc.promiseItems ?? []).join('\n'));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof HomeContent>(k: K, v: HomeContent[K]) => setC(p => ({ ...p, [k]: v }));
  const trust = c.trustItems ?? [];
  const pillars: Pillar[] = about.pillars ?? [];
  const setPillar = (i: number, patch: Partial<Pillar>) => { const t = [...pillars]; while (t.length <= i) t.push({ title: '', desc: '' }); t[i] = { ...t[i], ...patch }; setAbout(a => ({ ...a, pillars: t })); };
  const setTrust = (i: number, patch: { label?: string; sub?: string }) => { const t = [...trust]; while (t.length <= i) t.push({ label: '', sub: '' }); t[i] = { ...t[i], ...patch }; set('trustItems', t); };
  const A = (k: keyof AboutContent) => (about[k] as string | undefined) ?? '';
  const a = (k: keyof AboutContent) => (e: { target: { value: string } }) => setAbout(p => ({ ...p, [k]: e.target.value }));
  const H = (k: keyof HomeContent) => (c[k] as string | undefined) ?? '';
  const h = (k: keyof HomeContent) => (e: { target: { value: string } }) => set(k, e.target.value as never);

  const payload = useMemo((): HomeContent => {
    switch (section) {
      case 'hero': return { heroEyebrow: c.heroEyebrow ?? '', heroTitle: c.heroTitle ?? '', heroHighlight: c.heroHighlight ?? '', heroText: c.heroText ?? '', heroPrimaryLabel: c.heroPrimaryLabel ?? '', heroSecondaryLabel: c.heroSecondaryLabel ?? '', heroBadge: c.heroBadge ?? '', heroImageUrl: c.heroImageUrl ?? '' };
      case 'promise': return { promiseItems: promise.split('\n').map(s => s.trim()).filter(Boolean) };
      case 'trust': return { trustItems: trust.filter(t => t.label.trim()) };
      case 'feature': return { featureEyebrow: c.featureEyebrow ?? '', featureHeading: c.featureHeading ?? '', featureText: c.featureText ?? '', featureLinkLabel: c.featureLinkLabel ?? '' };
      case 'about': return { about: { ...about, pillars: pillars.slice(0, 4) } };
      case 'legal': return { legalPages: { [legalKey ?? '']: { text: legalText, lastUpdated: legalDate } } };
    }
  }, [section, c, promise, trust, about, pillars, legalKey, legalText, legalDate]);

  const uploadHero = async (file?: File) => {
    if (!file) return;
    setError(''); setUploading(true);
    try { set('heroImageUrl', (await apiUploadPublicFile(file)).data.url); } // only saved on Update
    catch (err) { setError(err instanceof Error ? err.message : 'Could not upload the image.'); }
    finally { setUploading(false); }
  };

  const update = async () => {
    setError('');
    const token = await confirm();
    if (!token) return; // not confirmed: nothing is changed
    setBusy(true);
    try {
      await apiUpdateHomeContent(payload, inlineEditConfig(token));
      refresh();
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save the change.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal mobileSheet width={620} title={TITLES[section]} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={update} loading={busy} disabled={uploading}>Update</Button></>}>
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-slate">Leave a field blank to use the built-in text. You will be asked for your password before it goes live.</p>
        {section === 'hero' && (<>
          <Input label="Small heading" value={H('heroEyebrow')} onChange={h('heroEyebrow')} maxLength={300} />
          <Input label="Headline" value={H('heroTitle')} onChange={h('heroTitle')} maxLength={300} />
          <Input label="Headline (coloured second line)" value={H('heroHighlight')} onChange={h('heroHighlight')} maxLength={300} />
          <Textarea label="Hero paragraph" rows={3} value={H('heroText')} onChange={h('heroText')} maxLength={300} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Main button" value={H('heroPrimaryLabel')} onChange={h('heroPrimaryLabel')} maxLength={300} />
            <Input label="Second button" value={H('heroSecondaryLabel')} onChange={h('heroSecondaryLabel')} maxLength={300} />
          </div>
          <Input label="Badge on the hero image" value={H('heroBadge')} onChange={h('heroBadge')} maxLength={300} />
          <div>
            <Input label="Hero image link (https://...)" value={H('heroImageUrl')} onChange={h('heroImageUrl')} maxLength={500} />
            <label className="inline-block mt-2 text-[12px] font-semibold text-brand-orange cursor-pointer">
              {uploading ? 'Uploading...' : 'Or upload an image'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => { void uploadHero(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div>
        </>)}
        {section === 'promise' && (
          <Textarea label="Tick strip (one per line, up to 6)" rows={5} value={promise} onChange={e => setPromise(e.target.value)} />
        )}
        {section === 'trust' && [0, 1, 2, 3].map(i => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input label={`Title ${i + 1}`} value={trust[i]?.label ?? ''} maxLength={60} onChange={e => setTrust(i, { label: e.target.value })} />
            <Input label="Subtitle" value={trust[i]?.sub ?? ''} maxLength={120} onChange={e => setTrust(i, { sub: e.target.value })} />
          </div>
        ))}
        {section === 'feature' && (<>
          <Input label="Small heading" value={H('featureEyebrow')} onChange={h('featureEyebrow')} maxLength={300} />
          <Input label="Heading" value={H('featureHeading')} onChange={h('featureHeading')} maxLength={300} />
          <Textarea label="Paragraph" rows={3} value={H('featureText')} onChange={h('featureText')} maxLength={300} />
          <Input label="Link text" value={H('featureLinkLabel')} onChange={h('featureLinkLabel')} maxLength={300} />
        </>)}
        {section === 'about' && (<>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Small heading" value={A('eyebrow')} onChange={a('eyebrow')} maxLength={200} />
            <Input label="Main heading" value={A('heading')} onChange={a('heading')} maxLength={200} />
          </div>
          <Textarea label="Intro paragraph" rows={3} value={A('intro')} onChange={a('intro')} maxLength={1200} />
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex flex-col gap-2">
              <Input label={`Card ${i + 1} title`} value={pillars[i]?.title ?? ''} maxLength={60} onChange={e => setPillar(i, { title: e.target.value })} />
              <Textarea label="Text" rows={2} value={pillars[i]?.desc ?? ''} maxLength={300} onChange={e => setPillar(i, { desc: e.target.value })} />
            </div>
          ))}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Section 2 small heading" value={A('approachEyebrow')} onChange={a('approachEyebrow')} maxLength={200} />
            <Input label="Section 2 heading" value={A('approachHeading')} onChange={a('approachHeading')} maxLength={200} />
          </div>
          <Textarea label="Section 2 text" rows={3} value={A('approachText')} onChange={a('approachText')} maxLength={1200} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Section 3 small heading" value={A('headedEyebrow')} onChange={a('headedEyebrow')} maxLength={200} />
            <Input label="Section 3 heading" value={A('headedHeading')} onChange={a('headedHeading')} maxLength={200} />
          </div>
          <Textarea label="Section 3 text" rows={3} value={A('headedText')} onChange={a('headedText')} maxLength={1200} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Bottom banner heading" value={A('ctaHeading')} onChange={a('ctaHeading')} maxLength={200} />
            <Input label="Bottom banner button" value={A('ctaButton')} onChange={a('ctaButton')} maxLength={200} />
          </div>
        </>)}
        {section === 'legal' && (<>
          <Input label="Last updated" placeholder="October 7, 2026" value={legalDate} maxLength={40} onChange={e => setLegalDate(e.target.value)} />
          <Textarea label={'Text (start a section with "## Title", blank line between paragraphs)'} rows={14} value={legalText} maxLength={40000} onChange={e => setLegalText(e.target.value)} />
        </>)}
        {error && <p className="text-[12px] text-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}