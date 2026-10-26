import { FieldErrorsContext } from './fieldErrorsContext';
import { useState, useEffect, useContext, isValidElement, cloneElement, type ReactNode } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import type { VariantOption, EducationLevel } from '@/api/services/product';
import type { PrivateUploadData } from '@/components/comman/ui';
import type { LicenseTierValue } from '@/features/seller/components/products/LearningFields';

/** Shared building blocks of the seller Add / Edit product forms (fields, section card, tag + variant inputs). */

export const inp = 'w-full px-3 py-[10px] text-[14px] border border-bone rounded-lg text-carbon bg-white placeholder:text-[#9aa6ad] outline-none focus:border-brand-royal focus:ring-2 focus:ring-brand-royal/15 transition-[border-color,box-shadow]';
export const ta  = `${inp} resize-y min-h-[110px]`;

export type ProductType = 'physical' | 'digital' | 'educational';
export type ProductStatus = 'draft' | 'active' | 'scheduled';
export type LicenseType = 'personal' | 'single_classroom' | 'school' | 'commercial';
export interface PhysForm {
  name: string; description: string; price: string; compareAtPrice: string;
  stock: string; options: VariantOption[]; shippingWeight: string; subCategoryId: string;
  status: ProductStatus; isListedOnEdudeen: boolean;
  scheduledAt: string; tagInput: string; tags: string[]; images: string[];
}
export interface DigForm {
  name: string; description: string; price: string; compareAtPrice: string; subCategoryId: string;
  status: ProductStatus; isListedOnEdudeen: boolean;
  scheduledAt: string; tagInput: string; tags: string[]; images: string[];
  files: PrivateUploadData[]; sampleFile: PrivateUploadData | null; tiers: LicenseTierValue[];
  downloadLimit: string; linkExpiryDays: string; pdfStampingEnabled: boolean; licenseType: LicenseType;
  buyerDeliveryMessage: string; educationLevel: EducationLevel | ''; customLevel: string; previewEnabled: boolean;
}
export const isDigitalFamilyType = (t: ProductType) => t === 'digital' || t === 'educational';

export function L({ children, req, htmlFor }: { children: ReactNode; req?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-bold text-carbon flex items-center gap-1.5 mb-1.5">
      {children}
      {req
        ? <><span aria-hidden className="text-error -ms-0.5">*</span><span className="text-[12px] font-bold text-brand-orange bg-brand-pale-orange rounded-full px-1.5 py-px leading-4">Required</span></>
        : <span className="text-[12px] font-normal text-slate">(optional)</span>}
    </label>
  );
}


