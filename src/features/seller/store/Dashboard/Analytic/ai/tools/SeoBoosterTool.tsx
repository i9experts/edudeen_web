import { useState } from 'react';
import { Search, Sparkles, Bot, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Field } from '@/components/comman/ui/Field';
import { Input, Textarea } from '@/components/comman/ui/Input';
import { Button } from '@/components/comman/ui/Button';
import { useGenerateSeoBooster, useAcceptAiGeneration } from '@/hooks/seller/useAiStudio';
import { ProductPicker } from '../components/ProductPicker';
import { GenerationActions } from '../components/GenerationActions';
import { costLabel } from '../components/costLabel';

interface SeoBoosterToolProps {
  storeId: string;
  onCreditsChanged: () => void;
  /** Live cost from credits.toolCosts (undefined while loading). */
  creditCost?: number;
}

export function SeoBoosterTool({ storeId, onCreditsChanged, creditCost }: SeoBoosterToolProps) {
  const [productId, setProductId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accepted, setAccepted] = useState(false);

  const { generate, reset, generating, error, errorCode, result } = useGenerateSeoBooster();
  const { accept, submitting: accepting } = useAcceptAiGeneration();

  const canGenerate = !!productId || !!title.trim();

  const handleGenerate = async (regenerateFromId?: string) => {
    setAccepted(false);
    await generate(storeId, {
      productId: productId || undefined,
      title: productId ? undefined : title,
      description: productId ? undefined : (description || undefined),
      regenerateFromId,
    });
    onCreditsChanged();
  };

  const handleUseThis = async () => {
    if (!result) return;
    const ok = await accept(storeId, result.generationId, { applyToProduct: !!productId, productId: productId || undefined });
    if (ok) setAccepted(true);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* LEFT: Input panel */}
      <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
        <p className="text-sm font-bold text-charcoal mb-5 flex items-center gap-2">
          <Search size={15} /> SEO Booster — Input
        </p>

        <div className="flex flex-col gap-4">
          <Field label="Product">
            <ProductPicker storeId={storeId} value={productId} onChange={setProductId} noneLabel="— Enter a title manually —" />
          </Field>

          {!productId && (
            <>
              <Field label="Title to Optimize">
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Current product or store title" />
              </Field>
              <Field label="Description (optional)">
                <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
              </Field>
            </>
          )}
        </div>

        {error && (
          <p className="text-[12px] text-error mt-3 bg-error-bg rounded-md px-3 py-2">
            {error}{errorCode === 'INSUFFICIENT_AI_CREDITS' ? ' — buy more credits above to continue.' : ''}
          </p>
        )}

        <Button
          variant="primary"
          size="md"
          fullWidth
          loading={generating}
          disabled={!canGenerate}
          onClick={() => handleGenerate()}
          icon={<Sparkles size={14} />}
          className="mt-5"
        >
          Generate with AI{costLabel(creditCost)}
        </Button>
      </div>

      {/* RIGHT: Output panel */}
      <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
        <p className="text-sm font-bold text-charcoal mb-5 flex items-center gap-2">
          <Sparkles size={15} /> AI Output — Preview
        </p>

        {!result && !generating && (
          <div className="flex flex-col items-center justify-center py-[60px] text-center">
            <Bot size={40} className="text-slate mb-3" />
            <p className="text-sm font-semibold text-charcoal mb-[6px]">Ready to generate</p>
            <p className="text-xs text-slate leading-[1.6]">Select a product or enter a title to optimize.</p>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            {result.lowConfidence && (
              <p className="text-[11px] text-warning bg-warning-bg rounded-md px-3 py-2 flex items-center gap-[6px]">
                <ShieldQuestion size={13} /> Keyword signals are low-confidence for this topic — treat tags as directional.
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
                {result.optimizedTags.map(t => (
                  <span key={t.tag} className="inline-flex items-center gap-1 px-[10px] py-[3px] bg-[#f0eee6] rounded-[5px] text-[11px] text-[#5a5852]">
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

            {accepted ? (
              <p className="text-[12px] text-success bg-success-bg rounded-md px-3 py-2">
                {productId ? 'Applied to the product.' : 'Marked as accepted.'}
              </p>
            ) : (
              <GenerationActions
                onUseThis={handleUseThis}
                onRegenerate={() => handleGenerate(result.generationId)}
                useThisLabel={productId ? 'Use This — Apply to Product' : 'Use This'}
                submitting={accepting}
                regenerating={generating}
              />
            )}
            {accepted && <Button variant="ghost" size="sm" onClick={() => { reset(); setAccepted(false); }}>Start New</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
