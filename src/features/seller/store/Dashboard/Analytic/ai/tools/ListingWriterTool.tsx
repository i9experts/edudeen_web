import { useState } from 'react';
import { PenLine, Sparkles, Bot } from 'lucide-react';
import { Field } from '@/components/comman/ui/Field';
import { Textarea, Select } from '@/components/comman/ui/Input';
import { Button } from '@/components/comman/ui/Button';
import { useGenerateListing, useAcceptAiGeneration } from '@/hooks/seller/useAiStudio';
import { ProductPicker } from '../components/ProductPicker';
import { GenerationActions } from '../components/GenerationActions';
import type { AiTone } from '@/api/services/aiStudio';

const PRODUCT_TYPES = ['Educational Resource', 'Digital Download', 'Book', 'Online Course', 'School Supplies', 'Tutoring / Classes'];

interface ListingWriterToolProps {
  storeId: string;
  onCreditsChanged: () => void;
}

export function ListingWriterTool({ storeId, onCreditsChanged }: ListingWriterToolProps) {
  const [productId, setProductId] = useState('');
  const [productType, setProductType] = useState(PRODUCT_TYPES[0]);
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState<AiTone>('professional');
  const [accepted, setAccepted] = useState(false);

  const { generate, reset, generating, error, errorCode, result } = useGenerateListing();
  const { accept, submitting: accepting } = useAcceptAiGeneration();

  const handleGenerate = async (regenerateFromId?: string) => {
    setAccepted(false);
    await generate(storeId, {
      productType,
      keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      tone,
      productId: productId || undefined,
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
          <PenLine size={15} /> Listing Writer — Input
        </p>

        <div className="flex flex-col gap-4">
          <Field label="Apply to Product (optional)">
            <ProductPicker storeId={storeId} value={productId} onChange={setProductId} />
          </Field>

          <Field label="Product Type">
            <Select value={productType} onChange={e => setProductType(e.target.value)}>
              {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>

          <Field label="Product Keywords / Topic" hint="Comma-separated">
            <Textarea
              rows={4}
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="Grade 5 math, fractions, decimals, full year curriculum"
            />
          </Field>

          <Field label="Tone">
            <div className="flex gap-2">
              {(['professional', 'friendly', 'academic'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer capitalize transition-all duration-150 border"
                  style={{
                    borderColor: tone === t ? '#174771' : '#E8E6DC',
                    background: tone === t ? '#EAF2F8' : '#fff',
                    color: tone === t ? '#0F3354' : '#8C8A82',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
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
          disabled={!keywords.trim()}
          onClick={() => handleGenerate()}
          icon={<Sparkles size={14} />}
          className="mt-5"
        >
          Generate with AI (5 credits)
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
            <p className="text-xs text-slate leading-[1.6]">
              Fill in the inputs on the left and click<br />"Generate with AI" to see results here.
            </p>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Generated Title</p>
              <div className="bg-cream border border-bone rounded-lg px-[14px] py-3 text-[13px] font-semibold text-charcoal leading-[1.5]">
                {result.title}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Generated Description</p>
              <div className="bg-cream border border-bone rounded-lg px-[14px] py-3 text-xs text-graphite leading-[1.7]">
                {result.description}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Suggested Tags</p>
              <div className="flex flex-wrap gap-[6px]">
                {result.suggestedTags.map(tag => (
                  <span key={tag} className="px-[10px] py-[3px] bg-[#f0eee6] rounded-[5px] text-[11px] text-[#5a5852]">{tag}</span>
                ))}
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
            {accepted && (
              <Button variant="ghost" size="sm" onClick={() => { reset(); setAccepted(false); }}>Start New</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
