import { useState } from 'react';
import { Modal, Button, FileDropSelect } from '@/components/comman/ui';
import { upscaleToMinWidth } from '@/utils/imageUpscale';
import { apiCreateStoreBanner, STORE_BANNER_TYPES, STORE_BANNER_LINK_TYPES, type StoreBanner, type StoreBannerType, type StoreBannerLinkType } from '@/api/services/storeBanner';

export const BANNER_TYPE_LABEL: Record<StoreBannerType, string> = {
  hero: 'Hero', promotion: 'Promotion', season: 'Season', collection: 'Collection', video: 'Video',
};

export const BANNER_STATUS_STYLE: Record<StoreBanner['status'], { bg: string; color: string; label: string }> = {
  active:    { bg: '#EAF7EF', color: '#1E7A3C', label: 'Active' },
  scheduled: { bg: '#EAF1FB', color: '#1D5EAE', label: 'Scheduled' },
  paused:    { bg: '#FDF3E7', color: '#9A6A17', label: 'Paused' },
  expired:   { bg: '#F0EEE6', color: '#5A5852', label: 'Expired' },
  draft:     { bg: '#F0EEE6', color: '#5A5852', label: 'Draft' },
};

export const emptyBannerForm = {
  type: 'hero' as StoreBannerType,
  ctaLabel: '',
  linkType: 'external' as StoreBannerLinkType,
  linkTarget: '',
  startAt: '',
  endAt: '',
};

// ── Store Banner create modal ──────────────────────────────────────────────────
export function StoreBannerFormModal({ storeId, onClose, onSaved }: { storeId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(emptyBannerForm);
  const [file, setFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!file) { setError('Please choose a banner image.'); return; }
    setError('');
    setSaving(true);
    try {
      await apiCreateStoreBanner(storeId, {
        type: form.type,
        ctaLabel: form.ctaLabel || undefined,
        linkType: form.linkType,
        linkTarget: form.linkTarget || undefined,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
      }, file, mobileFile ?? undefined);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create store banner.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add Store Banner"
      onClose={onClose}
      mobileSheet
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Add Banner</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Desktop Image</label>
          <FileDropSelect value={file} onChange={f => { if (f) void upscaleToMinWidth(f).then(setFile); else setFile(null); }} label="Click to upload desktop banner" />
          <p className="mt-1.5 text-[12px] text-slate/70">
            Recommended: 2560×720px. Smaller pictures are enlarged automatically (they may look a little soft).
          </p>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Mobile Image (optional)</label>
          <FileDropSelect value={mobileFile} onChange={setMobileFile} label="Click to upload mobile banner" />
          <p className="mt-1.5 text-[12px] text-slate/70">Recommended: 1440×600px (minimum 640px wide).</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as StoreBannerType }))}
              className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
              {STORE_BANNER_TYPES.map(t => <option key={t} value={t}>{BANNER_TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Link Type</label>
            <select value={form.linkType} onChange={e => setForm(f => ({ ...f, linkType: e.target.value as StoreBannerLinkType }))}
              className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
              {STORE_BANNER_LINK_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">CTA Label (optional)</label>
            <input value={form.ctaLabel} onChange={e => setForm(f => ({ ...f, ctaLabel: e.target.value }))} placeholder="Shop Now"
              className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] outline-none transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Link Target</label>
            <input value={form.linkTarget} onChange={e => setForm(f => ({ ...f, linkTarget: e.target.value }))}
              placeholder={form.linkType === 'external' ? 'https://…' : 'Product/category/collection id'}
              className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] outline-none transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Starts (optional)</label>
            <input type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] outline-none transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Ends (optional)</label>
            <input type="datetime-local" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] outline-none transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50" />
          </div>
        </div>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}
