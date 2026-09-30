import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, GraduationCap, Loader2, CalendarClock, Plus, X, Check, Truck, FileDown } from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { apiCreatePhysicalProduct, apiCreateDigitalProduct, EDUCATION_LEVELS, type EducationLevel, type VariantOption } from '@/api/services/product';
import { apiSetProductAttributes } from '@/api/services/attributes';
import { addCachedProduct } from './_cache';
import { SubcategoryField } from './SubcategoryField';
import { CustomLevelInput } from './CustomLevelInput';
import { DynamicAttributeFields } from './DynamicAttributeFields';
import { toAttributeInputs, findMissingRequiredAttribute, type AttributeValuesState } from './attributeFormUtils';
import { useStoreSubcategories } from '@/hooks/store/useStoreSubcategories';
import { useCategoryAttributes } from '@/hooks/marketplace/useCategoryAttributes';
import { ImageUpload, FileUpload, type PrivateUploadData, DateTimePickerModal } from '@/components/comman/ui';
import { currencySymbol as symbolForCurrency } from '@/utils/currency';

type ProductType   = 'physical' | 'digital' | 'educational';
type ProductStatus = 'draft' | 'active' | 'scheduled';
type LicenseType   = 'personal' | 'single_classroom' | 'school' | 'commercial';

const inp = 'w-full px-3 py-[10px] text-[14px] border border-bone rounded-lg text-carbon bg-white placeholder:text-[#9aa6ad] outline-none focus:border-brand-royal focus:ring-2 focus:ring-brand-royal/15 transition-[border-color,box-shadow]';
const ta  = `${inp} resize-y min-h-[110px]`;

function L({ children, req, htmlFor }: { children: ReactNode; req?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-bold text-carbon block mb-1.5">
      {children}
      {req
        ? <span className="text-error ml-0.5" aria-hidden="true">*</span>
        : <span className="text-[12px] font-normal text-slate ml-1.5">(optional)</span>}
      {req && <span className="sr-only"> (required)</span>}
    </label>
  );
}
function F({ label, req, hint, htmlFor, children }: { label: string; req?: boolean; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <L req={req} htmlFor={htmlFor}>{label}</L>
      {children}
      {hint && <p className="text-[12px] text-slate mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}
type StepNeed = 'required' | 'optional' | 'recommended';
const NEED_STYLE: Record<StepNeed, string> = {
  required:    'bg-brand-pale-orange text-brand-orange',
  recommended: 'bg-[#eaf3e3] text-[#3b6720]',
  optional:    'bg-mist text-slate',
};
/** Numbered studio step: "01" badge, serif heading, required/optional tag and a one-line hint. */
function Card({ title, step, need, hint, children }: { title: string; step?: number; need?: StepNeed; hint?: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-bone rounded-xl px-5 py-5 sm:px-[27px] sm:py-[24px]">
      <div className="flex items-start gap-3 mb-4">
        {step != null && (
          <span className="size-8 rounded-full border border-bone text-[12px] font-bold text-brand-royal flex items-center justify-center shrink-0 mt-[1px]">
            {String(step).padStart(2, '0')}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-tight">{title}</h2>
            {need && (
              <span className={`text-[11px] font-bold uppercase tracking-[0.08em] px-2 py-[2px] rounded-full ${NEED_STYLE[need]}`}>{need}</span>
            )}
          </div>
          {hint && <p className="text-[13px] text-slate mt-1 leading-relaxed">{hint}</p>}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      role="switch" aria-checked={checked} aria-label={label}
      className="w-10 h-[22px] rounded-[11px] border-none cursor-pointer p-0 relative shrink-0 transition-colors duration-[180ms]"
      style={{ background: checked ? '#174771' : '#C5D2DB' }}>
      <span className="absolute top-[3px] w-4 h-4 rounded-full bg-white border border-charcoal/10 transition-[left] duration-[180ms]"
        style={{ left: checked ? 21 : 3 }} />
    </button>
  );
}
function TagInput({ tags, input, onInput, onAdd, onRemove }: {
  tags: string[]; input: string;
  onInput: (v: string) => void; onAdd: () => void; onRemove: (i: number) => void;
}) {
  return (
    <div className="border border-bone rounded-lg px-[10px] py-[7px] flex flex-wrap gap-[6px] bg-white min-h-[42px]">
      {tags.map((t, i) => (
        <span key={i} className="bg-brand-pale-orange text-brand-orange border border-brand-orange/20 rounded-[6px] px-2 py-[2px] text-[12px] font-medium flex items-center gap-1">
          {t}
          <button type="button" onClick={() => onRemove(i)} className="bg-transparent border-none cursor-pointer p-0 text-brand-orange/50 text-[14px] leading-none hover:text-brand-orange">×</button>
        </span>
      ))}
      <input value={input} onChange={e => onInput(e.target.value)} aria-label="Add a tag"
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); onAdd(); } }}
        placeholder={tags.length === 0 ? 'Type a tag and press Enter…' : ''}
        className="border-none outline-none text-[12px] flex-[1_1_80px] min-w-[80px] bg-transparent text-charcoal placeholder:text-[#b5b3ac]"
      />
    </div>
  );
}

const MAX_VARIANT_OPTIONS = 3;

// ── Variant attributes builder — replaces the old fixed Size/Color inputs with
// any combination of seller-defined attributes (Color, Size, Material…), up to
// 3, matching what the variant-CRUD backend now accepts. ─────────────────────
function VariantOptionsField({ options, onChange }: { options: VariantOption[]; onChange: (next: VariantOption[]) => void }) {
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
            <div key={i} className="flex items-center gap-2 bg-brand-pale-orange border border-brand-orange/20 rounded-lg pl-3 pr-2 py-[7px]">
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
              className={`${inp} px-2.5 py-[7px] text-[12px] bg-white`} />
            <input value={value} onChange={e => setValue(e.target.value)} placeholder="Value (e.g. Hardcover)" aria-label="Variant attribute value"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              className={`${inp} px-2.5 py-[7px] text-[12px] bg-white`} />
          </div>
          <button type="button" onClick={add} disabled={!canAdd}
            className="flex items-center justify-center gap-1.5 py-[7px] rounded-md border-none text-[12px] font-semibold transition-colors"
            style={{ background: canAdd ? '#174771' : '#E8E6DC', color: canAdd ? '#fff' : '#A8A6A0', cursor: canAdd ? 'pointer' : 'not-allowed' }}>
            <Plus size={13} /> Add Attribute
          </button>
        </div>
      )}
      <p className="text-[11px] text-slate">Optional — leave empty for a single plain variant, or add up to 3 like Edition, Format, Language.</p>
    </div>
  );
}

