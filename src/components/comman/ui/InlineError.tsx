import { AlertCircle, RefreshCw } from 'lucide-react';

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

// One shared error-banner treatment for a failed list/data fetch — icon +
// message + an optional "Retry" action, in a red-tinted card. Replaces the
// near-identical JSX several seller list pages used to hand-roll separately
// (converges on the same look admin's `AnalyticsErrorState` already uses).
export function InlineError({ message, onRetry, className }: InlineErrorProps) {
  return (
    <div className={`bg-error-bg border border-error-border rounded-[10px] px-4 py-3 flex items-center gap-3 ${className ?? ''}`}>
      <AlertCircle size={16} className="text-error shrink-0" />
      <span className="text-[13px] text-error flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-[12px] text-error font-semibold cursor-pointer bg-transparent border-none rounded-xs transition-opacity duration-150 hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 focus-visible:ring-offset-1"
        >
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}
