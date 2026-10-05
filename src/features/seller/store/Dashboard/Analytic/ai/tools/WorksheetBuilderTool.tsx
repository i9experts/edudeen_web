import { useState } from 'react';
import { BookOpen, Sparkles, FileText } from 'lucide-react';
import { Field } from '@/components/comman/ui/Field';
import { Input } from '@/components/comman/ui/Input';
import { Toggle } from '@/components/comman/ui/Toggle';
import { Button } from '@/components/comman/ui/Button';
import { useGenerateWorksheet } from '@/hooks/seller/useAiStudio';
import { costLabel } from '../components/costLabel';

const GRADE_LEVELS = ['Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];

interface WorksheetBuilderToolProps {
  storeId: string;
  onCreditsChanged: () => void;
  /** Live cost from credits.toolCosts (undefined while loading). */
  creditCost?: number;
}

export function WorksheetBuilderTool({ storeId, onCreditsChanged, creditCost }: WorksheetBuilderToolProps) {
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState(GRADE_LEVELS[2]);
  const [topics, setTopics] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);

  const { generate, generating, error, errorCode, result } = useGenerateWorksheet();

  const canGenerate = subject.trim().length > 0 && topics.trim().length > 0;

  const handleGenerate = async (regenerateFromId?: string) => {
    await generate(storeId, {
      subject,
      gradeLevel,
      topics: topics.split(',').map(t => t.trim()).filter(Boolean),
      questionCount,
      includeAnswerKey,
      regenerateFromId,
    });
    onCreditsChanged();
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
        <p className="text-sm font-bold text-charcoal mb-5 flex items-center gap-2">
          <BookOpen size={15} /> Worksheet Builder — Input
        </p>

        <div className="flex flex-col gap-4">
          <Field label="Subject">
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Fractions, Algebra, Grammar…" />
          </Field>
          <Field label="Grade Level">
            <select
              value={gradeLevel}
              onChange={e => setGradeLevel(e.target.value)}
              className="w-full py-[9px] px-3 rounded-md border border-bone bg-white text-[13px] text-charcoal outline-none cursor-pointer focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
            >
              {GRADE_LEVELS.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Topics" hint="Comma-separated">
            <Input value={topics} onChange={e => setTopics(e.target.value)} placeholder="Fractions, Decimals, Word Problems" />
          </Field>
          <Field label="Number of Questions">
            <Input
              type="number"
              min={1}
              max={40}
              value={questionCount}
              onChange={e => setQuestionCount(Math.min(40, Math.max(1, Number(e.target.value) || 1)))}
            />
          </Field>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-carbon">Include Answer Key</p>
            <Toggle checked={includeAnswerKey} onChange={setIncludeAnswerKey} />
          </div>
        </div>

        {error && (
          <p className="text-[12px] text-error mt-3 bg-error-bg rounded-md px-3 py-2">
            {error}{errorCode === 'INSUFFICIENT_AI_CREDITS' ? ' — buy more credits above to continue.' : ''}
          </p>
        )}

        <Button variant="primary" size="md" fullWidth loading={generating} disabled={!canGenerate} onClick={() => handleGenerate()} icon={<Sparkles size={14} />} className="mt-5">
          Generate with AI{costLabel(creditCost)}
        </Button>
      </div>

      <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
        <p className="text-sm font-bold text-charcoal mb-5 flex items-center gap-2">
          <Sparkles size={15} /> AI Output — Preview
        </p>

        {!result && !generating && (
          <div className="flex flex-col items-center justify-center py-[60px] text-center">
            <FileText size={40} className="text-slate mb-3" />
            <p className="text-sm font-semibold text-charcoal mb-[6px]">Ready to generate</p>
            <p className="text-xs text-slate leading-[1.6]">Describe a subject and topics to build a worksheet.</p>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Worksheet Title</p>
              <div className="bg-cream border border-bone rounded-lg px-[14px] py-3 text-[13px] font-semibold text-charcoal leading-[1.5]">
                {result.title}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Sections ({result.sections.length})</p>
              <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto">
                {result.sections.map((section, i) => (
                  <div key={i} className="bg-cream border border-bone rounded-lg px-[14px] py-[10px]">
                    <p className="text-[12px] font-semibold text-charcoal">{section.heading}</p>
                    <p className="text-[11px] text-slate mt-[2px]">{section.items?.length ?? 0} item(s)</p>
                  </div>
                ))}
              </div>
            </div>
            <Button variant="primary" size="md" onClick={downloadJson}>Download Worksheet (JSON)</Button>
            <Button variant="outline" size="md" loading={generating} onClick={() => handleGenerate(result.generationId)}>Regenerate</Button>
          </div>
        )}
      </div>
    </div>
  );
}
