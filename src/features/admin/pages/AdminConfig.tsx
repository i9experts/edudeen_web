import { SocialLinksCard } from './SocialLinksCard';
import { HomeContentCard } from './HomeContentCard';
import { SellerPageCard } from './SellerPageCard';
import { ChatbotCard } from './ChatbotCard';
import { MaintenanceCard } from './MaintenanceCard';
import { ReferralSettingsCard } from './ReferralSettingsCard';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useAdminConfig,
  useUpdateAiConfig,
  useUpdateEmailConfig,
  useUpdateManualPaymentConfig,
} from '@/hooks/admin/useAdminConfig';
import type { PlatformConfig, AiConfig, EmailConfig, ManualPaymentConfig, PlatformFees, PlatformFeeRule, PlatformFeeMode } from '@/api/services/config/adminConfig';
import { apiGetPlatformFees, apiUpdatePlatformFees } from '@/api/services/config/adminConfig';
import { Toggle, Input, Textarea, Select, Button, SkeletonBox, Accordion } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { CheckCircle2, Wrench, Sparkles, Mail, Landmark, Percent, Home, Gift, Share2, Store, MessageCircle } from 'lucide-react';
import { AiFeatureSwitches } from '@/features/admin/components/AiFeatureSwitches';

const AI_MODELS = ['claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-4-8'];
const EMAIL_PROVIDERS = ['SendGrid', 'Mailgun', 'AWS SES', 'Postmark'];

// ── Saved indicator — transient success feedback (no toast system in this app) ─
function SavedHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-success">
      <CheckCircle2 size={13} /> Saved
    </span>
  );
}

function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };
  return { saved, flash };
}

