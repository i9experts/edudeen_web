import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { apiCreateAdmin } from '@/api/services/auth';

const inp = 'w-full px-3 py-[9px] text-[13px] border border-bone rounded-lg outline-none bg-white text-charcoal focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10';
const lbl = 'block text-[12px] font-medium text-graphite mb-[6px]';

/**
 * Admin team — an existing admin adds another admin (POST /api/auth/admin/create-admin).
 * Admin access can only ever be granted by an admin; there's no self sign-up.
 */
export function AdminTeamSection() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError(''); setDone('');
    if (!form.name.trim()) return setError('Enter the new admin\'s name.');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Enter a valid email address.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    try {
      await apiCreateAdmin({ name: form.name.trim(), email: form.email.trim(), password: form.password, ...(form.phone.trim() ? { phone: form.phone.trim() } : {}) });
      setDone(`${form.name.trim()} can now sign in at /admin/login with ${form.email.trim()}.`);
      setForm({ name: '', email: '', password: '', phone: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the admin.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-bone rounded-xl px-4 sm:px-[26px] py-6">
      <p className="text-[15px] font-semibold text-charcoal mb-1">Add an admin</p>
      <p className="text-[12.5px] text-slate mb-5">Admins can manage every store, order, payout and setting on Edudeen. Only add people you trust; share the password with them privately.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[640px]">
        <div><label htmlFor="na-name" className={lbl}>Full name</label><input id="na-name" className={inp} value={form.name} onChange={set('name')} maxLength={80} /></div>
        <div><label htmlFor="na-email" className={lbl}>Email</label><input id="na-email" type="email" className={inp} value={form.email} onChange={set('email')} /></div>
        <div><label htmlFor="na-pass" className={lbl}>Temporary password</label><input id="na-pass" type="password" autoComplete="new-password" className={inp} value={form.password} onChange={set('password')} /></div>
        <div><label htmlFor="na-phone" className={lbl}>Phone (optional)</label><input id="na-phone" type="tel" className={inp} value={form.phone} onChange={set('phone')} /></div>
      </div>
      <div className="flex items-center gap-3 mt-5 flex-wrap">
        <button type="button" onClick={submit} disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-[9px] rounded-lg bg-brand-orange text-white text-[13px] font-semibold border-none cursor-pointer disabled:opacity-60">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Add admin
        </button>
        {done && <span className="text-[12px] text-success font-medium">{done}</span>}
        {error && <span className="text-[12px] text-error font-medium" role="alert">{error}</span>}
      </div>
    </div>
  );
}
