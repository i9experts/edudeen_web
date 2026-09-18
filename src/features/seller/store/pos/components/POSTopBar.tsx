import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ShoppingCart, ClipboardList, Package, BarChart2, Settings2, Banknote, ArrowLeft, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar } from '@/components/comman/ui/Avatar';
import { EdudeenIcon } from '@/components/comman/ui/EdudeenLogo';
import { apiCashInOut } from '@/api/services/pos/posSessions';
import { usePosSession } from '../context/PosSessionContext';
import { ProfileOverlay } from './ProfileOverlay';
import type { ActiveTab } from '../pos.types';

const TAB_ICONS: Record<ActiveTab, LucideIcon> = {
  sale:     ShoppingCart,
  orders:   ClipboardList,
  products: Package,
  summary:  BarChart2,
  manage:   Settings2,
};

const OPERATOR_TABS: ActiveTab[] = ['sale', 'orders', 'products', 'summary'];
const OWNER_ONLY_TABS: ActiveTab[] = ['manage'];

interface POSTopBarProps {
  activeTab:    ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
}

export function POSTopBar({ activeTab, setActiveTab }: POSTopBarProps) {
  const navigate = useNavigate();
  const { storeId, mode, employee, registerName, sessionId, session, refreshSession, logout } = usePosSession();
  const [showCash, setShowCash] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const openedAt = session ? new Date(session.openedAt) : null;
  const tabs = mode === 'owner' ? [...OPERATOR_TABS, ...OWNER_ONLY_TABS] : OPERATOR_TABS;

  return (
    <div className="shrink-0 flex flex-wrap items-center gap-3 sm:gap-5 px-3 sm:px-5 py-[10px] sm:h-16 bg-pos-surface-2 border-b border-pos-border">
      {/* Logo */}
      <div className="flex items-center gap-[10px] shrink-0">
        <EdudeenIcon size={28} />
        <span className="hidden sm:inline text-[14px] font-bold text-white">POS Register</span>
        <div className="flex items-center gap-[6px] bg-pos-surface rounded-full pl-[7px] pr-[10px] py-[5px] border border-pos-border">
          <span className="relative w-[7px] h-[7px] rounded-full bg-success shrink-0 pos-live-pulse" />
          <span className="text-[10.5px] font-semibold text-success">Live</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-[3px] bg-pos-surface rounded-[14px] p-[4px] overflow-x-auto scrollbar-hide max-w-full border border-pos-border">
        {tabs.map(tab => {
          const Icon = TAB_ICONS[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'shrink-0 h-11 px-[16px] rounded-xl text-[13px] font-semibold cursor-pointer border-0',
                'flex items-center gap-[7px] capitalize transition-all duration-150',
                activeTab === tab
                  ? 'bg-gradient-to-b from-brand-orange to-brand-deep-orange text-white'
                  : 'bg-transparent text-pos-faint hover:text-white hover:bg-pos-surface-3',
              )}
            >
              <Icon size={15} />
              <span className="hidden md:inline">{tab === 'manage' ? 'Manage' : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-w-[8px]" />

      {sessionId && (
        <button
          onClick={() => setShowCash(true)}
          className="hidden sm:flex items-center gap-[8px] h-11 px-[16px] rounded-xl text-[12.5px] font-medium cursor-pointer border border-pos-border bg-pos-surface text-pos-faint transition-all duration-150 hover:border-pos-border-strong hover:text-white"
        >
          <Banknote size={15} /> Cash In/Out
        </button>
      )}

      {/* Profile trigger */}
      <button
        onClick={() => setShowProfile(true)}
        className="flex items-center gap-3 bg-pos-surface border border-pos-border rounded-xl pl-[10px] pr-[6px] h-11 cursor-pointer transition-all duration-150 hover:border-pos-border-strong"
        title="View profile"
      >
        <div className="hidden md:block text-right leading-tight">
          <p className="flex items-center justify-end gap-[5px] text-[10.5px] text-pos-muted">
            {openedAt && <span className="w-[5px] h-[5px] rounded-full bg-success shrink-0 pos-live-pulse" />}
            {openedAt ? `Open · ${openedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </p>
          <p className="text-[12px] font-semibold text-white">
            {employee?.name ?? ''}{registerName ? ` · ${registerName}` : ''}
          </p>
        </div>
        <Avatar name={employee?.name ?? 'Employee'} size={34} variant="pos" />
      </button>

      {mode === 'owner' ? (
        <button
          onClick={() => navigate(`/store/${storeId}/pos`)}
          className="flex items-center gap-[6px] h-11 px-[14px] rounded-xl text-[12.5px] font-medium cursor-pointer border border-pos-border bg-transparent text-white/50 transition-all duration-150 hover:text-white hover:border-pos-border-strong"
        >
          <ArrowLeft size={14} /> <span className="hidden sm:inline">Dashboard</span>
        </button>
      ) : (
        <button
          onClick={() => logout()}
          className="flex items-center gap-[6px] h-11 px-[14px] rounded-xl text-[12.5px] font-medium cursor-pointer border border-pos-border bg-transparent text-white/50 transition-all duration-150 hover:text-error hover:border-error/40"
        >
          <LogOut size={14} /> <span className="hidden sm:inline">Log Out</span>
        </button>
      )}

      {showCash && sessionId && employee && (
        <CashAdjustmentOverlay
          sessionId={sessionId}
          employeeId={employee._id}
          onClose={() => setShowCash(false)}
          onDone={() => { setShowCash(false); refreshSession(); }}
        />
      )}

      {showProfile && employee && (
        <ProfileOverlay
          storeId={storeId}
          employeeId={employee._id}
          registerName={registerName}
          openedAt={openedAt}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}

function CashAdjustmentOverlay({
  sessionId, employeeId, onClose, onDone,
}: {
  sessionId: string;
  employeeId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [type, setType]     = useState<'cash_in' | 'cash_out'>('cash_in');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function submit() {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }
    if (!reason.trim()) { setError('Reason is required.'); return; }

    setError('');
    setSaving(true);
    try {
      await apiCashInOut(sessionId, { type, amount: amt, reason: reason.trim(), employeeId });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record cash adjustment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 pos-overlay-enter">
      <div className="w-full max-w-[360px] bg-pos-surface-3 border border-pos-border-strong rounded-[20px] p-6 pos-panel-enter">
        <div className="flex items-center gap-[10px] mb-5">
          <div className="w-9 h-9 rounded-xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center shrink-0">
            <Banknote size={16} className="text-brand-orange" />
          </div>
          <p className="text-[15px] font-bold text-white">Cash In / Out</p>
        </div>

        <div className="flex gap-[8px] mb-4">
          <button
            onClick={() => setType('cash_in')}
            className={clsx(
              'flex-1 h-12 rounded-xl text-[13px] font-semibold cursor-pointer border-2 transition-all duration-150 active:scale-[0.97]',
              type === 'cash_in' ? 'bg-success/15 border-success/50 text-success' : 'bg-pos-surface border-pos-border text-pos-faint',
            )}
          >
            Cash In
          </button>
          <button
            onClick={() => setType('cash_out')}
            className={clsx(
              'flex-1 h-12 rounded-xl text-[13px] font-semibold cursor-pointer border-2 transition-all duration-150 active:scale-[0.97]',
              type === 'cash_out' ? 'bg-error/15 border-error/50 text-error' : 'bg-pos-surface border-pos-border text-pos-faint',
            )}
          >
            Cash Out
          </button>
        </div>

        <input
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Amount"
          inputMode="decimal"
          className="w-full h-12 bg-pos-surface border border-pos-border rounded-xl px-[14px] text-[14px] text-white outline-none box-border mb-3 transition-colors duration-150 focus:border-pos-border-strong"
        />
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason"
          className="w-full h-12 bg-pos-surface border border-pos-border rounded-xl px-[14px] text-[14px] text-white outline-none box-border mb-4 transition-colors duration-150 focus:border-pos-border-strong"
        />

        {error && <p className="text-[12px] text-error bg-error/10 border border-error/30 rounded-xl px-[12px] py-[8px] mb-3">{error}</p>}

        <div className="flex gap-[8px]">
          <button onClick={onClose} className="flex-1 h-12 bg-pos-surface border border-pos-border rounded-xl text-[13px] text-pos-faint cursor-pointer transition-all duration-150 hover:border-pos-border-strong">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 h-12 bg-gradient-to-b from-brand-orange to-brand-deep-orange border-0 rounded-xl text-[13px] font-semibold text-white cursor-pointer transition-transform duration-150 disabled:opacity-50 active:scale-[0.98]"
          >
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
