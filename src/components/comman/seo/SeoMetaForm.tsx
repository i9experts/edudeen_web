import { useState } from 'react';
import { clsx } from 'clsx';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Input, Textarea, Select } from '@/components/comman/ui/Input';
import { TagInput } from '@/components/comman/ui/TagInput';
import { Toggle } from '@/components/comman/ui/Toggle';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';

export interface SeoMetaFormValue {
  metaTitle?:            string;
  metaDescription?:      string;
  ogImage?:              string;
  ogTitle?:              string;
  ogDescription?:        string;
  twitterCard?:          'summary' | 'summary_large_image';
  canonicalUrlOverride?: string;
  noindex?:              boolean;
  keywords?:             string[];
}

interface SeoMetaFormProps {
  value:       SeoMetaFormValue;
  onChange:    (patch: Partial<SeoMetaFormValue>) => void;
  previewUrl?: string;
  disabled?:   boolean;
  loading?:    boolean;
  className?:  string;
}

function counterTone(len: number, warn: number, max: number): string {
  if (len === 0) return 'text-slate';
  if (len <= warn) return 'text-success';
  if (len <= max) return 'text-warning';
  return 'text-error';
}

export function SeoMetaForm({ value, onChange, previewUrl, disabled, loading, className }: SeoMetaFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  if (loading) {
    return (
      <div className={clsx('flex flex-col gap-4', className)}>
        <SkeletonBox height={38} width="100%" rounded="8px" />
        <SkeletonBox height={80} width="100%" rounded="8px" />
        <SkeletonBox height={38} width="100%" rounded="8px" />
      </div>
    );
  }

  const titleLen = value.metaTitle?.length ?? 0;
  const descLen  = value.metaDescription?.length ?? 0;

  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      {previewUrl && (value.metaTitle || value.metaDescription) && (
        <div className="bg-cream border border-bone rounded-lg px-4 py-3">
          <p className="text-[11px] font-medium text-slate uppercase tracking-[0.05em] mb-2">Search Preview</p>
          <p className="text-[15px] font-medium text-info leading-[1.4] mb-[3px] truncate">
            {value.metaTitle || 'Untitled page'}
          </p>
          <p className="text-xs text-success mb-[5px] truncate">{previewUrl}</p>
          <p className="text-xs text-slate leading-[1.6] line-clamp-2">
            {value.metaDescription || 'No meta description set.'}
          </p>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-[5px]">
          <label className="text-xs font-medium text-graphite">Meta Title</label>
          <span className={clsx('text-[11px] font-medium flex items-center gap-[3px]', counterTone(titleLen, 60, 70))}>
            {titleLen > 0 && titleLen <= 60 && <Check size={11} />}
            {titleLen}/60 chars
          </span>
        </div>
        <Input
          value={value.metaTitle ?? ''}
          disabled={disabled}
          onChange={e => onChange({ metaTitle: e.target.value })}
          placeholder="Enter a descriptive, keyword-rich title"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-[5px]">
          <label className="text-xs font-medium text-graphite">Meta Description</label>
          <span className={clsx('text-[11px] font-medium flex items-center gap-[3px]', counterTone(descLen, 160, 180))}>
            {descLen > 0 && descLen <= 160 && <Check size={11} />}
            {descLen}/160 chars
          </span>
        </div>
        <Textarea
          rows={3}
          value={value.metaDescription ?? ''}
          disabled={disabled}
          onChange={e => onChange({ metaDescription: e.target.value })}
          placeholder="Summarize the page in a way that encourages clicks from search results"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-graphite mb-[5px] block">Focus Keywords</label>
        <TagInput
          tags={value.keywords ?? []}
          onChange={keywords => onChange({ keywords })}
          placeholder="Add keyword, press Enter"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-graphite mb-[5px] block">OG Image URL</label>
        <div className="flex items-center gap-3">
          <Input
            value={value.ogImage ?? ''}
            disabled={disabled}
            onChange={e => onChange({ ogImage: e.target.value })}
            placeholder="https://…"
            className="flex-1"
          />
          {value.ogImage && (
            <img
              src={value.ogImage}
              alt=""
              className="w-10 h-10 rounded-md object-cover border border-bone shrink-0"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-graphite mb-[5px] block">Canonical URL Override</label>
        <Input
          value={value.canonicalUrlOverride ?? ''}
          disabled={disabled}
          onChange={e => onChange({ canonicalUrlOverride: e.target.value })}
          placeholder="Leave blank to use the default canonical URL"
        />
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen(o => !o)}
        className="flex items-center gap-1 text-xs font-medium text-graphite hover:text-carbon self-start cursor-pointer bg-transparent border-0 p-0"
      >
        {advancedOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Advanced Open Graph &amp; Twitter
      </button>

      {advancedOpen && (
        <div className="flex flex-col gap-4 ps-1 border-s-2 border-bone ms-1">
          <div className="ps-3">
            <label className="text-xs font-medium text-graphite mb-[5px] block">OG Title</label>
            <Input
              value={value.ogTitle ?? ''}
              disabled={disabled}
              onChange={e => onChange({ ogTitle: e.target.value })}
              placeholder="Falls back to Meta Title if left blank"
            />
          </div>
          <div className="ps-3">
            <label className="text-xs font-medium text-graphite mb-[5px] block">OG Description</label>
            <Textarea
              rows={2}
              value={value.ogDescription ?? ''}
              disabled={disabled}
              onChange={e => onChange({ ogDescription: e.target.value })}
              placeholder="Falls back to Meta Description if left blank"
            />
          </div>
          <div className="ps-3">
            <label className="text-xs font-medium text-graphite mb-[5px] block">Twitter Card Type</label>
            <Select
              value={value.twitterCard ?? 'summary_large_image'}
              disabled={disabled}
              onChange={e => onChange({ twitterCard: e.target.value as 'summary' | 'summary_large_image' })}
            >
              <option value="summary">Summary</option>
              <option value="summary_large_image">Summary with Large Image</option>
            </Select>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-bone">
        <div>
          <p className="text-[13px] font-medium text-carbon">No-index this page</p>
          <p className="text-[11px] text-slate mt-[2px]">
            {value.noindex ? 'This page will be excluded from search results.' : 'This page is discoverable by search engines.'}
          </p>
        </div>
        <Toggle checked={!!value.noindex} onChange={noindex => onChange({ noindex })} disabled={disabled} />
      </div>
    </div>
  );
}
