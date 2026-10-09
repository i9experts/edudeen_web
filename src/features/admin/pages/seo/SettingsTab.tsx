import { useState } from 'react';
import { Card } from '@/components/comman/ui/Card';
import { Button } from '@/components/comman/ui/Button';
import { Input, Textarea } from '@/components/comman/ui/Input';
import { Field } from '@/components/comman/ui/Field';
import { Toggle } from '@/components/comman/ui/Toggle';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { useSeoSettings, useUpdateSeoSettings } from '@/hooks/admin/seo/useSeoSettings';
import type { UpdatePlatformSeoSettingsPayload } from '@/api/services/seo/admin/settings.service';

export function SettingsTab() {
  const { data, loading, error, refetch } = useSeoSettings();
  const { updateSettings, submitting, error: saveError } = useUpdateSeoSettings();

  const [form, setForm] = useState<UpdatePlatformSeoSettingsPayload>({});
  const [initialized, setInitialized] = useState(false);

  if (data && !initialized) {
    setForm({
      homepageTitle: data.homepageTitle ?? '',
      homepageDescription: data.homepageDescription ?? '',
      marketplaceTitle: data.marketplaceTitle ?? '',
      marketplaceDescription: data.marketplaceDescription ?? '',
      robotsTxtBody: data.robotsTxtBody ?? '',
      aiSeoEnabled: data.aiSeoEnabled,
    });
    setInitialized(true);
  }

  if (error) return <AnalyticsErrorState message={error} onRetry={refetch} />;

  const handleSave = async () => {
    const ok = await updateSettings(form);
    if (ok) refetch();
  };

  if (loading) return <p className="text-[12px] text-slate">Loading settings…</p>;

  return (
    <div className="flex flex-col gap-5 max-w-[720px]">
      {saveError && <p className="text-[12px] text-error">{saveError}</p>}

      <Card>
        <p className="text-[13px] font-semibold text-carbon mb-3">Homepage Meta</p>
        <Field label="Homepage Title" className="mb-3">
          <Input value={form.homepageTitle ?? ''} onChange={e => setForm(f => ({ ...f, homepageTitle: e.target.value }))} />
        </Field>
        <Field label="Homepage Description">
          <Textarea rows={2} value={form.homepageDescription ?? ''} onChange={e => setForm(f => ({ ...f, homepageDescription: e.target.value }))} />
        </Field>
      </Card>

      <Card>
        <p className="text-[13px] font-semibold text-carbon mb-3">Marketplace Meta</p>
        <Field label="Marketplace Title" className="mb-3">
          <Input value={form.marketplaceTitle ?? ''} onChange={e => setForm(f => ({ ...f, marketplaceTitle: e.target.value }))} />
        </Field>
        <Field label="Marketplace Description">
          <Textarea rows={2} value={form.marketplaceDescription ?? ''} onChange={e => setForm(f => ({ ...f, marketplaceDescription: e.target.value }))} />
        </Field>
      </Card>

      <Card>
        <p className="text-[13px] font-semibold text-carbon mb-3">Robots.txt</p>
        <Textarea rows={6} value={form.robotsTxtBody ?? ''} onChange={e => setForm(f => ({ ...f, robotsTxtBody: e.target.value }))} className="font-mono text-[12px]" />
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-carbon">AI SEO — Platform Kill Switch</p>
            <p className="text-[12px] text-slate mt-[2px]">When disabled, sellers cannot generate AI SEO suggestions platform-wide.</p>
          </div>
          <Toggle label="AI SEO platform kill switch" checked={!!form.aiSeoEnabled} onChange={aiSeoEnabled => setForm(f => ({ ...f, aiSeoEnabled }))} />
        </div>
      </Card>

      <Button variant="primary" size="md" loading={submitting} onClick={handleSave} className="self-start">
        Save Settings
      </Button>
    </div>
  );
}