// ── AI Configuration card ─────────────────────────────────────────────────────
function AiConfigCard({ config, onSaved }: { config: PlatformConfig; onSaved: (c: PlatformConfig) => void }) {
  const { update, submitting, error } = useUpdateAiConfig();
  const { saved, flash } = useSavedFlash();
  const [aiModel, setAiModel] = useState(config.aiConfig.aiModel);

  // Re-seed local form state when the server value changes underneath us
  // (e.g. after a successful save) — adjusted during render rather than in
  // an effect, per React's guidance for "state that mirrors a prop".
  const [syncedAiConfig, setSyncedAiConfig] = useState(config.aiConfig);
  if (config.aiConfig !== syncedAiConfig) {
    setSyncedAiConfig(config.aiConfig);
    setAiModel(config.aiConfig.aiModel);
  }

  // The old "Monthly Credit Limit (per seller)" field (aiConfig.monthlyCreditLimit)
  // is hidden: the backend never reads it. Each seller's monthly AI credits
  // come from their platform plan's `aiCreditsPerMonth` (see
  // platform-plans/ai-credits.service.ts), so that's the one setting that
  // matters. The stored value is left untouched (not sent on save).
  async function save() {
    const payload: Partial<AiConfig> = { aiModel };
    const ok = await update(payload);
    if (ok) { onSaved({ ...config, aiConfig: { ...config.aiConfig, ...payload } }); flash(); }
  }

  return (
    <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
      <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] mb-4">AI Configuration</p>
      <div className="flex flex-col gap-[14px]">
        <Select label="AI Model" value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
          {AI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
        <div className="bg-brand-pale-orange rounded-lg px-3 py-[10px] text-[12px] text-brand-deep-orange">
          <p className="font-semibold mb-[3px]">Monthly AI credits</p>
          <p className="text-[#8c6050]">
            Each seller's monthly AI credits come from their plan's "AI credits / month" setting.{' '}
            <Link to="/admin/platform-plans" className="underline font-medium">Edit in Platform Plans</Link>
          </p>
        </div>
        {error && <p className="text-[12px] text-error">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={submitting} size="sm" className="self-start">Save AI Config</Button>
          <SavedHint show={saved} />
        </div>
        <AiFeatureSwitches />
      </div>
    </div>
  );
}

// ── Email Configuration card ──────────────────────────────────────────────────
function EmailConfigCard({ config, onSaved }: { config: PlatformConfig; onSaved: (c: PlatformConfig) => void }) {
  const { update, submitting, error } = useUpdateEmailConfig();
  const { saved, flash } = useSavedFlash();
  const [fromName, setFromName] = useState(config.emailConfig.fromName);
  const [fromEmail, setFromEmail] = useState(config.emailConfig.fromEmail ?? '');
  const [replyToEmail, setReplyToEmail] = useState(config.emailConfig.replyToEmail ?? '');
  const [provider, setProvider] = useState(config.emailConfig.provider);
  const [validationError, setValidationError] = useState('');

  // See AiConfigCard above — re-seeded during render, not via effect.
  const [syncedEmailConfig, setSyncedEmailConfig] = useState(config.emailConfig);
  if (config.emailConfig !== syncedEmailConfig) {
    setSyncedEmailConfig(config.emailConfig);
    setFromName(config.emailConfig.fromName);
    setFromEmail(config.emailConfig.fromEmail ?? '');
    setReplyToEmail(config.emailConfig.replyToEmail ?? '');
    setProvider(config.emailConfig.provider);
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function save() {
    if (fromEmail && !emailPattern.test(fromEmail)) { setValidationError('From Email must be a valid email address.'); return; }
    if (replyToEmail && !emailPattern.test(replyToEmail)) { setValidationError('Reply-To Email must be a valid email address.'); return; }
    setValidationError('');
    const payload: Partial<EmailConfig> = { fromName, fromEmail, replyToEmail, provider };
    const ok = await update(payload);
    if (ok) { onSaved({ ...config, emailConfig: { ...config.emailConfig, ...payload } }); flash(); }
  }

  return (
    <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
      <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] mb-4">Email Configuration</p>
      <div className="flex flex-col gap-[14px]">
        <Input label="From Name" value={fromName} onChange={(e) => setFromName(e.target.value)} />
        <Input label="From Email" type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} error={validationError.includes('From Email') ? validationError : undefined} />
        <Input label="Reply-To Email" type="email" value={replyToEmail} onChange={(e) => setReplyToEmail(e.target.value)} error={validationError.includes('Reply-To') ? validationError : undefined} />
        <Select label="Email Provider" value={provider} onChange={(e) => setProvider(e.target.value)}>
          {EMAIL_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        {error && <p className="text-[12px] text-error">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={submitting} size="sm" className="self-start">Save Email Config</Button>
          <SavedHint show={saved} />
        </div>
      </div>
    </div>
  );
}

// ── Platform fees card ────────────────────────────────────────────────────────
type FeeForm = { mode: PlatformFeeMode; value: string };
const toFeeForm = (r: PlatformFeeRule | null | undefined): FeeForm => ({ mode: r?.mode ?? 'percentage', value: r ? String(r.value) : '' });

function PlatformFeesCard() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [current, setCurrent] = useState<PlatformFees | null>(null);
  const [digital, setDigital] = useState<FeeForm>(toFeeForm(null));
  const [physical, setPhysical] = useState<FeeForm>(toFeeForm(null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { saved, flash } = useSavedFlash();

  const load = useCallback(() => {
    setLoading(true); setLoadError('');
    apiGetPlatformFees()
      .then((res) => {
        const f = res.data.platformFees;
        setCurrent(f); setDigital(toFeeForm(f.digital)); setPhysical(toFeeForm(f.physical));
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Could not load platform fees.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  function validate(label: string, f: FeeForm): string {
    if (f.value.trim() === '') return '';
    const n = Number(f.value);
    if (!Number.isFinite(n) || n < 0) return `${label}: enter a number that is 0 or more.`;
    if (f.mode === 'percentage' && n > 100) return `${label}: a percentage can't be more than 100.`;
    return '';
  }
  const describe = (r: PlatformFeeRule | null | undefined) =>
    !r ? 'Not set (no fee)' : r.mode === 'percentage' ? `${r.value}% of item price` : `USD ${r.value} per item sold`;

  async function save() {
    const msg = validate('Digital', digital) || validate('Physical', physical);
    if (msg) { setError(msg); return; }
    const toRule = (f: FeeForm): PlatformFeeRule | undefined => (f.value.trim() === '' ? undefined : { mode: f.mode, value: Number(f.value) });
    const payload: Partial<PlatformFees> = {};
    const d = toRule(digital); const p = toRule(physical);
    if (d) payload.digital = d;
    if (p) payload.physical = p;
    if (!d && !p) { setError('Enter a value for at least one product type.'); return; }
    setSubmitting(true); setError('');
    try {
      await apiUpdatePlatformFees(payload);
      flash(); load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save platform fees.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !current) return <SkeletonBox height={200} rounded="10px" />;
  if (loadError && !current) return <AnalyticsErrorState message={loadError} onRetry={load} />;

  const block = (title: string, form: FeeForm, set: (f: FeeForm) => void, cur: PlatformFeeRule | null | undefined) => (
    <div className="border border-bone rounded-lg p-3 flex flex-col gap-3">
      <div>
        <p className="text-[13px] font-semibold text-carbon">{title} products</p>
        <p className="text-[11.5px] text-slate">Current: {describe(cur)}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select label="Fee type" value={form.mode} onChange={(e) => set({ ...form, mode: e.target.value as PlatformFeeMode })}>
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed</option>
        </Select>
        <Input
          label={form.mode === 'percentage' ? 'Value (%)' : 'Value (USD)'}
          type="number" min={0} max={form.mode === 'percentage' ? 100 : undefined} step="0.01"
          value={form.value} onChange={(e) => set({ ...form, value: e.target.value })}
          placeholder={form.mode === 'percentage' ? 'e.g. 10' : 'e.g. 0.50'}
        />
      </div>
      <p className="text-[11.5px] text-slate">{form.mode === 'fixed' ? 'Fixed = USD per item sold.' : 'Percentage of the item price (0-100).'}</p>
    </div>
  );

  return (
    <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
      <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] mb-1">Platform fees</p>
      <p className="text-[12px] text-slate mb-4">
        Edudeen keeps this fee on every sale; the seller's wallet is credited with the sale minus the fee. The fee is
        calculated on the item price only. Shipping is not included. Leave a field empty to keep its current value.
      </p>
      <div className="flex flex-col gap-[14px]">
        {block('Digital', digital, setDigital, current?.digital)}
        {block('Physical', physical, setPhysical, current?.physical)}
        {error && <p className="text-[12px] text-error">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={submitting} size="sm" className="self-start">Save platform fees</Button>
          <SavedHint show={saved} />
        </div>
      </div>
    </div>
  );
}

// ── Platform payment account card (where buyers pay) ──────────────────────────
function ManualPaymentConfigCard({ config, onSaved }: { config: PlatformConfig; onSaved: (c: PlatformConfig) => void }) {
  const { update, submitting, error } = useUpdateManualPaymentConfig();
  const { saved, flash } = useSavedFlash();
  const [form, setForm] = useState(config.manualPaymentConfig);
  const [validationError, setValidationError] = useState('');

  // See AiConfigCard above — re-seeded during render, not via effect.
  const [synced, setSynced] = useState(config.manualPaymentConfig);
  if (config.manualPaymentConfig !== synced) {
    setSynced(config.manualPaymentConfig);
    setForm(config.manualPaymentConfig);
  }

  function setField<K extends keyof ManualPaymentConfig>(key: K, value: ManualPaymentConfig[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function save() {
    if (form.enabled && (!form.bankName || !form.accountTitle || !form.accountNumber)) {
      setValidationError('Bank name, account title, and account number are required to enable bank transfer.');
      return;
    }
    setValidationError('');
    // `usdToPkrRate` is deliberately not sent: it's a legacy field the
    // backend no longer uses for charges (payment.service uses the FX
    // Settings rate snapshot instead), so editing it here only caused two
    // disagreeing PKR rates.
    const { usdToPkrRate: _legacyRate, ...payload } = form;
    void _legacyRate;
    const ok = await update(payload);
    if (ok) { onSaved({ ...config, manualPaymentConfig: form }); flash(); }
  }

  return (
    <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Platform payment account</p>
          <p className="text-[12px] text-slate">The bank, JazzCash or Easypaisa account buyers pay into for bank-transfer orders. Every bank-transfer payment goes here; you review each proof under Payment proofs, and the seller is credited after the platform fee.</p>
        </div>
        <Toggle label="Bank transfer enabled" checked={form.enabled} onChange={(next) => setField('enabled', next)} />
      </div>
      <div className="flex flex-col gap-[14px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <Input label="Bank Name" value={form.bankName ?? ''} onChange={(e) => setField('bankName', e.target.value)} placeholder="Meezan Bank" />
          <Input label="Account Title" value={form.accountTitle ?? ''} onChange={(e) => setField('accountTitle', e.target.value)} placeholder="Edudeen Marketplace Pvt Ltd" />
          <Input label="Account Number" value={form.accountNumber ?? ''} onChange={(e) => setField('accountNumber', e.target.value)} placeholder="01234567890123" />
          <Input label="IBAN" value={form.iban ?? ''} onChange={(e) => setField('iban', e.target.value)} placeholder="PK00MEZN0001234567890123" />
          <Input label="JazzCash Number (optional)" value={form.jazzcashNumber ?? ''} onChange={(e) => setField('jazzcashNumber', e.target.value)} />
          <Input label="Easypaisa Number (optional)" value={form.easypaisaNumber ?? ''} onChange={(e) => setField('easypaisaNumber', e.target.value)} />
        </div>
        <div className="bg-cream border border-bone rounded-lg px-3 py-[10px] text-[12px] text-charcoal">
          <p className="font-semibold mb-[2px]">Exchange rate</p>
          <p className="text-slate">
            The USD → PKR rate buyers are charged comes from FX Settings, the single rate used at checkout.{' '}
            <Link to="/admin/fx-settings" className="underline font-medium text-brand-orange">Manage in FX Settings</Link>
          </p>
        </div>
        <Textarea
          label="Instructions shown to buyer (optional)"
          value={form.instructions ?? ''}
          onChange={(e) => setField('instructions', e.target.value)}
          placeholder="Transfer the exact amount shown and upload your receipt."
          rows={2}
        />
        {(validationError || error) && <p className="text-[12px] text-error">{validationError || error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={submitting} size="sm" className="self-start">Save Manual Payment Config</Button>
          <SavedHint show={saved} />
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function ConfigSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonBox height={84} rounded="10px" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SkeletonBox height={280} rounded="10px" />
        <div className="flex flex-col gap-4">
          <SkeletonBox height={200} rounded="10px" />
          <SkeletonBox height={260} rounded="10px" />
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AdminConfig() {
  usePageTitle('Config');
  const { data, loading, error, refetch } = useAdminConfig();
  const [config, setConfig] = useState<PlatformConfig | null>(null);

  // Seed local editable state from the fetched config — adjusted during
  // render (not an effect) per React's guidance for state mirroring a prop.
  const [syncedData, setSyncedData] = useState<PlatformConfig | null>(null);
  if (data && data !== syncedData) {
    setSyncedData(data);
    setConfig(data);
  }

  return (
    <>
      <AdminStudioHeader eyebrow="Edudeen team workspace · System" title="Platform Config" subtitle="AI settings, email config and system controls." />
      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
      {loading && !config ? (
        <ConfigSkeleton />
      ) : error && !config ? (
        <AnalyticsErrorState message={error} onRetry={refetch} />
      ) : config ? (
        <>
          <p className="text-[12px] text-slate -mb-2">Pick a topic to open its settings.</p>
          <Accordion items={[
            { id: 'maintenance', title: 'Maintenance', description: 'Take parts of the site offline with a message for visitors', icon: <Wrench size={16} />,
              status: config.maintenance?.enabled ? <span className="px-2 py-0.5 rounded-full bg-error-bg text-error font-semibold">On</span> : <span className="px-2 py-0.5 rounded-full bg-bone text-slate">Off</span>,
              content: <MaintenanceCard config={config} onSaved={setConfig} /> },
            { id: 'platform-fees', title: 'Platform fees', description: 'Fee Edudeen keeps on each sale, per product type', icon: <Percent size={16} />,
              content: <PlatformFeesCard /> },
            { id: 'manual-payment', title: 'Platform payment account', description: 'Bank / JazzCash / Easypaisa account buyers pay into', icon: <Landmark size={16} />,
              content: <ManualPaymentConfigCard config={config} onSaved={setConfig} /> },
            { id: 'ai', title: 'AI settings', description: 'Model, monthly credits and which AI features are on', icon: <Sparkles size={16} />,
              content: <AiConfigCard config={config} onSaved={setConfig} /> },
            { id: 'email', title: 'Email', description: 'Sender name, from / reply-to address and provider', icon: <Mail size={16} />,
              content: <EmailConfigCard config={config} onSaved={setConfig} /> },
            { id: 'homepage', title: 'Homepage, About & legal text', description: 'Hero, trust strip, About page, privacy / terms / cookie text', icon: <Home size={16} />,
              content: <HomeContentCard /> },
            { id: 'seller-page', title: 'Become-a-seller page', description: 'Hero, steps, feature rows, FAQs and more on /become-a-seller', icon: <Store size={16} />,
              content: <SellerPageCard /> },
            { id: 'chatbot', title: 'Chatbot', description: 'Edudeen Help chat bubble: suggested questions and answers for buyers and sellers', icon: <MessageCircle size={16} />,
              content: <ChatbotCard /> },
            { id: 'referral', title: 'Referral programme', description: 'Rewards when buyers invite friends', icon: <Gift size={16} />,
              content: <ReferralSettingsCard /> },
            { id: 'social', title: 'Social links', description: 'Icons shown in the website footer', icon: <Share2 size={16} />,
              content: <SocialLinksCard /> },
          ]} />
        </>
      ) : null}
      </div>
    </>
  );
}