const initPhys = {
  name: '', description: '', price: '', compareAtPrice: '',
  stock: '', options: [] as VariantOption[], shippingWeight: '', subCategoryId: '',
  // Sensible default: the primary button publishes; "Save as draft" is always one click away.
  status: 'active' as ProductStatus, isListedOnEdudeen: true,
  scheduledAt: '', tagInput: '', tags: [] as string[], images: [] as string[],
};
const initDig = {
  name: '', description: '', price: '', compareAtPrice: '', subCategoryId: '',
  status: 'active' as ProductStatus, isListedOnEdudeen: true,
  scheduledAt: '', tagInput: '', tags: [] as string[], images: [] as string[],
  fileData: null as PrivateUploadData | null,
  downloadLimit: 'unlimited', linkExpiryDays: '',
  pdfStampingEnabled: false, licenseType: 'personal' as LicenseType,
  buyerDeliveryMessage: '', educationLevel: '' as EducationLevel | '', customLevel: '',
  previewEnabled: false,
};
type PhysForm = typeof initPhys;
type DigForm  = typeof initDig;

export default function StoreAddProduct() {
  const navigate           = useNavigate();
  const { storeId, store } = useStoreWorkspace();
  // Every price on this form is in the STORE's own currency (locked at
  // onboarding, see OnboardingPage's currency selector) — never assume PKR.
  // Uses the shared currencySymbol() util (supports every SupportedCurrency,
  // not just a PKR/USD ternary that mislabeled any other currency as "Rs").
  const currencySymbol = symbolForCurrency(store?.baseCurrency);

  const supportsPhysical    = !store || (store.productTypes ?? []).includes('physical_products');
  const supportsDigital     = !store || (store.productTypes ?? []).includes('digital_downloads');
  const supportsEducational = !store || (store.productTypes ?? []).includes('educational_resources');

  const { mainCategory, subcategories, loading: catLoading, refetch: refetchCats } = useStoreSubcategories(store?.categoryId);

  const [pType,             setPType]             = useState<ProductType>('physical');
  const [saving,            setSaving]            = useState(false);
  const [error,             setError]             = useState('');
  const [phys,              setPhys]              = useState<PhysForm>(initPhys);
  const [dig,               setDig]               = useState<DigForm>(initDig);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [attributeValues,   setAttributeValues]   = useState<AttributeValuesState>({});

  // Once the store loads, never leave the form on a type this store can't sell.
  useEffect(() => {
    if (!store) return;
    const ok = pType === 'physical' ? supportsPhysical : pType === 'digital' ? supportsDigital : supportsEducational;
    if (ok) return;
    if (supportsPhysical) setPType('physical');
    else if (supportsDigital) setPType('digital');
    else if (supportsEducational) setPType('educational');
  }, [store, pType, supportsPhysical, supportsDigital, supportsEducational]);

  const sp = <K extends keyof PhysForm>(k: K, v: PhysForm[K]) => setPhys(f => ({ ...f, [k]: v }));
  const sd = <K extends keyof DigForm> (k: K, v: DigForm[K])  => setDig(f  => ({ ...f, [k]: v }));

  const cur = pType === 'physical' ? phys : dig;

  // Attributes are scoped to whichever category the product actually sits
  // under — the chosen subcategory, else the store's main category.
  const effectiveCategoryId = cur.subCategoryId || store?.categoryId || null;
  const { definitions: attrDefs, loading: attrLoading } = useCategoryAttributes(effectiveCategoryId);

  const addPhysTag = () => { const v = phys.tagInput.replace(',', '').trim(); if (v && !phys.tags.includes(v)) sp('tags', [...phys.tags, v]); sp('tagInput', ''); };
  const addDigTag  = () => { const v = dig.tagInput.replace(',', '').trim();  if (v && !dig.tags.includes(v))  sd('tags', [...dig.tags, v]);  sd('tagInput', '');  };

  const discountPct = (() => {
    const p = Number(cur.price), c = Number(cur.compareAtPrice);
    return p > 0 && c > p ? Math.round((1 - p / c) * 100) : null;
  })();

  const handleSubmit = async (statusOverride?: ProductStatus) => {
    setError('');
    if (pType === 'physical' && (!phys.name || !phys.price || !phys.stock)) { setError('Name, price, and stock are required.'); return; }
    if (pType !== 'physical' && (!dig.name  || !dig.price))                  { setError('Name and price are required.'); return; }
    if (pType === 'educational' && !dig.educationLevel)                      { setError('Education level is required for educational resources.'); return; }
    if (pType === 'educational' && dig.educationLevel === 'other' && !dig.customLevel.trim()) { setError('Please describe the custom education level.'); return; }
    const missingAttr = findMissingRequiredAttribute(attrDefs, attributeValues);
    if (missingAttr) { setError(`${missingAttr.label} is required.`); return; }
    const finalStatus = statusOverride ?? (pType === 'physical' ? phys.status : dig.status);
    // A digital product with no file would sell buyers nothing — drafts may
    // skip it, but publishing/scheduling needs at least one file.
    if (pType !== 'physical' && finalStatus !== 'draft' && !dig.fileData) { setError('Upload the file buyers will receive before publishing (or save as draft).'); return; }
    if (finalStatus === 'scheduled' && !cur.scheduledAt) { setError('Pick a date and time for your scheduled listing.'); setShowScheduleModal(true); return; }
    setSaving(true);
    try {
      let productId: string;
      if (pType === 'physical') {
        const res = await apiCreatePhysicalProduct({
          storeId, name: phys.name, description: phys.description,
          subCategoryId: phys.subCategoryId || null, images: phys.images, tags: phys.tags,
          isListedOnEdudeen: phys.isListedOnEdudeen, status: finalStatus,
          scheduledAt: finalStatus === 'scheduled' ? phys.scheduledAt || null : null,
          variants: [{
            price: Number(phys.price),
            compareAtPrice: phys.compareAtPrice ? Number(phys.compareAtPrice) : null,
            options: phys.options,
            stock: Number(phys.stock),
            shippingWeight: phys.shippingWeight,
          }],
        });
        addCachedProduct(storeId, { product: res.data.product, variant: res.data.defaultVariant });
        productId = res.data.product._id;
      } else {
        const files = dig.fileData ? [{ url: dig.fileData.publicId, name: dig.fileData.fileName, size: dig.fileData.fileSize, mimeType: dig.fileData.mimeType }] : [];
        const res = await apiCreateDigitalProduct({
          storeId, name: dig.name, description: dig.description,
          productType: pType === 'educational' ? 'educational' : 'digital',
          subCategoryId: dig.subCategoryId || null, images: dig.images, tags: dig.tags,
          educationLevel: pType === 'educational' ? (dig.educationLevel || null) : null,
          customLevel: pType === 'educational' && dig.educationLevel === 'other' ? dig.customLevel : null,
          isListedOnEdudeen: dig.isListedOnEdudeen, status: finalStatus,
          scheduledAt: finalStatus === 'scheduled' ? dig.scheduledAt || null : null,
          price: Number(dig.price), compareAtPrice: dig.compareAtPrice ? Number(dig.compareAtPrice) : null,
          digital: { files, downloadLimit: dig.downloadLimit, linkExpiryDays: dig.linkExpiryDays ? Number(dig.linkExpiryDays) : null, pdfStampingEnabled: dig.pdfStampingEnabled, licenseType: dig.licenseType, buyerDeliveryMessage: dig.buyerDeliveryMessage, preview: { enabled: dig.previewEnabled, sourceFileIndex: 0 } },
        });
        addCachedProduct(storeId, { product: res.data.product, variant: res.data.defaultVariant });
        productId = res.data.product._id;
      }

      const attrInputs = toAttributeInputs(attributeValues);
      if (attrInputs.length) await apiSetProductAttributes(productId, attrInputs);

      navigate(`/store/${storeId}/products`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  // ── Publishing helpers ────────────────────────────────────────────────────
  const setStatus = (val: ProductStatus) => {
    if (pType === 'physical') sp('status', val); else sd('status', val);
    if (val === 'scheduled') setShowScheduleModal(true);
  };
  const primaryLabel = cur.status === 'scheduled' ? 'Schedule listing' : cur.status === 'draft' ? 'Save as draft' : 'Publish now';
  const isDigitalFamily = pType === 'digital' || pType === 'educational';
  const digitalAvailable = supportsDigital || supportsEducational;

  // Required-field checklist shown beside the publish button.
  const checklist: { label: string; done: boolean }[] = [
    { label: 'Product title', done: !!cur.name.trim() },
    { label: 'Price', done: cur.price !== '' && Number(cur.price) >= 0 },
    ...(pType === 'physical' ? [{ label: 'Stock quantity', done: phys.stock !== '' }] : []),
    ...(pType === 'educational' ? [{ label: 'Education level', done: !!dig.educationLevel && (dig.educationLevel !== 'other' || !!dig.customLevel.trim()) }] : []),
    ...(isDigitalFamily && cur.status !== 'draft' ? [{ label: 'The file buyers receive', done: !!dig.fileData }] : []),
    ...(cur.status === 'scheduled' ? [{ label: 'Schedule date & time', done: !!cur.scheduledAt }] : []),
  ];
  const recommended: { label: string; done: boolean }[] = [
    { label: 'At least one image', done: cur.images.length > 0 },
    { label: 'A description', done: !!cur.description.trim() },
  ];

  let stepNo = 0;
  const nextStep = () => ++stepNo;

  const primaryBtn = (full?: boolean) => (
    <button onClick={() => handleSubmit()} disabled={saving}
      className={`${full ? 'w-full py-[12px]' : 'px-5 py-[10px]'} flex items-center justify-center gap-1.5 rounded-lg text-[14px] font-bold border-none transition-colors ${saving ? 'bg-bone text-slate cursor-not-allowed' : 'bg-brand-orange text-white hover:bg-brand-deep-orange cursor-pointer'}`}>
      {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : primaryLabel}
    </button>
  );
  const draftBtn = (full?: boolean) => (
    <button onClick={() => handleSubmit('draft')} disabled={saving}
      className={`${full ? 'w-full py-[11px]' : 'px-4 py-[10px]'} rounded-lg text-[14px] font-bold text-brand-orange bg-white border border-bone cursor-pointer hover:bg-cream transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}>
      Save as draft
    </button>
  );

  return (
    <div className="min-h-full">

      {/* ── Header ── */}
      <StorePageHeader
        title="Add a new product"
        subtitle="A few short steps. Fields marked * are required — everything else can be added later."
        actions={
          <div className="hidden sm:flex items-center gap-2">
            {cur.status !== 'draft' && draftBtn()}
            {primaryBtn()}
          </div>
        }
      />

      {error && (
        <div className="px-4 md:px-8 pt-5">
          <p role="alert" className="text-[13px] text-error font-medium bg-error-bg border border-error-border rounded-lg px-4 py-3">{error}</p>
        </div>
      )}

      {/* ── 2-column body ── */}
      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

        {/* Left column — the steps */}
        <div className="flex flex-col gap-5 min-w-0">

          {/* Step: What are you selling? */}
          <Card step={nextStep()} title="What are you selling?" need="required" hint="Pick physical if you ship it, digital if buyers download it. You can't change this after publishing.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Product kind">
              {([
                { key: 'physical' as const, Icon: Truck,    label: 'Physical product', desc: 'Books, toys, prayer mats, games — anything you pack and ship to the buyer.', enabled: supportsPhysical },
                { key: 'digital'  as const, Icon: FileDown, label: 'Digital product',  desc: 'Worksheets, e-books, lessons, curricula — delivered instantly as a download.', enabled: digitalAvailable },
              ]).map(({ key, Icon: KIcon, label, desc, enabled }) => {
                const sel = key === 'physical' ? pType === 'physical' : isDigitalFamily;
                return (
                  <button key={key} type="button" role="radio" aria-checked={sel}
                    disabled={!enabled}
                    onClick={() => {
                      if (!enabled) return;
                      if (key === 'physical') setPType('physical');
                      else if (!isDigitalFamily) setPType(supportsDigital ? 'digital' : 'educational');
                    }}
                    className={`flex items-start gap-4 p-5 rounded-xl text-left border-2 transition-colors ${
                      !enabled ? 'opacity-50 cursor-not-allowed border-bone bg-cream'
                      : sel ? 'border-brand-orange bg-brand-pale-orange cursor-pointer'
                      : 'border-bone bg-white hover:border-border-hover hover:bg-cream cursor-pointer'}`}>
                    <span className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${sel ? 'bg-white text-brand-orange' : 'bg-cream text-slate'}`}>
                      <KIcon size={21} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`font-serif text-[18px] ${sel ? 'text-brand-orange' : 'text-carbon'}`}>{label}</span>
                        <span className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? 'bg-brand-orange border-brand-orange' : 'border-border-hover bg-white'}`}>
                          {sel && <Check size={11} className="text-white" strokeWidth={3} />}
                        </span>
                      </span>
                      <span className="block text-[13px] text-slate mt-1 leading-relaxed">{enabled ? desc : 'Not available in your plan'}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {isDigitalFamily && (
              <div className="mt-4">
                <p className="text-[13px] font-bold text-carbon mb-2">What kind of digital product?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Digital product kind">
                  {([
                    { t: 'digital'     as const, Icon: Download,      label: 'Digital download',     desc: 'Any instant downloadable file', enabled: supportsDigital     },
                    { t: 'educational' as const, Icon: GraduationCap, label: 'Educational resource', desc: 'Worksheets, lessons, curricula — with an education level', enabled: supportsEducational },
                  ]).map(({ t, Icon: TIcon, label, desc, enabled }) => {
                    const sel = pType === t;
                    return (
                      <button key={t} type="button" role="radio" aria-checked={sel}
                        onClick={() => enabled && setPType(t)} disabled={!enabled}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left border transition-colors ${
                          !enabled ? 'opacity-50 cursor-not-allowed border-bone'
                          : sel ? 'border-brand-orange bg-brand-pale-orange cursor-pointer'
                          : 'border-bone bg-white hover:bg-cream cursor-pointer'}`}>
                        <TIcon size={18} className={sel ? 'text-brand-orange' : 'text-slate'} />
                        <span className="min-w-0">
                          <span className={`block text-[13.5px] font-bold ${sel ? 'text-brand-orange' : 'text-carbon'}`}>{label}</span>
                          <span className="block text-[12px] text-slate">{enabled ? desc : 'Not available in your plan'}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Step: Basics */}
          <Card step={nextStep()} title="The basics" need="required" hint="A clear title and an honest description help buyers decide quickly.">
            <div className="flex flex-col gap-4">
              <F label="Product title" req htmlFor="ap-name" hint="Say what it is and who it's for — e.g. age or level.">
                <input id="ap-name" value={cur.name}
                  onChange={e => pType === 'physical' ? sp('name', e.target.value) : sd('name', e.target.value)}
                  placeholder={pType === 'physical' ? 'e.g. Wooden Arabic Alphabet Puzzle (ages 3–6)' : 'e.g. My Purposeful Learning Week — printable planner'}
                  className={inp} />
              </F>
              <F label="Description" htmlFor="ap-desc" hint="What's included, the learning goal, and how it's used at home or in class.">
                <textarea id="ap-desc" value={cur.description}
                  onChange={e => pType === 'physical' ? sp('description', e.target.value) : sd('description', e.target.value)}
                  placeholder="Describe your product — what it includes, who it's for, and what makes it special…"
                  className={ta} />
              </F>
            </div>
          </Card>

          {/* Step: Pricing */}
          <Card step={nextStep()} title="Price" need="required" hint={`Prices are in your store's currency (${currencySymbol}). Enter 0 for a free resource.`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label={`Price (${currencySymbol})`} req htmlFor="ap-price">
                <input id="ap-price" type="number" min="0" inputMode="decimal" value={cur.price}
                  onChange={e => pType === 'physical' ? sp('price', e.target.value) : sd('price', e.target.value)}
                  placeholder="0.00" className={inp} />
              </F>
              <F label={`Compare-at price (${currencySymbol})`} htmlFor="ap-compare" hint="Original price, shown struck through when you offer a discount.">
                <input id="ap-compare" type="number" min="0" inputMode="decimal" value={cur.compareAtPrice}
                  onChange={e => pType === 'physical' ? sp('compareAtPrice', e.target.value) : sd('compareAtPrice', e.target.value)}
                  placeholder="0.00" className={inp} />
              </F>
            </div>
            {discountPct !== null && (
              <div className="flex items-center gap-1.5 px-3 py-2 mt-3 bg-success-bg border border-success/20 rounded-lg w-fit">
                <span className="text-[12.5px] font-bold text-success">{discountPct}% OFF</span>
                <span className="text-[12px] text-success">shown to buyers</span>
              </div>
            )}
          </Card>

          {/* Step: Images */}
          <Card step={nextStep()} title="Photos" need="recommended" hint="Up to 5 images. The first image is the cover buyers see in search and on your shelf.">
            <ImageUpload
              value={cur.images}
              onChange={urls => pType === 'physical' ? sp('images', urls) : sd('images', urls)}
              maxFiles={5}
            />
          </Card>

          {/* Physical: Inventory & Shipping */}
          {pType === 'physical' && (
            <Card step={nextStep()} title="Stock & shipping" need="required" hint="How many you have, and any options buyers can choose between.">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <F label="Stock quantity" req htmlFor="ap-stock">
                    <input id="ap-stock" type="number" min="0" inputMode="numeric" value={phys.stock} onChange={e => sp('stock', e.target.value)} placeholder="0" className={inp} />
                  </F>
                  <F label="Shipping weight" htmlFor="ap-weight" hint="Used to estimate delivery cost.">
                    <input id="ap-weight" value={phys.shippingWeight} onChange={e => sp('shippingWeight', e.target.value)} placeholder="e.g. 0.5 kg" className={inp} />
                  </F>
                </div>
                <F label="Variant attributes">
                  <VariantOptionsField options={phys.options} onChange={v => sp('options', v)} />
                </F>
              </div>
            </Card>
          )}

          {/* Digital/Educational: File Upload */}
          {isDigitalFamily && (
            <Card step={nextStep()} title={pType === 'educational' ? 'Resource file' : 'Digital file'} need="required" hint="The file buyers receive instantly after purchase. Required to publish — drafts can be saved without it.">
              <FileUpload value={dig.fileData} onChange={v => sd('fileData', v)} label="Click to upload your digital file" />
            </Card>
          )}

          {/* Educational: Education Level (controlled Tier-1 + optional Tier-2 custom label) */}
          {pType === 'educational' && (
            <Card step={nextStep()} title="Education level" need="required" hint="Helps parents and teachers find resources for the right stage.">
              <div className="flex flex-col gap-4">
                <div role="radiogroup" aria-label="Education level" className="flex gap-2 flex-wrap">
                  {EDUCATION_LEVELS.map(l => {
                    const sel = dig.educationLevel === l.value;
                    return (
                      <button key={l.value} type="button" role="radio" aria-checked={sel} onClick={() => sd('educationLevel', l.value)}
                        className={`px-[14px] py-[8px] rounded-full cursor-pointer text-[13px] font-medium border transition-colors ${sel ? 'border-brand-orange bg-brand-pale-orange text-brand-orange font-bold' : 'border-bone bg-white text-graphite hover:bg-cream'}`}>
                        {l.label}
                      </button>
                    );
                  })}
                </div>
                {dig.educationLevel === 'other' && (
                  <F label="Custom education level" req>
                    <CustomLevelInput value={dig.customLevel} onChange={v => sd('customLevel', v)} />
                  </F>
                )}
              </div>
            </Card>
          )}

          {/* Digital/Educational: Delivery Settings */}
          {isDigitalFamily && (
            <Card step={nextStep()} title="Delivery & licence" need="optional" hint="Sensible defaults are already set — unlimited downloads, no expiry, personal licence.">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <F label="Download limit" htmlFor="ap-dl" hint={'Type a number, or leave "unlimited".'}>
                    <input id="ap-dl" value={dig.downloadLimit} onChange={e => sd('downloadLimit', e.target.value)} placeholder="unlimited" className={inp} />
                  </F>
                  <F label="Link expiry (days)" htmlFor="ap-exp" hint="Leave empty for links that never expire.">
                    <input id="ap-exp" type="number" min="0" value={dig.linkExpiryDays} onChange={e => sd('linkExpiryDays', e.target.value)} placeholder="No expiry" className={inp} />
                  </F>
                </div>
                <F label="Licence type">
                  <div role="radiogroup" aria-label="Licence type" className="flex gap-2 mt-0.5 flex-wrap">
                    {(pType === 'educational'
                      ? (['personal', 'single_classroom', 'school', 'commercial'] as const)
                      : (['personal', 'commercial'] as const)
                    ).map(l => {
                      const sel = dig.licenseType === l;
                      return (
                        <button key={l} type="button" role="radio" aria-checked={sel} onClick={() => sd('licenseType', l)}
                          className={`flex-1 min-w-[120px] py-[9px] rounded-lg cursor-pointer text-[13px] capitalize border transition-colors ${sel ? 'border-brand-orange bg-brand-pale-orange text-brand-orange font-bold' : 'border-bone bg-white text-graphite font-medium hover:bg-cream'}`}>
                          {l.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </F>
                <F label="Buyer delivery message" htmlFor="ap-msg" hint="Shown to the buyer with their download.">
                  <textarea id="ap-msg" value={dig.buyerDeliveryMessage} onChange={e => sd('buyerDeliveryMessage', e.target.value)}
                    placeholder="Thank you for your purchase! Here is your download link…" className={ta} />
                </F>
                <div className="flex items-center justify-between gap-4 py-0.5">
                  <div>
                    <p className="text-[13.5px] font-bold text-carbon">PDF stamping</p>
                    <p className="text-[12px] text-slate mt-0.5">Watermark PDFs with the buyer's name</p>
                  </div>
                  <Toggle label="PDF stamping" checked={dig.pdfStampingEnabled} onChange={v => sd('pdfStampingEnabled', v)} />
                </div>
                <div className="flex items-center justify-between gap-4 py-0.5">
                  <div>
                    <p className="text-[13.5px] font-bold text-carbon">Buyer preview</p>
                    <p className="text-[12px] text-slate mt-0.5">Let buyers see a watermarked/trimmed preview before purchase</p>
                  </div>
                  <Toggle label="Buyer preview" checked={dig.previewEnabled} onChange={v => sd('previewEnabled', v)} />
                </div>
              </div>
            </Card>
          )}

          {/* Category */}
          <Card step={nextStep()} title="Category" need="optional" hint={`Your product is listed under ${mainCategory?.name ?? 'your store category'}. Pick a subcategory to help buyers browse.`}>
            <SubcategoryField
              mainCategoryName={mainCategory?.name ?? ''}
              mainCategoryId={store?.categoryId ?? ''}
              subcategories={subcategories}
              loading={catLoading}
              value={cur.subCategoryId}
              onChange={id => pType === 'physical' ? sp('subCategoryId', id) : sd('subCategoryId', id)}
              onCreated={id => pType === 'physical' ? sp('subCategoryId', id) : sd('subCategoryId', id)}
              refetch={refetchCats}
            />
          </Card>

          {/* Category-specific classification (subject, format, etc) */}
          {(attrLoading || attrDefs.length > 0) && (
            <Card step={nextStep()} title="Additional details" hint="Details for this category, such as subject or format. Fields marked * are required.">
              <DynamicAttributeFields
                definitions={attrDefs}
                loading={attrLoading}
                value={attributeValues}
                onChange={setAttributeValues}
              />
            </Card>
          )}

          {/* Tags */}
          <Card step={nextStep()} title="Tags & search" need="optional" hint="Words buyers might search for — e.g. seerah, ramadan, phonics.">
            <TagInput
              tags={cur.tags} input={cur.tagInput}
              onInput={v => pType === 'physical' ? sp('tagInput', v) : sd('tagInput', v)}
              onAdd={pType === 'physical' ? addPhysTag : addDigTag}
              onRemove={i => pType === 'physical'
                ? sp('tags', phys.tags.filter((_, idx) => idx !== i))
                : sd('tags', dig.tags.filter((_, idx) => idx !== i))}
            />
            <p className="text-[12px] text-slate mt-2">Press Enter or comma to add a tag</p>
          </Card>
        </div>

        {/* ── Right sidebar — publishing ── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-[96px]" aria-label="Publishing">

          <section className="bg-white border border-bone rounded-xl px-5 py-5">
            <h2 className="font-serif font-normal text-[20px] text-carbon mb-1">Publish</h2>
            <p className="text-[12.5px] text-slate mb-4">Choose when this product goes live.</p>

            <div role="radiogroup" aria-label="Listing status" className="flex flex-col gap-1.5">
              {([
                { val: 'active'    as const, label: 'Publish now',        desc: 'Live in your store straight away', dotCls: 'bg-success' },
                { val: 'scheduled' as const, label: 'Schedule for later', desc: 'Goes live on a date you choose',   dotCls: 'bg-brand-royal' },
                { val: 'draft'     as const, label: 'Keep as draft',      desc: 'Only you can see it',              dotCls: 'bg-slate' },
              ]).map(({ val, label, desc, dotCls }) => {
                const sel = cur.status === val;
                return (
                  <button key={val} type="button" role="radio" aria-checked={sel}
                    onClick={() => setStatus(val)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer text-left transition-colors w-full ${sel ? 'bg-brand-pale-orange border-brand-orange' : 'bg-white border-bone hover:bg-cream'}`}>
                    <span className={`w-[8px] h-[8px] rounded-full shrink-0 ${dotCls}`} />
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[13px] font-bold ${sel ? 'text-brand-orange' : 'text-carbon'}`}>{label}</span>
                      <span className="block text-[11.5px] text-slate">{desc}</span>
                    </span>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? 'bg-brand-orange border-brand-orange' : 'border-border-hover bg-white'}`}>
                      {sel && <Check size={9} className="text-white" strokeWidth={3.5} />}
                    </span>
                  </button>
                );
              })}
            </div>

            {cur.status === 'scheduled' && (
              <button type="button" onClick={() => setShowScheduleModal(true)}
                className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-bone bg-cream text-[12.5px] text-carbon cursor-pointer hover:border-brand-orange/40 transition-colors w-full text-left">
                <CalendarClock size={14} className="text-brand-orange shrink-0" />
                <span className="truncate">
                  {cur.scheduledAt
                    ? new Date(cur.scheduledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                    : 'Set schedule date & time'}
                </span>
              </button>
            )}

            <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-bone">
              <div>
                <p className="text-[13px] font-bold text-carbon">Also list on Edudeen Marketplace</p>
                <p className="text-[11.5px] text-slate">Reach buyers beyond your own store</p>
              </div>
              <Toggle
                label="Also list on Edudeen Marketplace"
                checked={cur.isListedOnEdudeen}
                onChange={v => pType === 'physical' ? sp('isListedOnEdudeen', v) : sd('isListedOnEdudeen', v)}
              />
            </div>

            <div className="flex flex-col gap-2 mt-5">
              {primaryBtn(true)}
              {cur.status !== 'draft' && draftBtn(true)}
            </div>
            {error && <p role="alert" className="text-[12.5px] text-error font-medium text-center mt-3">{error}</p>}
          </section>

          {/* Readiness checklist */}
          <section className="bg-white border border-bone rounded-xl px-5 py-5">
            <p className="text-[11px] font-bold text-brand-royal uppercase tracking-[0.15em] mb-3">Ready to share?</p>
            <ul className="flex flex-col gap-2 list-none p-0 m-0">
              {checklist.map(item => (
                <li key={item.label} className="flex items-center gap-2 text-[13px]">
                  <span className={`size-[18px] rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-success text-white' : 'border-2 border-border-hover'}`}>
                    {item.done && <Check size={10} strokeWidth={3.5} />}
                  </span>
                  <span className={item.done ? 'text-carbon' : 'text-graphite'}>{item.label}</span>
                  <span className="text-[11px] text-slate ml-auto">Required</span>
                </li>
              ))}
              {recommended.map(item => (
                <li key={item.label} className="flex items-center gap-2 text-[13px]">
                  <span className={`size-[18px] rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-success text-white' : 'border-2 border-border-hover'}`}>
                    {item.done && <Check size={10} strokeWidth={3.5} />}
                  </span>
                  <span className={item.done ? 'text-carbon' : 'text-graphite'}>{item.label}</span>
                  <span className="text-[11px] text-slate ml-auto">Recommended</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {/* Mobile action bar — keeps Publish / Draft in reach above the bottom nav */}
      <div className="sm:hidden sticky bottom-[56px] z-10 bg-white/95 backdrop-blur-md border-t border-bone px-4 py-3 flex gap-2">
        {cur.status !== 'draft' && <div className="flex-1">{draftBtn(true)}</div>}
        <div className="flex-1">{primaryBtn(true)}</div>
      </div>

      {showScheduleModal && (
        <DateTimePickerModal
          value={pType === 'physical' ? phys.scheduledAt : dig.scheduledAt}
          onChange={iso => {
            if (pType === 'physical') sp('scheduledAt', iso); else sd('scheduledAt', iso);
            setShowScheduleModal(false);
          }}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  );
}
