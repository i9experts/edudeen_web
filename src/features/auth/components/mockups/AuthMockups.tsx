import { clsx } from 'clsx';
import {
  Star, ShoppingBag, TrendingUp, ShieldCheck, KeyRound, Mail,
  Fingerprint, CheckCircle2, ArrowUpRight, Store, Package, Users, Wallet,
} from 'lucide-react';

/* ── Shared building blocks ──────────────────────────────────────────────────
   Frosted-glass surfaces used across every branding-panel mockup, so each
   screen's illustration reads as one consistent visual system rather than
   bespoke one-off art. */

function GlassPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx('rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/20', className)}>
      {children}
    </div>
  );
}

function FloatingChip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx(
      'absolute flex items-center gap-2 px-3 py-2 rounded-[12px] border border-white/25 bg-white/10 backdrop-blur-md whitespace-nowrap',
      className,
    )}>
      {children}
    </div>
  );
}

function GlowOrb({ className }: { className?: string }) {
  return <div className={clsx('absolute rounded-full blur-3xl auth-glow-pulse pointer-events-none', className)} />;
}

/* ── Login → Marketplace branding ────────────────────────────────────────── */
export function MarketplaceMockup() {
  return (
    <div className="relative w-full max-w-[300px] mx-auto py-[clamp(2px,1.5vh,24px)]">
      <GlowOrb className="w-40 h-40 bg-brand-orange/30 -top-6 -right-4" />
      <GlassPanel className="relative p-[clamp(10px,1.8vh,16px)] auth-float">
        <div className="flex items-center justify-between mb-[clamp(4px,1vh,12px)]">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center">
              <ShoppingBag size={13} className="text-brand-orange" />
            </div>
            <span className="text-[11.5px] font-semibold text-white">Marketplace</span>
          </div>
          <span className="text-[10px] text-white/50">Live</span>
        </div>
        <div className="grid grid-cols-2 gap-[clamp(4px,1vh,10px)]">
          {[
            { grad: 'from-brand-orange to-brand-deep-orange', price: '$24' },
            { grad: 'from-success to-info',            price: '$58' },
            { grad: 'from-warning to-brand-orange',          price: '$12' },
            { grad: 'from-info to-[#6b4ee6]',             price: '$36' },
          ].map((p, i) => (
            <div key={i} className="rounded-[10px] bg-white/[0.06] border border-white/10 overflow-hidden">
              <div className={clsx('h-[clamp(28px,6vh,48px)] bg-gradient-to-br', p.grad)} />
              <div className="px-2 py-[6px] flex items-center justify-between">
                <div className="h-[5px] w-8 rounded-full bg-white/25" />
                <span className="text-[10px] font-bold text-white/85">{p.price}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      <FloatingChip className="-left-3 -bottom-4 auth-float-slow hidden sm:flex">
        <span className="w-6 h-6 rounded-full bg-success/25 flex items-center justify-center shrink-0">
          <CheckCircle2 size={12} className="text-[#4ade80]" />
        </span>
        <span className="text-[10.5px] font-medium text-white/85">Order confirmed</span>
      </FloatingChip>

      <FloatingChip className="-right-2 top-2 hidden sm:flex">
        <div className="flex items-center gap-[2px]">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={9} className="text-brand-orange fill-brand-orange" />)}
        </div>
        <span className="text-[10px] text-white/70">4.8</span>
      </FloatingChip>
    </div>
  );
}

/* ── Register (seller role) → App + dashboard branding ───────────────────── */
export function DashboardMockup() {
  const bars = [40, 65, 48, 80, 58, 92, 70];
  return (
    <div className="relative w-full max-w-[300px] mx-auto py-[clamp(6px,2vh,24px)]">
      <GlowOrb className="w-40 h-40 bg-info/25 -top-4 -left-6" />
      <GlassPanel className="relative p-4 auth-float">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11.5px] font-semibold text-white">Store revenue</span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#4ade80]">
            <ArrowUpRight size={11} /> 24%
          </span>
        </div>
        <p className="text-[22px] font-bold text-white mb-3">$4,285.00</p>
        <div className="flex items-end gap-[6px] h-14">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-[4px] bg-gradient-to-t from-brand-orange to-brand-deep-orange/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      </GlassPanel>

      <FloatingChip className="-right-3 -bottom-4 auth-float-slow hidden sm:flex">
        <span className="w-6 h-6 rounded-full bg-brand-orange/25 flex items-center justify-center shrink-0">
          <TrendingUp size={12} className="text-brand-orange" />
        </span>
        <span className="text-[10.5px] font-medium text-white/85">Sales trending up</span>
      </FloatingChip>
    </div>
  );
}

