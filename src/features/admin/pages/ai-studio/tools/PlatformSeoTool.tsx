import { useState } from 'react';
import { Search, Sparkles, Bot, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Field } from '@/components/comman/ui/Field';
import { Input, Textarea } from '@/components/comman/ui/Input';
import { Button } from '@/components/comman/ui/Button';
import { useGeneratePlatformSeo } from '@/hooks/admin/useAdminAiStudio';

export function PlatformSeoTool() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { generate, generating, error, result } = useGeneratePlatformSeo();

  const handleGenerate = async (regenerateFromId?: string) => {
    await generate({ title, description: description || undefined, regenerateFromId });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
        <p className="text-sm font-bold text-charcoal mb-5 flex items-center gap-2">
          <Search size={15} /> SEO Booster — Input
        </p>

        <div className="flex flex-col gap-4">
          <Field label="Title to Optimize">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Back to School Landing Page" />
          </Field>
          <Field label="Description (optional)">
            <Textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} />
          </Field>
        </div>

        {error && <p className="text-[12px] text-error mt-3 bg-error-bg rounded-md px-3 py-2">{error}</p>}

        <Button variant="primary" size="md" fullWidth loading={generating} disabled={!title.trim()} onClick={() => handleGenerate()} icon={<Sparkles size={14} />} className="mt-5">
          Generate
        </Button>
      </div>

      <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
        <p className="text-sm font-bold text-charcoal mb-5 flex items-center gap-2">
          <Sparkles size={15} /> AI Output — Preview
        </p>

        {!result && !generating && (
          <div className="flex flex-col items-center justify-center py-[60px] text-center">
            <Bot size={40} className="text-slate mb-3" />
            <p className="text-sm font-semibold text-charcoal mb-[6px]">Ready to generate</p>
            <p className="text-xs text-slate leading-[1.6]">Enter a title to optimize for platform content.</p>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            {result.lowConfidence && (
              <p className="text-[11px] text-warning bg-warning-bg rounded-md px-3 py-2 flex items-center gap-[6px]">
                <ShieldQuestion size={13} /> Keyword signals are low-confidence for this topic.
              </p>
            )}
            <div>
              <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Optimized Title</p>
              <div className="bg-cream border border-bone rounded-lg px-[14px] py-3 text-[13px] font-semibold text-charcoal leading-[1.5]">
                {result.optimizedTitle}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Optimized Tags</p>
              <div className="flex flex-wrap gap-[6px]">
                {(result.optimizedTags ?? []).map(t => (
                  <span key={t.tag} className="inline-flex items-center gap-1 px-[10px] py-[3px] bg-mist rounded-[5px] text-[11px] text-graphite">
                    {t.isVerifiedData ? <ShieldCheck size={10} className="text-success" /> : null}
                    {t.tag}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Ranking Notes</p>
              <div className="bg-cream border border-bone rounded-lg px-[14px] py-3 text-xs text-graphite leading-[1.7]">
                {result.rankingNotes}
              </div>
            </div>
            <Button variant="outline" size="md" loading={generating} onClick={() => handleGenerate(result.generationId)}>Regenerate</Button>
          </div>
        )}
      </div>
    </div>
  );
}
