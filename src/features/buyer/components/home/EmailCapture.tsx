import { useState, type FormEvent } from 'react';
import { Check, Mail, Send } from 'lucide-react';
import { useT } from '@/contexts/languageCtx';
import { apiSubscribeNewsletter } from '@/api/services/newsletter';

/**
 * One email field + button for the home page (newsletter and "notify me when the app launches"). Posts to the
 * existing public newsletter endpoint (validated, throttled 5/min, de-duplicated server-side); `source` records which
 * form it was. Shows loading, an error, and a thank-you state.
 */
export function EmailCapture({ source, submitLabel, successText, className = '' }: {
  source: 'home' | 'app-notify';
  submitLabel: string;
  successText: string;
  className?: string;
}) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) { setError(t('Please enter a valid email address.')); return; }
    setBusy(true); setError('');
    try { await apiSubscribeNewsletter(value, source); setDone(true); }
    catch (err) { setError(err instanceof Error && err.message ? err.message : t('Something went wrong. Please try again.')); }
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <div role="status" className={`flex items-center gap-2.5 text-[13.5px] text-carbon bg-white border border-bone rounded-full px-5 py-3.5 ${className}`}>
        <Check size={16} className="text-brand-green shrink-0" aria-hidden />{t(successText)}
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className={`w-full ${className}`}>
      <div className="flex items-stretch border border-[#afbdc6] rounded-full overflow-hidden bg-white focus-within:border-brand-orange transition-colors">
        <Mail size={15} className="ms-4 self-center text-slate shrink-0" aria-hidden />
        <input
          type="email" inputMode="email" autoComplete="email" dir="ltr"
          value={email} onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
          placeholder={t('Your email address')} aria-label={t('Email address')} aria-invalid={!!error} disabled={busy}
          className="flex-1 min-w-0 px-3 py-[12px] bg-transparent text-[14px] text-carbon placeholder:text-slate outline-none border-none disabled:opacity-60"
        />
        <button type="submit" disabled={busy}
          className="shrink-0 flex items-center gap-2 px-4 sm:px-5 bg-brand-orange text-white text-[13px] font-bold border-none cursor-pointer hover:brightness-95 disabled:opacity-70">
          <Send size={13} aria-hidden /><span>{busy ? t('Sending…') : t(submitLabel)}</span>
        </button>
      </div>
      {error && <p className="mt-2 ps-3 text-[12px] text-error m-0" role="alert">{error}</p>}
    </form>
  );
}