export function F({ label, req, hint, htmlFor, children }: { label: string; req?: boolean; hint?: string; htmlFor?: string; children: ReactNode }) {
  const errors = useContext(FieldErrorsContext);
  const error = htmlFor ? errors[htmlFor] : undefined;
  const errId = htmlFor ? `${htmlFor}-err` : undefined;
  // wire a11y attributes onto the control this label points to
  const control = htmlFor && isValidElement<Record<string, unknown>>(children) && children.props.id === htmlFor
    ? cloneElement(children, {
        'aria-required': req || undefined,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errId : undefined,
        ...(error && typeof children.type === 'string'
          ? { className: `${String(children.props.className ?? '')} !border-error focus:!ring-error/20` }
          : {}),
      })
    : children;
  return (
    <div>
      <L req={req} htmlFor={htmlFor}>{label}</L>
      {control}
      {error && <p id={errId} role="alert" className="text-[12px] text-error mt-1.5">{error}</p>}
      {hint && <p className="text-[12px] text-slate mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

export type StepNeed = 'required' | 'optional' | 'recommended';
const NEED_STYLE: Record<StepNeed, string> = {
  required:    'bg-brand-pale-orange text-brand-orange',
  recommended: 'bg-[#eaf3e3] text-[#3b6720]',
  optional:    'bg-mist text-slate',
};

/** A titled block inside a step: serif heading, optional required/optional tag and a one-line hint. `id` lets issue links scroll to it. */
export function Block({ title, need, hint, id, children }: { title: string; need?: StepNeed; hint?: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="bg-white border border-bone rounded-xl px-5 py-5 sm:px-[27px] sm:py-[24px] scroll-mt-32">
      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-tight">{title}</h2>
          {need && <span className={`text-[12px] font-bold uppercase tracking-[0.08em] px-2 py-[2px] rounded-full ${NEED_STYLE[need]}`}>{need}</span>}
        </div>
        {hint && <p className="text-[13px] text-slate mt-1 leading-relaxed">{hint}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

/**
 * Collapsed "More options" block for optional / advanced fields. The content stays MOUNTED while collapsed (hidden, not removed)
 * so nothing typed there is lost. Never put a required field in here.
 */
export function MoreOptions({ title = 'More options', hint, children, defaultOpen = false }: { title?: string; hint?: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  // Content that arrives after mount (an edited product's saved tags) opens the section instead of hiding it.
  useEffect(() => { if (defaultOpen) setOpen(true); }, [defaultOpen]);
  return (
    <div className="border border-bone rounded-xl bg-white">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 bg-transparent border-none cursor-pointer text-start">
        <span className="min-w-0">
          <span className="block text-[14px] font-bold text-carbon">{title} <span className="text-[12px] font-normal text-slate">(optional)</span></span>
          {hint && <span className="block text-[12px] text-slate mt-0.5">{hint}</span>}
        </span>
        <ChevronDown size={18} className={`text-slate shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div hidden={!open} className="px-5 pb-5 pt-1 border-t border-bone">
        <div className="flex flex-col gap-4 pt-4">{children}</div>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      role="switch" aria-checked={checked} aria-label={label}
      className="w-10 h-[22px] rounded-[11px] border-none cursor-pointer p-0 relative shrink-0 transition-colors duration-[180ms] before:content-[''] before:absolute before:-inset-y-[10px] before:-inset-x-1"
      style={{ background: checked ? '#174771' : '#C5D2DB' }}>
      <span className="absolute top-[3px] w-4 h-4 rounded-full bg-white border border-charcoal/10 transition-[left] duration-[180ms]"
        style={{ left: checked ? 21 : 3 }} />
    </button>
  );
}

/** Tags plus whatever is still typed in the tag box (comma separated), so a tag the seller typed but didn't confirm isn't lost on save. */
export function withPendingTags(tags: string[], pending: string): string[] {
  const extra = pending.split(',').map(s => s.trim()).filter(Boolean).filter(t => !tags.includes(t));
  return [...tags, ...extra].slice(0, 30);
}

export function TagInput({ tags, input, onInput, onAdd, onRemove }: {
  tags: string[]; input: string;
  onInput: (v: string) => void; onAdd: () => void; onRemove: (i: number) => void;
}) {
  return (
    <div className="border border-bone rounded-lg px-[10px] py-[7px] flex flex-wrap gap-[6px] bg-white min-h-[42px]">
      {tags.map((t, i) => (
        <span key={i} className="bg-brand-pale-orange text-brand-orange border border-brand-orange/20 rounded-[6px] px-2 py-[2px] text-[12px] font-medium flex items-center gap-1">
          {t}
          <button type="button" onClick={() => onRemove(i)} aria-label={`Remove tag ${t}`} data-compact className="bg-transparent border-none cursor-pointer px-1.5 py-1 -my-1 -me-1 text-brand-orange/50 text-[14px] leading-none hover:text-brand-orange">×</button>
        </span>
      ))}
      <input value={input} onChange={e => onInput(e.target.value)} aria-label="Add a tag"
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); onAdd(); } }}
        onBlur={() => { if (input.trim()) onAdd(); }}
        placeholder={tags.length === 0 ? 'Type a tag and press Enter…' : ''}
        className="border-none outline-none text-[12px] flex-[1_1_80px] min-w-[80px] bg-transparent text-charcoal placeholder:text-[#b5b3ac]"
      />
    </div>
  );
}

const MAX_VARIANT_OPTIONS = 3;

/** Seller-defined variant attributes (Color, Size, Material…), up to 3 — same rules the variant API accepts. */
export function VariantOptionsField({ options, onChange }: { options: VariantOption[]; onChange: (next: VariantOption[]) => void }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');

  function add() {
    if (!name.trim() || !value.trim() || options.length >= MAX_VARIANT_OPTIONS) return;
    onChange([...options, { name: name.trim(), value: value.trim() }]);
    setName(''); setValue('');
  }
  const canAdd = !!name.trim() && !!value.trim();

  return (
    <div className="flex flex-col gap-2">
      {options.length > 0 && (
        <div className="flex flex-col gap-[6px]">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2 bg-brand-pale-orange border border-brand-orange/20 rounded-lg ps-3 pe-2 py-[7px]">
              <span className="flex-1 min-w-0 text-[12px] text-charcoal truncate">
                <span className="font-semibold text-brand-deep-orange">{o.name}</span>
                <span className="text-brand-orange/40 mx-[6px]">/</span>
                {o.value}
              </span>
              <button type="button" onClick={() => onChange(options.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${o.name} ${o.value}`}
                className="bg-transparent border-none cursor-pointer p-1 rounded-md text-brand-orange/50 shrink-0 flex items-center hover:text-brand-orange hover:bg-white/70 transition-colors">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      {options.length < MAX_VARIANT_OPTIONS && (
        <div className="flex flex-col gap-[7px] p-2.5 rounded-lg border border-dashed border-[#d9d6cc] bg-cream/50">
          <div className="grid grid-cols-2 gap-[7px]">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Attribute (e.g. Edition)" aria-label="Variant attribute name"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              className={`${inp} px-2.5 py-[7px] min-h-[40px] text-[12px] bg-white`} />
            <input value={value} onChange={e => setValue(e.target.value)} placeholder="Value (e.g. Hardcover)" aria-label="Variant attribute value"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              className={`${inp} px-2.5 py-[7px] min-h-[40px] text-[12px] bg-white`} />
          </div>
          <button type="button" onClick={add} disabled={!canAdd}
            className="flex items-center justify-center gap-1.5 py-[7px] min-h-[40px] rounded-md border-none text-[12px] font-semibold transition-colors"
            style={{ background: canAdd ? '#174771' : '#E8E6DC', color: canAdd ? '#fff' : '#A8A6A0', cursor: canAdd ? 'pointer' : 'not-allowed' }}>
            <Plus size={13} /> Add Attribute
          </button>
        </div>
      )}
      <p className="text-[12px] text-slate">Optional — leave empty for a single plain variant, or add up to 3 like Edition, Format, Language.</p>
    </div>
  );
}

/** Find a category (any depth) by id, for the review summary. */
export function findCategoryName(nodes: { _id: string; name: string; children?: unknown[] }[] | undefined, id: string): string {
  for (const n of nodes ?? []) {
    if (n._id === id) return n.name;
    const sub = findCategoryName(n.children as { _id: string; name: string; children?: unknown[] }[] | undefined, id);
    if (sub) return sub;
  }
  return '';
}
