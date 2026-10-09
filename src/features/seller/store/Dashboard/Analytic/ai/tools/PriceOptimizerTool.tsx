import { useState } from 'react';
import { TrendingUp, Sparkles, ShieldQuestion } from 'lucide-react';
import { Field } from '@/components/comman/ui/Field';
import { Input } from '@/components/comman/ui/Input';
import { Button } from '@/components/comman/ui/Button';
import { useGeneratePriceOptimization, useAcceptAiGeneration } from '@/hooks/seller/useAiStudio';
import { ProductPicker } from '../components/ProductPicker';
import { costLabel } from '../components/costLabel';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { currencySymbol } from '@/utils/currency';

interface PriceOptimizerToolProps {
  storeId: string;
  onCreditsChanged: () => void;
  /** Live cost from credits.toolCosts (undefined while loading). */
  creditCost?: number;
}

export function PriceOptimizerTool({ storeId, onCreditsChanged, creditCost }: PriceOptimizerToolProps) {
  const { store } = useStoreWorkspace();
  const sym = currencySymbol(store?.baseCurrency);
  const [productId, setProductId] = useState('');
  const [attributes, setAttributes] = useState('');

  const { generate, generating, error, errorCode, result } = useGeneratePriceOptimization();

  const { accept, submitting: applying, error: applyError } = useAcceptAiGeneration();
  const [applied, setApplied] = useState(false);
  // One click writes the suggested price to the product (single-variant products). The seller can still edit it afterwards.
  const applyPrice = async () => {
    if (!result) return;
    if (await accept(storeId, result.generationId, { applyToProduct: true, productId })) setApplied(true);
  };

  const handleGenerate = async (regenerateFromId?: string) => {
    setApplied(false);
    await generate(storeId, { productId: productId || undefined, attributes: attributes || undefined, regenerateFromId });
    onCreditsChanged();
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
        <p className="text-sm font-bold text-charcoal mb-5 flex items-center gap-2">
          <TrendingUp size={15} /> Price Optimizer — Input
        </p>

        <div className="flex flex-col gap-4">
          <Field label="Product">
            <ProductPicker storeId={storeId} value={productId} onChange={setProductId} noneLabel="— Select a product —" />
          </Field>
          <Field label="Additional Attributes (optional)">
            <Input value={attributes} onChange={e => setAttributes(e.target.value)} placeholder="e.g. premium finish, limited edition" />
          </Field>

          <div className="bg-brand-pale-orange rounded-lg p-3 text-xs text-brand-deep-orange">
            <p className="font-semibold mb-[6px] flex items-center gap-1"><TrendingUp size={13} /> AI will analyze:</p>
            <ul className="pl-4 text-[#8c6050] text-[11px] leading-loose list-disc">
              <li>Comparable active listings in your category</li>
              <li>Median, 25th and 75th percentile pricing</li>
              <li>Optional external market signal (if enabled)</li>
            </ul>
          </div>
        </div>

        {error && (
          <p className="text-[12px] text-error mt-3 bg-error-bg rounded-md px-3 py-2">
            {error}{errorCode === 'INSUFFICIENT_AI_CREDITS' ? ' — buy more credits above to continue.' : ''}
          </p>
        )}

        <Button variant="primary" size="md" fullWidth loading={generating} disabled={!productId} onClick={() => handleGenerate()} icon={<Sparkles size={14} />} className="mt-5">
          Generate with AI{costLabel(creditCost)}
        </Button>
      </div>

      <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
        <p className="text-sm font-bold text-charcoal mb-5 flex items-center gap-2">
          <Sparkles size={15} /> AI Output — Preview
        </p>

        {!result && !generating && (
          <div className="flex flex-col items-center justify-center py-[60px] text-center">
            <TrendingUp size={40} className="text-slate mb-3" />
            <p className="text-sm font-semibold text-charcoal mb-[6px]">Ready to generate</p>
            <p className="text-xs text-slate leading-[1.6]">Select a product to get a data-backed price suggestion.</p>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            {result.suggestedPrice == null ? (
              <div className="flex flex-col items-center text-center py-6">
                <ShieldQuestion size={32} className="text-warning mb-3" />
                <p className="text-sm font-semibold text-charcoal mb-2">Not enough comparable data</p>
                <p className="text-xs text-slate leading-[1.6]">{result.explanation}</p>
              </div>
            ) : (
              <>
                <div className="text-center py-3">
                  <TrendingUp size={36} className="text-brand-orange mx-auto mb-2" />
                  <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-1">Suggested Price</p>
                  <p className="text-[40px] font-bold text-brand-orange leading-none">{sym}{result.suggestedPrice.toFixed(2)}</p>
                  <p className="text-xs text-slate mt-1">
                    Range: {sym}{result.suggestedPriceMin?.toFixed(2)} – {sym}{result.suggestedPriceMax?.toFixed(2)}
                  </p>
                </div>

                {result.lowConfidence && (
                  <p className="text-[11px] text-warning bg-warning-bg rounded-md px-3 py-2 flex items-center gap-[6px]">
                    <ShieldQuestion size={13} /> Based on a small sample ({result.comparableListingsSampleSize} comparable listings) — treat as directional.
                  </p>
                )}

                <div>
                  <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Explanation</p>
                  <div className="bg-cream border border-bone rounded-lg px-[14px] py-3 text-xs text-graphite leading-[1.7]">
                    {result.explanation}
                  </div>
                </div>

                {result.externalMarketNote && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">External Market Note</p>
                    <div className="bg-cream border border-bone rounded-lg px-[14px] py-3 text-xs text-graphite leading-[1.7]">
                      {result.externalMarketNote}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate">Based on {result.comparableListingsSampleSize} comparable listing(s) in this category.</p>
              </>
            )}

            {result.suggestedPrice != null && (
              <>
                <Button variant="primary" size="md" loading={applying} disabled={applied || !productId} onClick={applyPrice}>
                  {applied ? 'Price applied' : `Use this price (${sym}${result.suggestedPrice.toFixed(2)})`}
                </Button>
                {applyError && <p className="text-[11px] text-error">{applyError}</p>}
              </>
            )}
            <Button variant="outline" size="md" loading={generating} onClick={() => handleGenerate(result.generationId)}>Regenerate</Button>
          </div>
        )}
      </div>
    </div>
  );
}
