import { useCallback, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { Input } from '@/components/comman/ui/Input';
import { apiVerifyAdminPassword } from '@/api/services/reauth';
import { ReauthCtx } from './reauthCtx';

/**
 * Password confirmation for inline site edits. Each write asks again (the token
 * is not cached on the client). The password only lives in this modal's state
 * and is cleared after every attempt - it is never stored or logged.
 */
export function ReauthProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const resolver = useRef<((t: string | null) => void) | null>(null);

  const confirm = useCallback(() => new Promise<string | null>(resolve => {
    resolver.current?.(null);
    resolver.current = resolve;
    setPassword(''); setError(''); setBusy(false); setOpen(true);
  }), []);

  const finish = (token: string | null) => {
    setOpen(false); setPassword(''); setError('');
    resolver.current?.(token);
    resolver.current = null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true); setError('');
    try {
      const res = await apiVerifyAdminPassword(password);
      setPassword('');
      finish(res.data.reauthToken);
    } catch (err) {
      setPassword('');
      const status = (err as { status?: number }).status;
      if (status === 429) setError('Too many wrong attempts - nothing was changed. Try again in 10 minutes.');
      else if (status === 401) setError('Wrong password - nothing was changed.');
      else setError(err instanceof Error && err.message ? `${err.message} - nothing was changed.` : 'Could not confirm - nothing was changed.');
    } finally { setBusy(false); }
  };

  return (
    <ReauthCtx.Provider value={{ confirm }}>
      {children}
      {open && (
        <Modal title="Confirm your password" onClose={() => finish(null)}>
          <form onSubmit={submit} className="flex flex-col gap-3" autoComplete="off">
            <p className="text-[13px] text-slate">Enter your admin password to publish this change. It goes live immediately.</p>
            <Input label="Admin password" type="password" autoFocus autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
            {error && <p className="text-[12px] text-error" role="alert">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => finish(null)}>Cancel</Button>
              <Button type="submit" loading={busy} disabled={!password}>Confirm and publish</Button>
            </div>
          </form>
        </Modal>
      )}
    </ReauthCtx.Provider>
  );
}