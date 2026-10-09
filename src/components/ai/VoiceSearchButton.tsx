import { Mic, MicOff } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/contexts/languageCtx';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';

/**
 * Mic button for the buyer search box. Speech-to-text runs in the browser (Web Speech API); only the text is used,
 * and it is handed to the normal search submit. Hidden when the browser cannot do speech recognition or the admin
 * switched `voice_search` off.
 */
export function VoiceSearchButton({ onText, className }: { onText: (text: string) => void; className?: string }) {
  const { lang, t } = useLanguage();
  const { flagOn } = useAiFeatures();
  const { supported, listening, error, start, stop } = useVoiceSearch({ lang, onResult: onText });
  if (!supported || !flagOn('voice_search')) return null;

  const label = listening ? t('Listening... tap to stop') : t('Search by voice');
  const errorText = error === 'denied' ? t('Microphone access is blocked. Allow it in your browser settings to search by voice.')
    : error === 'no-speech' ? t('We did not hear anything. Try again.')
    : error ? t('Voice search is not available right now. Please type your search.') : '';

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-label={label}
        aria-pressed={listening}
        title={label}
        className={clsx(
          'w-8 h-8 flex items-center justify-center rounded-full border-none cursor-pointer transition-colors',
          listening ? 'bg-brand-orange text-white animate-pulse' : 'bg-transparent text-slate hover:text-charcoal hover:bg-cream',
          className,
        )}
      >
        {error ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
      <span role="status" aria-live="polite" className="sr-only">{listening ? label : errorText}</span>
      {errorText && !listening && (
        <span role="alert" className="absolute top-full end-0 mt-1 z-40 w-56 rounded-md bg-white border border-bone shadow-card-hover px-3 py-2 text-[12px] text-graphite">{errorText}</span>
      )}
    </span>
  );
}
