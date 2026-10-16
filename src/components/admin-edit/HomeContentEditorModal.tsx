import { useMemo, useState } from 'react';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { Input, Textarea } from '@/components/comman/ui/Input';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { effectiveAbout, effectiveHomeContent } from './homeDefaults';
import { storeUrlProblem } from '@/utils/storeLinks';
import type { AboutContent, HomeContent } from '@/api/services/publicPlatformConfig';
import { apiUpdateHomeContent } from '@/api/services/config/adminConfig';
import { apiUploadPublicFile } from '@/api/upload';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { useReauth } from '@/contexts/reauthCtx';
import { inlineEditConfig } from '@/api/services/reauth';

export type HomeSection = 'hero' | 'promise' | 'trust' | 'feature' | 'about' | 'legal' | 'apps' | 'creator';

const TITLES: Record<HomeSection, string> = {
  hero: 'Edit hero', promise: 'Edit tick strip', trust: 'Edit trust items', feature: 'Edit feature block', about: 'Edit About page', legal: 'Edit legal page', apps: 'Edit app download links', creator: 'Edit seller invitation block',
};

type Pillar = { title: string; desc: string };

type EditorProps = {
  section: HomeSection;
  /** For 'legal': privacy-policy | terms-of-service | cookie-policy */
  legalKey?: string;
  /** For 'legal': the built-in text to start from when the admin has not written any yet. */
  legalInitialText?: string;
  /** What the page currently shows (stored value, else built-in default) - the form starts from this. */
  defaults?: EffectiveHome;
  onClose: () => void;
};
type EffectiveHome = ReturnType<typeof effectiveHomeContent>;

/**
 * Edits ONE section of PlatformConfig.homeContent. Opens pre-filled with what the page shows right now;
 * the current config is loaded first, so a form can never open empty and overwrite real data.
 * The API merges per key, and only the keys the admin actually changed are sent.
 */
export default function HomeContentEditorModal(props: EditorProps) {
  const { config, loading } = usePublicPlatformConfig();
  if (config) return <HomeContentForm {...props} stored={config.homeContent ?? {}} />;
  return (
    <Modal mobileSheet width={620} title={TITLES[props.section]} onClose={props.onClose}
      footer={<Button variant="ghost" onClick={props.onClose}>Close</Button>}>
      {loading
        ? <div className="flex flex-col gap-3"><SkeletonBox className="h-[44px] w-full" /><SkeletonBox className="h-[44px] w-full" /><SkeletonBox className="h-[88px] w-full" /></div>
        : <p className="text-[13px] text-error" role="alert">Could not load the current content, so editing is disabled to avoid overwriting it. Close this and try again.</p>}
    </Modal>
  );
}

