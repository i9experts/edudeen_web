import { Captions, Plus, Trash2, Upload } from 'lucide-react';
import { Textarea } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import type { LessonSubtitle } from '@/api/services/classroom';
import { SUBTITLE_LANGS, SUBTITLE_MAX_CHARS, describeSubtitle, normalizeSubtitle } from '@/utils/subtitles';

/**
 * Subtitles for a video or voice lesson: Urdu, English or both. The seller uploads an .srt / .vtt file
 * (or pastes the text); a file with timings plays in sync, plain text is shown as a transcript.
 */
export function LessonSubtitlesEditor({ subtitles, onChange, external }: {
  subtitles: LessonSubtitle[];
  onChange: (next: LessonSubtitle[]) => void;
  /** YouTube / Vimeo lessons cannot show timed captions inside their player, so they get a transcript. */
  external?: boolean;
}) {
  const toast = useToast();
  const byLang = (code: string) => subtitles.find(s => s.lang === code);
  const setContent = (lang: LessonSubtitle['lang'], content: string) =>
    onChange(subtitles.map(s => (s.lang === lang ? { lang, content } : s)));

  const readFile = async (lang: LessonSubtitle['lang'], file: File) => {
    if (!/\.(srt|vtt|txt)$/i.test(file.name)) { toast.error('Choose an .srt, .vtt or .txt file.'); return; }
    if (file.size > 1_000_000) { toast.error('That file is too large for subtitles.'); return; }
    const text = (await file.text()).replace(/^\uFEFF/, '');
    if (text.includes('�')) { toast.error('The file is not UTF-8, so Urdu / special letters would break. Re-save it as UTF-8 and try again.'); return; }
    if (!text.trim()) { toast.error('That file is empty.'); return; }
    const { content } = normalizeSubtitle(text);
    if (content.length > SUBTITLE_MAX_CHARS) { toast.error('These subtitles are too long. Split the lesson or shorten them.'); return; }
    const exists = !!byLang(lang);
    onChange(exists ? subtitles.map(s => (s.lang === lang ? { lang, content } : s)) : [...subtitles, { lang, content }]);
  };

  return (
    <div className="rounded-lg border border-bone bg-white p-3 flex flex-col gap-3">
      <div>
        <p className="m-0 flex items-center gap-1.5 text-[13px] font-bold text-carbon"><Captions size={15} className="text-brand-royal" /> Subtitles <span className="font-normal text-slate">(optional)</span></p>
        <p className="m-0 mt-0.5 text-[12px] text-slate">
          Write them in Urdu, English or both. Upload an .srt / .vtt file, or paste the text.
          {external ? ' Because this lesson plays from YouTube / Vimeo, students will read it as a transcript under the video.' : ' With timings, the words appear in sync with the lesson.'}
        </p>
      </div>

      {SUBTITLE_LANGS.map(({ code, label, dir }) => {
        const sub = byLang(code);
        if (!sub) {
          return (
            <div key={code} className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onChange([...subtitles, { lang: code, content: '' }])}
                className="inline-flex items-center gap-1 bg-transparent border border-dashed border-bone rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-brand-orange cursor-pointer hover:bg-cream">
                <Plus size={13} /> Add {code === 'ur' ? 'Urdu' : 'English'} subtitles
              </button>
            </div>
          );
        }
        return (
          <fieldset key={code} className="border border-bone rounded-lg p-3 flex flex-col gap-2 m-0">
            <legend className="px-1 text-[12px] font-semibold text-slate">{label}</legend>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-slate">{describeSubtitle(sub.content)}</span>
              <label className="ms-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-orange cursor-pointer">
                <Upload size={13} /> Upload .srt / .vtt
                <input type="file" accept=".srt,.vtt,.txt,text/vtt,text/plain" aria-label={`Upload ${label} subtitle file`} className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void readFile(code, f); }} />
              </label>
              <button type="button" aria-label={`Remove ${label} subtitles`} onClick={() => onChange(subtitles.filter(s => s.lang !== code))}
                className="bg-transparent border-none cursor-pointer text-slate hover:text-error p-1"><Trash2 size={13} /></button>
            </div>
            <Textarea
              aria-label={`${label} subtitles`} rows={5} dir={dir} lang={code} maxLength={SUBTITLE_MAX_CHARS}
              className={code === 'ur' ? 'font-urdu' : undefined}
              value={sub.content} onChange={e => setContent(code, e.target.value)}
              placeholder={code === 'ur' ? 'یہاں اردو سب ٹائٹل لکھیں یا فائل اپلوڈ کریں' : 'Type or paste the English subtitles here, or upload a file'}
            />
          </fieldset>
        );
      })}
    </div>
  );
}
