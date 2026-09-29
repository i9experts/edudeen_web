import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useAdminConfig,
  useUpdateAiConfig,
  useUpdateEmailConfig,
  useUpdateManualPaymentConfig,
  useUpdateMaintenanceMode,
} from '@/hooks/admin/useAdminConfig';
import type { PlatformConfig, AiConfig, EmailConfig, ManualPaymentConfig } from '@/api/services/config/adminConfig';
import { Toggle, Input, Textarea, Select, Button, Modal, SkeletonBox } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

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

// ── Maintenance Mode card ─────────────────────────────────────────────────────
function MaintenanceCard({ config, onSaved }: { config: PlatformConfig; onSaved: (c: PlatformConfig) => void }) {
  const { update, submitting, error } = useUpdateMaintenanceMode();
  const [confirming, setConfirming] = useState(false);

  async function apply(next: boolean) {
    const ok = await update(next);
    if (ok) onSaved({ ...config, maintenanceMode: next });
    setConfirming(false);
  }

  return (
    <>
      <div
        className="bg-white rounded-[10px] px-[22px] py-5 transition-[border-color] duration-200"
        style={{ border: config.maintenanceMode ? '2px solid #C13030' : '1px solid #E1E7EA' }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] flex items-center gap-[6px] mb-[3px]">
              <AlertCircle size={15} className="text-error" /> Maintenance Mode
            </p>
            <p className="text-[12px] text-slate">When enabled, the platform shows a maintenance page to all users.</p>
          </div>
          <Toggle
            checked={config.maintenanceMode}
            disabled={submitting}
            onChange={(next) => (next ? setConfirming(true) : apply(false))}
          />
        </div>
        {config.maintenanceMode && (
          <p className="mt-3 text-[11px] font-semibold text-error flex items-center gap-1">
            <AlertTriangle size={11} /> Maintenance mode is ON — users cannot access the platform.
          </p>
        )}
        {error && <p className="mt-2 text-[12px] text-error">{error}</p>}
      </div>

      {confirming && (
        <Modal mobileSheet
          title="Enable Maintenance Mode?"
          onClose={() => setConfirming(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
              <Button variant="danger" loading={submitting} onClick={() => apply(true)}>Enable Maintenance Mode</Button>
            </>
          }
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            This immediately shows a maintenance page to every buyer and seller on the platform. Are you sure?
          </p>
        </Modal>
      )}
    </>
  );
}

// ── AI Configuration card ─────────────────────────────────────────────────────
function AiConfigCard({ config, onSaved }: { config: PlatformConfig; onSaved: (c: PlatformConfig) => void }) {
  const { update, submitting, error } = useUpdateAiConfig();
  const { saved, flash } = useSavedFlash();
  const [creditLimit, setCreditLimit] = useState(String(config.aiConfig.monthlyCreditLimit));
  const [aiModel, setAiModel] = useState(config.aiConfig.aiModel);
  const [validationError, setValidationError] = useState('');

  // Re-seed local form state when the server value changes underneath us
  // (e.g. after a successful save) — adjusted during render rather than in
  // an effect, per React's guidance for "state that mirrors a prop".
  const [syncedAiConfig, setSyncedAiConfig] = useState(config.aiConfig);
  if (config.aiConfig !== syncedAiConfig) {
    setSyncedAiConfig(config.aiConfig);
    setCreditLimit(String(config.aiConfig.monthlyCreditLimit));
    setAiModel(config.aiConfig.aiModel);
  }

  async function save() {
    const limit = parseInt(creditLimit, 10);
    if (Number.isNaN(limit) || limit < 0) {
      setValidationError('Monthly credit limit must be a positive number.');
      return;
    }
    setValidationError('');
    const payload: Partial<AiConfig> = { monthlyCreditLimit: limit, aiModel };
    const ok = await update(payload);
    if (ok) { onSaved({ ...config, aiConfig: { ...config.aiConfig, ...payload } }); flash(); }
  }

  return (
    <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
      <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] mb-4">AI Configuration</p>
      <div className="flex flex-col gap-[14px]">
        <Input
          label="Monthly Credit Limit (per seller)"
          type="number"
          min={0}
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          error={validationError || undefined}
        />
        <Select label="AI Model" value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
          {AI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
        <div className="bg-brand-pale-orange rounded-lg px-3 py-[10px] text-[12px] text-brand-deep-orange">
          <p className="font-semibold mb-[3px]">Cost estimate</p>
          <p className="text-[#8c6050]">
            At {creditLimit || 0} credits/seller × active sellers, actual usage tracks against each seller's AI wallet.
          </p>
        </div>
        {error && <p className="text-[12px] text-error">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={submitting} size="sm" className="self-start">Save AI Config</Button>
          <SavedHint show={saved} />
        </div>
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

// ── Manual Bank Transfer (Pakistan track) card ────────────────────────────────
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
    if (!form.usdToPkrRate || form.usdToPkrRate <= 0) {
      setValidationError('USD → PKR rate must be a positive number.');
      return;
    }
    setValidationError('');
    const ok = await update(form);
    if (ok) { onSaved({ ...config, manualPaymentConfig: form }); flash(); }
  }

  return (
    <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Manual Bank Transfer</p>
          <p className="text-[11px] text-slate">Pakistan track — buyers transfer into your account and upload proof, reviewed here before an order is marked paid.</p>
        </div>
        <Toggle checked={form.enabled} onChange={(next) => setField('enabled', next)} />
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
        <Input
          label="USD → PKR Rate"
          type="number"
          min={1}
          value={String(form.usdToPkrRate)}
          onChange={(e) => setField('usdToPkrRate', Number(e.target.value) || 0)}
        />
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
          <MaintenanceCard config={config} onSaved={setConfig} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AiConfigCard config={config} onSaved={setConfig} />
            <EmailConfigCard config={config} onSaved={setConfig} />
          </div>
          <ManualPaymentConfigCard config={config} onSaved={setConfig} />
        </>
      ) : null}
      </div>
    </>
  );
}
