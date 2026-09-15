import { useState } from 'react';
import { Card } from '@/components/comman/ui/Card';
import { Select, Input } from '@/components/comman/ui/Input';
import { Field } from '@/components/comman/ui/Field';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { SchemaPreview, SocialPreviewCard } from '@/components/comman/seo';
import { useSeoSchemaPreview, useSeoSocialPreview } from '@/hooks/seller/seo/useSeoPreview';
import type { SeoPreviewEntityType } from '@/api/services/seo/seller/preview.service';

interface PreviewsTabProps {
  storeId: string;
  storeSlug?: string;
}

export function PreviewsTab({ storeId, storeSlug }: PreviewsTabProps) {
  const [entityType, setEntityType] = useState<SeoPreviewEntityType>('store');
  const [entityId, setEntityId] = useState(storeId);

  const { data: schemaData, loading: schemaLoading, error: schemaError } = useSeoSchemaPreview(storeId, entityType, entityId);
  const { data: socialData, loading: socialLoading, error: socialError } = useSeoSocialPreview(storeId, entityType, entityId);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <p className="text-[13px] font-semibold text-carbon mb-3">Preview Target</p>
        <div className="flex gap-3 flex-wrap">
          <Field label="Entity Type" className="mb-0 w-[180px]">
            <Select value={entityType} onChange={e => setEntityType(e.target.value as SeoPreviewEntityType)}>
              <option value="store">Store</option>
              <option value="product">Product</option>
              <option value="category">Category</option>
            </Select>
          </Field>
          <Field label="Entity ID" className="mb-0 flex-1 min-w-[220px]">
            <Input value={entityId} onChange={e => setEntityId(e.target.value)} placeholder="Product or category ID" />
          </Field>
        </div>
        <p className="text-[11px] text-slate mt-2">
          Defaults to this store. Paste a product or category ID to preview that entity's schema and social cards.
        </p>
      </Card>

      {(schemaError || socialError) && <AnalyticsErrorState message={schemaError || socialError} />}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <SocialPreviewCard
          variant="facebook"
          ogTitle={socialData?.ogTitle}
          ogDescription={socialData?.ogDescription}
          ogImage={socialData?.ogImage}
          url={socialData?.url ?? (storeSlug ? `https://edudeen.com/${storeSlug}` : '')}
          loading={socialLoading}
        />
        <SocialPreviewCard
          variant="twitter"
          ogTitle={socialData?.ogTitle}
          ogDescription={socialData?.ogDescription}
          ogImage={socialData?.ogImage}
          url={socialData?.url ?? (storeSlug ? `https://edudeen.com/${storeSlug}` : '')}
          loading={socialLoading}
        />
      </div>

      <SchemaPreview jsonLd={schemaData?.jsonLd} loading={schemaLoading} />
    </div>
  );
}
