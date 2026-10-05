import { useState } from 'react';
import { ImagePlus, Sparkles } from 'lucide-react';
import { Field } from '@/components/comman/ui/Field';
import { Select } from '@/components/comman/ui/Input';
import { Button } from '@/components/comman/ui/Button';
import { ImageUpload } from '@/components/comman/ui/Upload';
import { useImageEnhance } from '@/hooks/seller/useAiStudio';
import type { EnhancementType } from '@/api/services/aiStudio';
import { costLabel } from '../components/costLabel';

const ENHANCEMENT_LABELS: Record<EnhancementType, string> = {
  upscale: 'Upscale Resolution',
  denoise: 'Reduce Noise',
  background_cleanup: 'Clean Up Background',
};

interface ImageEnhancerToolProps {
  storeId: string;
  onCreditsChanged: () => void;
  /** Live cost from credits.toolCosts (undefined while loading). */
  creditCost?: number;
}

export function ImageEnhancerTool({ storeId, onCreditsChanged, creditCost }: ImageEnhancerToolProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [enhancementType, setEnhancementType] = useState<EnhancementType>('upscale');

  const { start, generating, error, errorCode, result } = useImageEnhance();

  const handleGenerate = async () => {
    if (!imageUrl) return;
    await start(storeId, { imageUrl, enhancementType });
    onCreditsChanged();
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
        <p className="text-sm font-bold text-charcoal mb-5 flex items-center gap-2">
          <ImagePlus size={15} /> Image Enhancer — Input
        </p>

        <div className="flex flex-col gap-4">
          <Field label="Product Image" hint="Upload a jpg, jpeg, png, or webp image">
            <ImageUpload
              value={imageUrl ? [imageUrl] : []}
              onChange={urls => setImageUrl(urls[0] ?? '')}
            />
          </Field>
          <Field label="Enhancement Type">
            <Select value={enhancementType} onChange={e => setEnhancementType(e.target.value as EnhancementType)}>
              {Object.entries(ENHANCEMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
        </div>

        {error && (
          <p className="text-[12px] text-error mt-3 bg-error-bg rounded-md px-3 py-2">
            {error}{errorCode === 'INSUFFICIENT_AI_CREDITS' ? ' — buy more credits above to continue.' : ''}
          </p>
        )}

        <Button variant="primary" size="md" fullWidth loading={generating} disabled={!imageUrl} onClick={handleGenerate} icon={<Sparkles size={14} />} className="mt-5">
          Enhance with AI{costLabel(creditCost)}
        </Button>
      </div>

      <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
        <p className="text-sm font-bold text-charcoal mb-5 flex items-center gap-2">
          <Sparkles size={15} /> AI Output — Preview
        </p>

        {!result && !generating && (
          <div className="flex flex-col items-center justify-center py-[60px] text-center">
            <ImagePlus size={40} className="text-slate mb-3" />
            <p className="text-sm font-semibold text-charcoal mb-[6px]">Ready to enhance</p>
            <p className="text-xs text-slate leading-[1.6]">Upload an image and pick an enhancement type.</p>
          </div>
        )}

        {generating && (
          <div className="flex flex-col items-center justify-center py-[60px] text-center">
            <div className="animate-spin size-8 border-2 border-brand-orange border-t-transparent rounded-full mb-3" />
            <p className="text-sm font-semibold text-charcoal">Processing your image…</p>
          </div>
        )}

        {result && result.status === 'succeeded' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Before</p>
              {result.originalImageUrl && (
                <img src={result.originalImageUrl} alt="Original" className="w-full rounded-lg border border-bone" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">After</p>
              {result.enhancedImageUrl && (
                <img src={result.enhancedImageUrl} alt="Enhanced" className="w-full rounded-lg border border-bone" />
              )}
            </div>
            {result.note && <p className="text-[11px] text-slate">{result.note}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
