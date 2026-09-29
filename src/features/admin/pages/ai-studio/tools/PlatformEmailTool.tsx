import { useState } from 'react';
import { Mail, Sparkles, Bot } from 'lucide-react';
import { Field } from '@/components/comman/ui/Field';
import { Select } from '@/components/comman/ui/Input';
import { Button } from '@/components/comman/ui/Button';
import { useGeneratePlatformEmail } from '@/hooks/admin/useAdminAiStudio';
import type { AiTone, CampaignGoal } from '@/api/services/aiStudio';

const GOALS: { value: CampaignGoal; label: string }[] = [
  { value: 'promo', label: 'Promotion / Sale' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'abandoned_cart', label: 'Abandoned Cart' },
  { value: 'new_arrival', label: 'New Arrival' },
  { value: 'restock', label: 'Back in Stock' },
  { value: 'thank_you', label: 'Thank You' },
];

export function PlatformEmailTool() {
  const [campaignGoal, setCampaignGoal] = useState<CampaignGoal>('newsletter');
  const [tone, setTone] = useState<AiTone>('professional');

  const { generate, generating, error, result } = useGeneratePlatformEmail();

  const handleGenerate = async (regenerateFromId?: string) => {
    await generate({ campaignGoal, tone, regenerateFromId });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
        <p className="text-sm font-bold text-charcoal mb-5 flex items-center gap-2">
          <Mail size={15} /> Email Campaigns — Input
        </p>

        <div className="flex flex-col gap-4">
          <Field label="Campaign Goal">
            <Select value={campaignGoal} onChange={e => setCampaignGoal(e.target.value as CampaignGoal)}>
              {GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </Select>
          </Field>

          <Field label="Tone">
            <div className="flex gap-2">
              {(['professional', 'friendly', 'academic'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer capitalize transition-all duration-150 border"
                  style={{
                    borderColor: tone === t ? '#174771' : '#E1E7EA',
                    background: tone === t ? '#EAF2F8' : '#fff',
                    color: tone === t ? '#0F3354' : '#64727B',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {error && <p className="text-[12px] text-error mt-3 bg-error-bg rounded-md px-3 py-2">{error}</p>}

        <Button variant="primary" size="md" fullWidth loading={generating} onClick={() => handleGenerate()} icon={<Sparkles size={14} />} className="mt-5">
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
            <p className="text-xs text-slate leading-[1.6]">Pick a campaign goal and click "Generate".</p>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Subject Line</p>
              <div className="bg-cream border border-bone rounded-lg px-[14px] py-3 text-[13px] font-semibold text-charcoal leading-[1.5]">
                {result.subject}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Preview Text</p>
              <div className="bg-cream border border-bone rounded-lg px-[14px] py-3 text-xs text-graphite leading-[1.7]">
                {result.previewText}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Email Body</p>
              <div className="bg-cream border border-bone rounded-lg px-[14px] py-3 text-xs text-graphite leading-[1.7] whitespace-pre-wrap max-h-[260px] overflow-y-auto">
                {result.body}
              </div>
            </div>
            <Button variant="outline" size="md" loading={generating} onClick={() => handleGenerate(result.generationId)}>Regenerate</Button>
          </div>
        )}
      </div>
    </div>
  );
}
