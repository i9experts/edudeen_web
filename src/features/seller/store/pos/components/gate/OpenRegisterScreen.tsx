import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { EdudeenIcon } from '@/components/comman/ui/EdudeenLogo';
import { apiListRegisters, type PosRegister } from '@/api/services/pos/posRegisters';
import { apiListShifts, type PosShift } from '@/api/services/pos/posShifts';
import { apiOpenSession, type RegisterSession } from '@/api/services/pos/posSessions';

interface OpenRegisterScreenProps {
  storeId:    string;
  employeeId: string;
  employeeName: string;
  onSuccess: (registerId: string, registerName: string, session: RegisterSession) => void;
  onLogout:  () => void;
}

export function OpenRegisterScreen({ storeId, employeeId, employeeName, onSuccess, onLogout }: OpenRegisterScreenProps) {
  const [registers, setRegisters] = useState<PosRegister[]>([]);
  const [shifts,    setShifts]    = useState<PosShift[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');

  const [registerId,  setRegisterId]  = useState('');
  const [shiftId,     setShiftId]     = useState('');
  const [openingCash, setOpeningCash] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiListRegisters(storeId), apiListShifts(storeId)])
      .then(([regRes, shiftRes]) => {
        if (cancelled) return;
        setRegisters((regRes.data ?? []).filter(r => r.status === 'active'));
        setShifts((shiftRes.data ?? []).filter(s => s.status === 'active'));
      })
      .catch(err => { if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load registers.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!registerId) { setSubmitError('Select a register to open.'); return; }
    const cash = parseFloat(openingCash);
    if (isNaN(cash) || cash < 0) { setSubmitError('Enter a valid opening cash amount.'); return; }

    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await apiOpenSession({
        storeId,
        registerId,
        employeeId,
        shiftId: shiftId || undefined,
        openingCash: cash,
      });
      const register = registers.find(r => r._id === registerId);
      onSuccess(registerId, register?.name ?? 'Register', res.data);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to open register.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-pos-bg px-4">
      <div className="w-full max-w-[380px] bg-pos-surface border border-carbon rounded-2xl p-7">
        <div className="flex flex-col items-center mb-5">
          <EdudeenIcon size={32} />
          <p className="text-[16px] font-bold text-white mt-3">Open Register</p>
          <p className="text-[12px] text-pos-muted mt-1">Welcome, {employeeName} — start your shift</p>
        </div>

        {loading ? (
          <p className="text-[12px] text-pos-muted text-center py-6">Loading registers…</p>
        ) : loadError ? (
          <p className="text-[12px] text-error text-center py-6">{loadError}</p>
        ) : registers.length === 0 ? (
          <p className="text-[12px] text-pos-muted text-center py-6">
            No active registers found for this store. Ask the store owner to add one under POS Admin.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-medium text-pos-faint mb-[6px]">Register</label>
              <div className="flex flex-col gap-[6px]">
                {registers.map(r => (
                  <button
                    key={r._id}
                    type="button"
                    onClick={() => setRegisterId(r._id)}
                    className={clsx(
                      'w-full text-left px-[14px] py-[11px] rounded-lg border text-[13px]',
                      'transition-transform duration-100 active:scale-[0.98]',
                      registerId === r._id
                        ? 'bg-brand-deep-orange border-brand-orange text-white'
                        : 'bg-carbon border-transparent text-pos-faint',
                    )}
                  >
                    {r.name} <span className="text-[11px] opacity-70">· default float ${r.defaultFloatCash.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>

            {shifts.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-pos-faint mb-[6px]">Shift (optional)</label>
                <select
                  value={shiftId}
                  onChange={e => setShiftId(e.target.value)}
                  className="w-full bg-carbon border border-carbon rounded-lg px-[14px] py-[11px] text-[13px] text-white outline-none box-border"
                >
                  <option value="">No shift</option>
                  {shifts.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.startTime}–{s.endTime})</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-pos-faint mb-[6px]">Opening cash</label>
              <input
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="w-full bg-carbon border border-carbon rounded-lg px-[14px] py-[11px] text-[13px] text-white outline-none box-border transition-colors duration-150 focus:border-brand-orange/50"
              />
            </div>

            {submitError && (
              <p className="text-[12px] text-error bg-[#C1303020] border border-error rounded-lg px-3 py-2">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 w-full bg-brand-orange border-0 rounded-lg py-3 text-[13px] font-bold text-white cursor-pointer transition-transform duration-100 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {submitting ? 'Opening…' : 'Open Register & Start Shift'}
            </button>
          </form>
        )}

        <button
          onClick={onLogout}
          className="w-full text-center mt-5 text-[11px] bg-transparent border-0 cursor-pointer text-pos-muted py-1 transition-transform duration-100 active:scale-95"
        >
          ← Switch employee
        </button>
      </div>
    </div>
  );
}