/* ── Forgot Password → Security branding ─────────────────────────────────── */
export function SecurityMockup() {
  return (
    <div className="relative w-full max-w-[240px] mx-auto py-[clamp(6px,2.4vh,32px)] flex items-center justify-center">
      <div className="absolute size-28 rounded-full border border-white/15 auth-glow-pulse" />
      <div className="absolute size-40 rounded-full border border-white/10" />
      <GlowOrb className="w-44 h-44 bg-brand-orange/20" />
      <div className="relative size-20 rounded-[22px] bg-white/[0.08] backdrop-blur-md border border-white/25 flex items-center justify-center auth-float">
        <ShieldCheck size={34} className="text-brand-orange" />
      </div>
      <FloatingChip className="right-2 bottom-4 hidden sm:flex">
        <Mail size={12} className="text-white/70" />
        <span className="text-[10.5px] font-medium text-white/85">Reset code sent</span>
      </FloatingChip>
    </div>
  );
}

/* ── Reset / New Password → Password-security branding ───────────────────── */
export function PasswordSecurityMockup() {
  return (
    <div className="relative w-full max-w-[260px] mx-auto py-[clamp(6px,2vh,24px)]">
      <GlowOrb className="w-40 h-40 bg-success/25 -top-2 -right-2" />
      <GlassPanel className="relative p-4 auth-float">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="size-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
            <KeyRound size={15} className="text-brand-orange" />
          </div>
          <span className="text-[11.5px] font-semibold text-white">Choose a strong password</span>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { label: 'At least 8 characters', on: true },
            { label: 'One uppercase letter',   on: true },
            { label: 'One number',             on: true },
            { label: 'One special character',  on: false },
          ].map(({ label, on }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={clsx('size-4 rounded-full flex items-center justify-center shrink-0', on ? 'bg-[#4ade80]/25' : 'bg-white/10')}>
                {on && <CheckCircle2 size={10} className="text-[#4ade80]" />}
              </span>
              <span className={clsx('text-[11px]', on ? 'text-white/85' : 'text-white/40')}>{label}</span>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

/* ── OTP Verification (register flow) → Inbox / Email branding ───────────── */
export function InboxMockup() {
  return (
    <div className="relative w-full max-w-[260px] mx-auto py-[clamp(6px,2vh,24px)] flex items-center justify-center">
      <GlowOrb className="w-40 h-40 bg-brand-orange/25 -top-4" />
      <GlassPanel className="relative w-full p-4 auth-float">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="size-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
            <Mail size={15} className="text-brand-orange" />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold text-white leading-tight">New message</p>
            <p className="text-[10px] text-white/50 leading-tight">Edudeen Security</p>
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.06] border border-white/10 p-3">
          <p className="text-[10px] text-white/50 mb-1.5">Your verification code</p>
          <p className="text-[20px] font-bold tracking-[0.3em] text-white">8 4 2 1 9 6</p>
        </div>
      </GlassPanel>
      <FloatingChip className="-right-2 -bottom-3 hidden sm:flex">
        <CheckCircle2 size={12} className="text-[#4ade80]" />
        <span className="text-[10.5px] font-medium text-white/85">Delivered instantly</span>
      </FloatingChip>
    </div>
  );
}

/* ── OTP Verification (forgot-password flow) → Identity branding ─────────── */
export function IdentityMockup() {
  return (
    <div className="relative w-full max-w-[240px] mx-auto py-[clamp(6px,2.4vh,32px)] flex items-center justify-center">
      <div className="absolute size-32 rounded-full border border-white/10" />
      <GlowOrb className="w-44 h-44 bg-info/20" />
      <div className="relative size-20 rounded-[22px] bg-white/[0.08] backdrop-blur-md border border-white/25 flex items-center justify-center auth-float">
        <Fingerprint size={34} className="text-brand-orange" />
      </div>
      <FloatingChip className="left-1 top-3 hidden sm:flex">
        <ShieldCheck size={12} className="text-[#4ade80]" />
        <span className="text-[10.5px] font-medium text-white/85">Confirm it's you</span>
      </FloatingChip>
    </div>
  );
}

/* ── Seller Onboarding → Seller dashboard preview branding ────────────────── */
export function SellerDashboardMockup() {
  const bars = [35, 55, 42, 70, 50, 85, 62, 78];
  return (
    <div className="relative w-full max-w-[300px] mx-auto py-[clamp(4px,1.4vh,16px)]">
      <GlowOrb className="w-40 h-40 bg-brand-orange/25 -top-6 -left-4" />
      <GlassPanel className="relative p-4 auth-float">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center">
              <Store size={13} className="text-brand-orange" />
            </div>
            <span className="text-[11.5px] font-semibold text-white">Your store dashboard</span>
          </div>
        </div>
        <div className="flex items-end gap-[5px] h-12 mb-3">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-[3px] bg-gradient-to-t from-brand-orange to-brand-deep-orange/70" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { Icon: Wallet,  label: 'Revenue',   value: '$4.2k' },
            { Icon: Package, label: 'Orders',    value: '128'   },
            { Icon: Users,   label: 'Customers', value: '86'    },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="rounded-[10px] bg-white/[0.06] border border-white/10 px-2 py-[8px]">
              <Icon size={12} className="text-white/60 mb-1" />
              <p className="text-[12px] font-bold text-white leading-tight">{value}</p>
              <p className="text-[9px] text-white/50 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </GlassPanel>

      <FloatingChip className="-right-3 -bottom-3 auth-float-slow hidden sm:flex">
        <Sparkle />
        <span className="text-[10.5px] font-medium text-white/85">Tools activated</span>
      </FloatingChip>
    </div>
  );
}

/* ── Admin Login → Platform control branding ──────────────────────────────── */
export function AdminControlMockup() {
  return (
    <div className="relative w-full max-w-[280px] mx-auto py-[clamp(6px,2vh,24px)]">
      <GlowOrb className="w-40 h-40 bg-error/25 -top-4 -right-4" />
      <GlassPanel className="relative p-4 auth-float">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-error/20 border border-error/30 flex items-center justify-center">
              <ShieldCheck size={13} className="text-error" />
            </div>
            <span className="text-[11.5px] font-semibold text-white">Platform status</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#4ade80]">
            <span className="size-1.5 rounded-full bg-[#4ade80]" /> All systems normal
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Sellers',  value: '2,481' },
            { label: 'Orders',   value: '18.2k' },
            { label: 'Uptime',   value: '99.98%' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[10px] bg-white/[0.06] border border-white/10 px-2 py-[8px]">
              <p className="text-[12px] font-bold text-white leading-tight">{value}</p>
              <p className="text-[9px] text-white/50 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </GlassPanel>

      <FloatingChip className="-left-2 -bottom-4 auth-float-slow hidden sm:flex">
        <Fingerprint size={12} className="text-white/70" />
        <span className="text-[10.5px] font-medium text-white/85">Restricted access</span>
      </FloatingChip>
    </div>
  );
}

function Sparkle() {
  return (
    <span className="w-6 h-6 rounded-full bg-brand-orange/25 flex items-center justify-center shrink-0">
      <TrendingUp size={12} className="text-brand-orange" />
    </span>
  );
}
