import { useState } from 'react';
import { Download, Wand2 } from 'lucide-react';
import { Card } from '@/components/comman/ui/Card';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Input } from '@/components/comman/ui/Input';
import { Table, type TableColumn } from '@/components/comman/ui/Table';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ScoreBadge, SeoMetaForm, type SeoMetaFormValue } from '@/components/comman/seo';
import { useSeoProducts, useSeoProduct, useUpdateSeoProduct, useSeoProductBulkActions } from '@/hooks/seller/seo/useSeoProducts';
import type { SeoProductListItem } from '@/api/services/seo/seller/products.service';

interface ProductsTabProps {
  storeId: string;
  storeSlug?: string;
}

export function ProductsTab({ storeId, storeSlug }: ProductsTabProps) {
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [titleTemplate, setTitleTemplate] = useState('{{productName}} | ' + (storeSlug ?? 'My Store'));
  const [descriptionTemplate, setDescriptionTemplate] = useState('');

  const { data, loading, error, refetch } = useSeoProducts(storeId, { page, limit: 20 });
  const { bulkApplyTemplate, exportCsv, submitting: bulkSubmitting } = useSeoProductBulkActions();

  if (error) return <AnalyticsErrorState message={error} onRetry={refetch} />;

  const columns: TableColumn<SeoProductListItem>[] = [
    { key: 'name', header: 'Product', render: r => <span className="font-medium">{r.name}</span> },
    { key: 'metaTitle', header: 'Meta Title', render: r => <span className="text-slate truncate block max-w-[220px]">{r.seo?.metaTitle || '—'}</span> },
    { key: 'completeness', header: 'Completeness', align: 'right', render: r => <ScoreBadge score={r.completeness} /> },
    {
      key: 'actions', header: '', align: 'right',
      render: r => <Button variant="outline" size="xs" onClick={() => setEditingId(r._id)}>Edit</Button>,
    },
  ];

  const handleBulkApply = async () => {
    const result = await bulkApplyTemplate(storeId, { titleTemplate, descriptionTemplate: descriptionTemplate || undefined });
    if (result) {
      setBulkOpen(false);
      refetch();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <Button variant="outline" size="sm" icon={<Download size={13} />} loading={bulkSubmitting} onClick={() => exportCsv(storeId)}>
          Export CSV
        </Button>
        <Button variant="secondary" size="sm" icon={<Wand2 size={13} />} onClick={() => setBulkOpen(true)}>
          Bulk Apply Template
        </Button>
      </div>

      <Card padding="none">
        <Table
          columns={columns}
          data={data?.items ?? []}
          keyExtractor={r => r._id}
          pagination={data ? {
            page: data.pagination.page,
            total: data.pagination.total,
            perPage: data.pagination.limit,
            onChange: setPage,
            label: 'products',
          } : undefined}
        />
        {loading && <div className="px-5 py-6 text-center text-[12px] text-slate">Loading products…</div>}
        {!loading && (data?.items ?? []).length === 0 && (
          <div className="px-5 py-10 text-center text-[12px] text-slate">No products found.</div>
        )}
      </Card>

      {editingId && (
        <ProductSeoEditModal storeId={storeId} productId={editingId} storeSlug={storeSlug} onClose={() => setEditingId(null)} onSaved={refetch} />
      )}

      {bulkOpen && (
        <Modal
          title="Bulk Apply SEO Template"
          onClose={() => setBulkOpen(false)}
          mobileSheet
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setBulkOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" loading={bulkSubmitting} onClick={handleBulkApply}>Apply to All Products</Button>
            </>
          }
        >
          <p className="text-[12px] text-slate mb-3 leading-[1.6]">
            Use <code className="bg-cream px-1 rounded">{'{{productName}}'}</code> as a placeholder for each product's name.
          </p>
          <Input label="Title Template" value={titleTemplate} onChange={e => setTitleTemplate(e.target.value)} className="mb-3" />
          <Input label="Description Template (optional)" value={descriptionTemplate} onChange={e => setDescriptionTemplate(e.target.value)} />
        </Modal>
      )}
    </div>
  );
}

function ProductSeoEditModal({ storeId, productId, storeSlug, onClose, onSaved }: {
  storeId: string; productId: string; storeSlug?: string; onClose: () => void; onSaved: () => void;
}) {
  const { data, loading } = useSeoProduct(storeId, productId);
  const { updateProduct, submitting, error } = useUpdateSeoProduct();
  const [form, setForm] = useState<SeoMetaFormValue>({});
  const [initialized, setInitialized] = useState(false);

  if (data && !initialized) {
    setForm(data);
    setInitialized(true);
  }

  const handleSave = async () => {
    const ok = await updateProduct(storeId, productId, form);
    if (ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal
      title="Edit Product SEO"
      onClose={onClose}
      width={560}
      mobileSheet
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" loading={submitting} onClick={handleSave}>Save Changes</Button>
        </>
      }
    >
      {error && <p className="text-[12px] text-error mb-3">{error}</p>}
      <SeoMetaForm
        value={form}
        onChange={patch => setForm(f => ({ ...f, ...patch }))}
        loading={loading}
        previewUrl={storeSlug ? `https://edudeen.com/${storeSlug}` : undefined}
      />
    </Modal>
  );
}
