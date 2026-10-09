import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, Volume2, Square, PackagePlus } from 'lucide-react';
import { Button } from '@/components/comman/ui/Button';
import { apiSheetHtml, apiSaveSheetAsProduct, aiErrorInfo, type SheetContent } from '@/api/services/aiFeatures';
import { speak, speechSupported, stopSpeaking } from '@/hooks/useVoiceSearch';

const URDU = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/** Plain text read aloud by the browser (SpeechSynthesis): title, numbered questions and their options. */
export function sheetToSpeech(c: SheetContent): string {
  let n = 0;
  const parts: string[] = [c.title];
  for (const s of c.sections) {
    if (s.instructions) parts.push(s.instructions);
    for (const q of s.questions) {
      n++;
      parts.push(`Question ${n}. ${q.prompt}`);
      if (q.choices?.length) q.choices.forEach((ch, i) => parts.push(`${String.fromCharCode(65 + i)}. ${ch}`));
    }
  }
  return parts.join('. ');
}

interface Props {
  storeId: string;
  content: SheetContent;
  generationId?: string | null;
  includeAnswers: boolean;
  lang?: 'en' | 'ur';
}

/** Print / Listen / Save-as-draft-product for a generated worksheet or quiz. Nothing here calls the AI or charges credits. */
export function SheetExportActions({ storeId, content, generationId, includeAnswers, lang }: Props) {
  const [busy, setBusy] = useState<'print' | 'save' | null>(null);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [saved, setSaved] = useState<{ productId: string | null; name: string } | null>(null);
  const hasUrdu = URDU.test(JSON.stringify(content));
  const speechLang: 'en' | 'ur' = lang ?? (hasUrdu ? 'ur' : 'en');

  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => { setSaved(null); setError(''); }, [content]);

  async function print() {
    setBusy('print'); setError('');
    try {
      const res = await apiSheetHtml(storeId, content, includeAnswers);
      const w = window.open('', '_blank');
      if (!w) { setError('Allow pop-ups to open the printable page.'); return; }
      w.document.open(); w.document.write(res.data.html); w.document.close();
      w.focus(); setTimeout(() => w.print(), 400);
    } catch (e) { setError(aiErrorInfo(e).message); } finally { setBusy(null); }
  }

  async function save() {
    setBusy('save'); setError('');
    try {
      const res = await apiSaveSheetAsProduct(storeId, { generationId: generationId ?? undefined, content, includeAnswers });
      setSaved({ productId: res.data.productId, name: res.data.name });
    } catch (e) { setError(aiErrorInfo(e).message); } finally { setBusy(null); }
  }

  function toggleListen() {
    if (listening) { stopSpeaking(); setListening(false); return; }
    setListening(true);
    speak(sheetToSpeech(content), speechLang, () => setListening(false));
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="primary" size="md" loading={busy === 'print'} onClick={print} icon={<Printer size={14} />}>Print / Save as PDF</Button>
      {speechSupported() && (
        <Button variant="outline" size="md" onClick={toggleListen} icon={listening ? <Square size={14} /> : <Volume2 size={14} />} aria-label={listening ? 'Stop listening' : 'Listen to this in your browser'}>
          {listening ? 'Stop' : 'Listen'}
        </Button>
      )}
      <Button variant="outline" size="md" loading={busy === 'save'} disabled={hasUrdu || !!saved} onClick={save} icon={<PackagePlus size={14} />}>
        Save as digital product (draft)
      </Button>
      {hasUrdu && <p className="text-[11px] text-slate">PDF export supports English only. For Urdu, use Print / Save as PDF above.</p>}
      {saved && (
        <p role="status" className="text-[12px] text-success bg-success-bg rounded-md px-3 py-2">
          Saved as a draft (price 0). {saved.productId
            ? <Link className="underline font-semibold" to={`/store/${storeId}/products/edit/${saved.productId}`}>Review and publish it</Link>
            : 'Find it in your products.'}
        </p>
      )}
      {error && <p role="alert" className="text-[11px] text-error">{error}</p>}
    </div>
  );
}
