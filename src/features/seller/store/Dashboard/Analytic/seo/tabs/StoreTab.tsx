import { useState } from 'react';
import { Card } from '@/components/comman/ui/Card';
import { Button } from '@/components/comman/ui/Button';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { SeoMetaForm, type SeoMetaFormValue } from '@/components/comman/seo';
import { useStoreSeo, useUpdateStoreSeo } from '@/hooks/seller/seo/useSeoDashboard';

interface StoreTabProps {
  storeId: string;
  storeSlug?: string;
}

export function StoreTab({ storeId, storeSlug }: StoreTabProps) {
  const { data, loading, error, refetch } = useStoreSeo(storeId);
  const { updateStoreSeo, submitting, error: saveError } = useUpdateStoreSeo();
  const [form, setForm] = useState<SeoMetaFormValue>({});
  const [initialized, setInitialized] = useState(false);

  if (data && !initialized) {
    setForm(data);
    setInitialized(true);
  }

  if (error) return <AnalyticsErrorState message={error} onRetry={refetch} />;

  const handleSave = async () => {
    const ok = await updateStoreSeo(storeId, form);
    if (ok) refetch();
  };

  return (
    <Card className="max-w-[640px]">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <p className="text-[15px] font-bold text-carbon">Store-level SEO</p>
        <Button variant="primary" size="sm" loading={submitting} onClick={handleSave}>Save Changes</Button>
      </div>
      {saveError && <p className="text-[12px] text-error mb-3">{saveError}</p>}
      <SeoMetaForm
        value={form}
        onChange={patch => setForm(f => ({ ...f, ...patch }))}
        loading={loading}
        previewUrl={storeSlug ? `https://edudeen.com/${storeSlug}` : undefined}
      />
    </Card>
  );
}
