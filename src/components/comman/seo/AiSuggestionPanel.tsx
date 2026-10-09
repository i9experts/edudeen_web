import { Sparkles, Check, X } from 'lucide-react';
import { Card } from '@/components/comman/ui/Card';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';

export interface AiSeoSuggestionValue {
  metaTitle?:       string;
  metaDescription?: string;
  keywords?:        string[];
}

interface AiSuggestionPanelProps {
  suggestion?: AiSeoSuggestionValue | null;
  generating:  boolean;
  onGenerate:  () => void;
  onAccept:    () => void;
  onDiscard:   () => void;
  className?:  string;
}

export function AiSuggestionPanel({ suggestion, generating, onGenerate, onAccept, onDiscard, className }: AiSuggestionPanelProps) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-carbon flex items-center gap-[6px]">
          <Sparkles size={14} className="text-brand-orange" /> AI SEO Suggestion
        </p>
        {!suggestion && (
          <Button variant="secondary" size="sm" icon={<Sparkles size={12} />} loading={generating} onClick={onGenerate}>
            Generate
          </Button>
        )}
      </div>

      {generating && !suggestion && (
        <div className="flex flex-col gap-2">
          <SkeletonBox height={13} width="70%" rounded="4px" />
          <SkeletonBox height={11} width="95%" rounded="3px" />
          <SkeletonBox height={11} width="85%" rounded="3px" />
        </div>
      )}

      {!generating && !suggestion && (
        <p className="text-[12px] text-slate leading-[1.6]">
          Generate an AI-written meta title, description, and keywords based on this item's existing content.
        </p>
      )}

      {suggestion && (
        <div className="flex flex-col gap-3">
          {suggestion.metaTitle && (
            <div>
              <p className="text-[12px] font-medium text-graphite mb-1">Suggested Title</p>
              <p className="text-[13px] text-carbon leading-[1.5]">{suggestion.metaTitle}</p>
            </div>
          )}
          {suggestion.metaDescription && (
            <div>
              <p className="text-[12px] font-medium text-graphite mb-1">Suggested Description</p>
              <p className="text-[13px] text-carbon leading-[1.5]">{suggestion.metaDescription}</p>
            </div>
          )}
          {suggestion.keywords && suggestion.keywords.length > 0 && (
            <div>
              <p className="text-[12px] font-medium text-graphite mb-1">Suggested Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestion.keywords.map(k => (
                  <span key={k} className="px-[9px] py-[2px] bg-cream border border-bone rounded-[5px] text-[12px] text-graphite">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button variant="primary" size="sm" icon={<Check size={12} />} onClick={onAccept}>Accept</Button>
            <Button variant="ghost" size="sm" icon={<X size={12} />} onClick={onDiscard}>Discard</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
