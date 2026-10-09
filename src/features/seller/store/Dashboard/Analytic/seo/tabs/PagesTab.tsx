import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/comman/ui/Card';
import { Button } from '@/components/comman/ui/Button';
import { Input, Select } from '@/components/comman/ui/Input';
import { Field } from '@/components/comman/ui/Field';
import { Toggle } from '@/components/comman/ui/Toggle';
import { apiListStorePages, apiUpdateStorePage, type StorePageData } from '@/api/services/storePages';

interface PagesTabProps {
  storeId: string;
}

// Reads/writes the REAL per-page `StorePage.seo` field (Store Builder's
// Pages tab), not the old `Store.seo.pages` map this tab used to read —
// that map was keyed against a fixed 3-item list ('home'/'about'/'contact')
// that never matched a store's actual pages (a seller's real custom pages,
// e.g. "Shipping Policy", simply had no SEO editor at all). Fixed as part of
// the Store Pages SEO-parity pass (see CLAUDE.md) alongside bringing
// `StorePage.seo` itself up to the full shared `SeoMeta` shape.
export function PagesTab({ storeId }: PagesTabProps) {
  const [pages, setPages] = useState<StorePageData[]>([]);
  const [pageId, setPageId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [noindex, setNoindex] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiListStorePages(storeId)
      .then(res => {
        setPages(res.data);
        setPageId(prev => prev || res.data.find(p => p.type === 'home')?._id || res.data[0]?._id || '');
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const page = pages.find(p => p._id === pageId);
    if (!page) return;
    setMetaTitle(page.seo.metaTitle ?? '');
    // `metaDescription` is the real field now — `metaDesc` only ever still
    // holds anything for a page saved before this parity fix shipped.
    setMetaDescription(page.seo.metaDescription ?? page.seo.metaDesc ?? '');
    setOgImage(page.seo.ogImage ?? '');
    setNoindex(!!page.seo.noindex);
  }, [pageId, pages]);

  const handleSave = async () => {
    if (!pageId) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await apiUpdateStorePage(storeId, pageId, { seo: { metaTitle, metaDescription, ogImage, noindex } });
      setPages(prev => prev.map(p => p._id === res.data._id ? res.data : p));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update page SEO.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-[640px]">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <p className="text-[15px] font-bold text-carbon">Pages SEO</p>
        <Button variant="primary" size="sm" loading={submitting} disabled={!pageId} onClick={handleSave}>Save Changes</Button>
      </div>
      {error && <p className="text-[12px] text-error mb-3">{error}</p>}

      <Field label="Page" className="mb-4">
        <Select value={pageId} onChange={e => setPageId(e.target.value)} disabled={loading || pages.length === 0}>
          {pages.map(p => <option key={p._id} value={p._id}>{p.type === 'home' ? 'Home' : p.title}</option>)}
        </Select>
      </Field>

      {loading ? (
        <p className="text-[12px] text-slate">Loading page meta…</p>
      ) : pages.length === 0 ? (
        <p className="text-[12px] text-slate">No pages yet — create one in Store Builder's Pages tab first.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Meta Title">
            <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} />
          </Field>
          <Field label="Meta Description">
            <Input value={metaDescription} onChange={e => setMetaDescription(e.target.value)} />
          </Field>
          <Field label="OG Image URL">
            <Input value={ogImage} onChange={e => setOgImage(e.target.value)} />
          </Field>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-carbon">No-index this page</p>
            <Toggle label="No-index this page" checked={noindex} onChange={setNoindex} />
          </div>
        </div>
      )}
    </Card>
  );
}