function HomeContentForm({ section, legalKey, legalInitialText, defaults, stored, onClose }: EditorProps & { stored: HomeContent }) {
  const { refresh } = usePublicPlatformConfig();
  const { confirm } = useReauth();
  const hc = stored;
  // Starting values = exactly what the page shows now.
  const init = useMemo<EffectiveHome>(() => defaults ?? effectiveHomeContent(hc), [defaults, hc]);
  const initAbout = useMemo(() => effectiveAbout(hc.about), [hc.about]);
  const [c, setC] = useState<HomeContent>(() => ({ ...init }));
  const [about, setAbout] = useState<AboutContent>(() => ({ ...initAbout }));
  const [legalText, setLegalText] = useState(() => (legalKey && hc.legalPages?.[legalKey]?.text) || legalInitialText || '');
  const [legalDate, setLegalDate] = useState(() => (legalKey && hc.legalPages?.[legalKey]?.lastUpdated) || '');
  const [promise, setPromise] = useState(() => init.promiseItems.join('\n'));
  const [urState, setUrState] = useState<NonNullable<HomeContent['ur']>>(() => ({ ...(hc.ur ?? {}) }));
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

  /** Only the text keys the admin actually changed (an untouched field is never sent, so it cannot be wiped). */
  const pick = (keys: (keyof EffectiveHome & keyof HomeContent)[], norm: (s: string) => string = s => s): HomeContent => {
    const out: Record<string, string> = {};
    for (const k of keys) {
      const now = norm(String(c[k] ?? '')); const was = String(init[k] ?? '');
      if (now !== was) out[k] = now;
    }
    return out as HomeContent;
  };

  /** Optional Urdu version of the text keys of this section; the API replaces the whole `ur` map, so the merged map is sent. */
  const urKeys: (keyof NonNullable<HomeContent['ur']>)[] =
    section === 'hero' ? ['heroEyebrow', 'heroTitle', 'heroHighlight', 'heroText', 'heroPrimaryLabel', 'heroSecondaryLabel', 'heroBadge']
    : section === 'feature' ? ['featureEyebrow', 'featureHeading', 'featureText', 'featureLinkLabel']
    : section === 'creator' ? ['creatorEyebrow', 'creatorHeading', 'creatorText', 'creatorLinkLabel'] : [];
  const urChanged = urKeys.some(k => (urState[k] ?? '').trim() !== (hc.ur?.[k] ?? ''));
  // Called as a plain function (not a component) so typing never remounts the input.
  const UrField = ({ k, label, area }: { k: keyof NonNullable<HomeContent['ur']>; label: string; area?: boolean }) => (
    area
      ? <Textarea label={label} rows={2} dir="rtl" value={urState[k] ?? ''} onChange={e => setUrState(p => ({ ...p, [k]: e.target.value }))} maxLength={300} />
      : <Input label={label} dir="rtl" value={urState[k] ?? ''} onChange={e => setUrState(p => ({ ...p, [k]: e.target.value }))} maxLength={300} />
  );

  const textPayload = useMemo((): HomeContent => {
    switch (section) {
      case 'hero': return pick(['heroEyebrow', 'heroTitle', 'heroHighlight', 'heroText', 'heroPrimaryLabel', 'heroSecondaryLabel', 'heroBadge', 'heroImageUrl']);
      case 'promise': {
        const items = promise.split('\n').map(s => s.trim()).filter(Boolean);
        return JSON.stringify(items) === JSON.stringify(init.promiseItems) ? {} : { promiseItems: items };
      }
      case 'trust': {
        const items = trust.filter(t => t.label.trim());
        return JSON.stringify(items) === JSON.stringify(init.trustItems) ? {} : { trustItems: items };
      }
      case 'feature': return pick(['featureEyebrow', 'featureHeading', 'featureText', 'featureLinkLabel', 'featuredCategory']);
      case 'apps': return pick(['googlePlayUrl', 'appStoreUrl'], s => s.trim());
      case 'creator': return pick(['creatorEyebrow', 'creatorHeading', 'creatorText', 'creatorLinkLabel']);
      case 'about': {
        const next = { ...about, pillars: pillars.slice(0, 4) };
        return JSON.stringify(next) === JSON.stringify({ ...initAbout, pillars: initAbout.pillars.slice(0, 4) }) ? {} : { about: next };
      }
      case 'legal': return { legalPages: { [legalKey ?? '']: { text: legalText, lastUpdated: legalDate } } };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, c, promise, trust, about, pillars, legalKey, legalText, legalDate, init, initAbout]);
  const payload = useMemo((): HomeContent => {
    if (!urChanged) return textPayload;
    const merged = { ...(hc.ur ?? {}) } as Record<string, string>;
    for (const k of urKeys) { const v = (urState[k] ?? '').trim(); if (v) merged[k] = v; else delete merged[k]; }
    return { ...textPayload, ur: merged };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textPayload, urChanged, urState]);

  const uploadHero = async (file?: File) => {
    if (!file) return;
    setError(''); setUploading(true);
    try { set('heroImageUrl', (await apiUploadPublicFile(file)).data.url); } // only saved on Update
    catch (err) { setError(err instanceof Error ? err.message : 'Could not upload the image.'); }
    finally { setUploading(false); }
  };

  const update = async () => {
    setError('');
    if (section === 'apps') {
      const bad = (['googlePlayUrl', 'appStoreUrl'] as const).find(k => payload[k] && storeUrlProblem(payload[k]));
      if (bad) { setError(`${bad === 'googlePlayUrl' ? 'Google Play' : 'App Store'}: ${storeUrlProblem(payload[bad])}`); return; }
    }
    if (Object.keys(payload).length === 0) { onClose(); return; } // nothing changed
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
        <p className="text-[12px] text-slate">This is what the page shows now - change only what you want. Clearing a field brings back the built-in text. You will be asked for your password before it goes live.</p>
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
          <details className="rounded-lg border border-bone px-3 py-2">
            <summary className="cursor-pointer text-[12.5px] font-semibold text-carbon">Urdu version (optional)</summary>
            <div className="flex flex-col gap-3 mt-3">
              {UrField({ k: 'heroEyebrow', label: 'Small heading' })}{UrField({ k: 'heroTitle', label: 'Headline' })}{UrField({ k: 'heroHighlight', label: 'Headline (coloured second line)' })}
              {UrField({ k: 'heroText', label: 'Hero paragraph', area: true })}{UrField({ k: 'heroPrimaryLabel', label: 'Main button' })}{UrField({ k: 'heroSecondaryLabel', label: 'Second button' })}{UrField({ k: 'heroBadge', label: 'Badge' })}
            </div>
          </details>
          <div>
            <Input label="Hero image link (https://...) - empty = the built-in picture shown now" value={H('heroImageUrl')} onChange={h('heroImageUrl')} maxLength={500} />
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
          <Input label="Category this block and the hero's second button open (name)" value={H('featuredCategory')} onChange={h('featuredCategory')} maxLength={300} />
          <details className="rounded-lg border border-bone px-3 py-2">
            <summary className="cursor-pointer text-[12.5px] font-semibold text-carbon">Urdu version (optional)</summary>
            <div className="flex flex-col gap-3 mt-3">
              {UrField({ k: 'featureEyebrow', label: 'Small heading' })}{UrField({ k: 'featureHeading', label: 'Heading' })}{UrField({ k: 'featureText', label: 'Paragraph', area: true })}{UrField({ k: 'featureLinkLabel', label: 'Link text' })}
            </div>
          </details>
        </>)}
        {section === 'apps' && (<>
          <Input label="Google Play link (public https:// link; blank = Coming soon)" value={H('googlePlayUrl')} onChange={h('googlePlayUrl')} maxLength={500} />
          <Input label="App Store link (public https:// link; blank = Coming soon)" value={H('appStoreUrl')} onChange={h('appStoreUrl')} maxLength={500} />
        </>)}
        {section === 'creator' && (<>
          <Input label="Small heading" value={H('creatorEyebrow')} onChange={h('creatorEyebrow')} maxLength={300} />
          <Input label="Heading" value={H('creatorHeading')} onChange={h('creatorHeading')} maxLength={300} />
          <Textarea label="Paragraph" rows={3} value={H('creatorText')} onChange={h('creatorText')} maxLength={300} />
          <Input label="Link text" value={H('creatorLinkLabel')} onChange={h('creatorLinkLabel')} maxLength={300} />
          <details className="rounded-lg border border-bone px-3 py-2">
            <summary className="cursor-pointer text-[12.5px] font-semibold text-carbon">Urdu version (optional)</summary>
            <div className="flex flex-col gap-3 mt-3">
              {UrField({ k: 'creatorEyebrow', label: 'Small heading' })}{UrField({ k: 'creatorHeading', label: 'Heading' })}{UrField({ k: 'creatorText', label: 'Paragraph', area: true })}{UrField({ k: 'creatorLinkLabel', label: 'Link text' })}
            </div>
          </details>
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