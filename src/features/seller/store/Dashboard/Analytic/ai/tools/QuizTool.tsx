import { useState } from 'react';
import { ListChecks, Sparkles, Trash2, FileText } from 'lucide-react';
import { Field } from '@/components/comman/ui/Field';
import { Input, Textarea, Select } from '@/components/comman/ui/Input';
import { Button } from '@/components/comman/ui/Button';
import { Toggle } from '@/components/comman/ui/Toggle';
import { apiGenerateQuiz, aiErrorInfo, type SheetContent } from '@/api/services/aiFeatures';
import { ProductPicker } from '../components/ProductPicker';
import { SheetExportActions } from '../components/SheetExportActions';
import { costLabel } from '../components/costLabel';

interface QuizToolProps {
  storeId: string;
  onCreditsChanged: () => void;
  /** Live cost from credits.toolCosts (undefined while loading). */
  creditCost?: number;
}

const count = (v: string, max: number) => Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));

export function QuizTool({ storeId, onCreditsChanged, creditCost }: QuizToolProps) {
  const [sourceText, setSourceText] = useState('');
  const [productId, setProductId] = useState('');
  const [grade, setGrade] = useState('');
  const [language, setLanguage] = useState<'en' | 'ur'>('en');
  const [mcq, setMcq] = useState('5');
  const [trueFalse, setTrueFalse] = useState('3');
  const [short, setShort] = useState('2');
  const [includeAnswers, setIncludeAnswers] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<SheetContent | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

  const canGenerate = (sourceText.trim().length >= 40 || !!productId) && count(mcq, 15) + count(trueFalse, 10) + count(short, 10) > 0;

  async function generate() {
    setBusy(true); setError('');
    try {
      const res = await apiGenerateQuiz(storeId, {
        sourceText: sourceText.trim() || undefined, productId: productId || undefined, grade: grade.trim() || undefined, language,
        mcq: count(mcq, 15), trueFalse: count(trueFalse, 10), short: count(short, 10),
      });
      setQuiz(res.data.quiz); setGenerationId(res.data.generationId);
      onCreditsChanged();
    } catch (e) {
      const info = aiErrorInfo(e);
      setError(info.message);
    } finally { setBusy(false); }
  }

  const patch = (fn: (draft: SheetContent) => void) => setQuiz(prev => {
    if (!prev) return prev;
    const next: SheetContent = JSON.parse(JSON.stringify(prev));
    fn(next);
    return next;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
        <p className="text-sm font-bold text-charcoal mb-5 flex items-center gap-2"><ListChecks size={15} /> Quiz Generator — Input</p>
        <div className="flex flex-col gap-4">
          <Field label="Use a product description (optional)">
            <ProductPicker storeId={storeId} value={productId} onChange={setProductId} />
          </Field>
          <Field label="Or paste lesson text" hint="At least a few sentences. The quiz only uses this text.">
            <Textarea rows={6} value={sourceText} onChange={e => setSourceText(e.target.value)} maxLength={6000} placeholder="Paste the lesson, chapter summary or notes here" aria-label="Lesson text" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grade / level"><Input value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. Grade 5" maxLength={40} /></Field>
            <Field label="Quiz language">
              <Select value={language} onChange={e => setLanguage(e.target.value as 'en' | 'ur')} aria-label="Quiz language">
                <option value="en">English</option>
                <option value="ur">Urdu</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Multiple choice"><Input type="number" min={0} max={15} value={mcq} onChange={e => setMcq(e.target.value)} /></Field>
            <Field label="True / false"><Input type="number" min={0} max={10} value={trueFalse} onChange={e => setTrueFalse(e.target.value)} /></Field>
            <Field label="Short answer"><Input type="number" min={0} max={10} value={short} onChange={e => setShort(e.target.value)} /></Field>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-carbon">Include answer key when printing</p>
            <Toggle checked={includeAnswers} onChange={setIncludeAnswers} label="Include answer key when printing" />
          </div>
        </div>
        {error && <p role="alert" className="text-[12px] text-error mt-3 bg-error-bg rounded-md px-3 py-2">{error}</p>}
        <Button variant="primary" size="md" fullWidth loading={busy} disabled={!canGenerate} onClick={generate} icon={<Sparkles size={14} />} className="mt-5">
          Generate quiz{costLabel(creditCost)}
        </Button>
        <p className="text-[11px] text-slate mt-2">The quiz is a draft: review and edit it before using. Nothing is published automatically.</p>
      </div>

      <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
        <p className="text-sm font-bold text-charcoal mb-5 flex items-center gap-2"><Sparkles size={15} /> Quiz — Preview and edit</p>
        {!quiz && !busy && (
          <div className="flex flex-col items-center justify-center py-[60px] text-center">
            <FileText size={40} className="text-slate mb-3" />
            <p className="text-sm font-semibold text-charcoal mb-[6px]">Ready to generate</p>
            <p className="text-xs text-slate leading-[1.6]">Paste lesson text or pick a product to build a quiz.</p>
          </div>
        )}
        {quiz && (
          <div className="flex flex-col gap-4">
            <Field label="Title"><Input value={quiz.title} maxLength={120} onChange={e => patch(d => { d.title = e.target.value; })} /></Field>
            <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pe-1">
              {quiz.sections.map((s, si) => (
                <div key={si} className="bg-cream border border-bone rounded-lg px-3 py-3 flex flex-col gap-3">
                  {s.instructions && <p className="text-[12px] font-semibold text-charcoal">{s.instructions}</p>}
                  {s.questions.map((q, qi) => (
                    <div key={qi} className="bg-white border border-bone rounded-md p-2 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <Textarea rows={2} value={q.prompt} aria-label={`Question ${qi + 1} text`} onChange={e => patch(d => { d.sections[si].questions[qi].prompt = e.target.value; })} />
                        <button type="button" aria-label={`Remove question ${qi + 1}`} className="p-1 text-slate hover:text-error bg-transparent border-none cursor-pointer"
                          onClick={() => patch(d => { d.sections[si].questions.splice(qi, 1); d.sections = d.sections.filter(x => x.questions.length > 0); })}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {q.choices?.map((c, ci) => (
                        <Input key={ci} value={c} aria-label={`Question ${qi + 1} option ${String.fromCharCode(65 + ci)}`} onChange={e => patch(d => { d.sections[si].questions[qi].choices![ci] = e.target.value; })} />
                      ))}
                      <Input value={q.answer ?? ''} placeholder="Correct answer" aria-label={`Question ${qi + 1} correct answer`} onChange={e => patch(d => { d.sections[si].questions[qi].answer = e.target.value; })} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <SheetExportActions storeId={storeId} content={quiz} generationId={generationId} includeAnswers={includeAnswers} lang={language} />
            <Button variant="outline" size="md" loading={busy} onClick={generate}>Regenerate{costLabel(creditCost)}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
