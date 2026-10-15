import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { apiCreatePhysicalProduct, apiCreateDigitalProduct, type VariantOption } from '@/api/services/product';
import { apiSetProductAttributes } from '@/api/services/attributes';
import { addCachedProduct } from './_cache';
import { toAttributeInputs, findMissingRequiredAttribute, type AttributeValuesState } from './attributeFormUtils';
import { useSellerCategories } from '@/hooks/store/useSellerCategories';
import { useCategoryAttributes } from '@/hooks/marketplace/useCategoryAttributes';
import { type PrivateUploadData, DateTimePickerModal } from '@/components/comman/ui';
import {
  EMPTY_LEARNING, learningPayload, learningError, tiersPayload, tiersError, EMPTY_TIERS,
} from '@/features/seller/components/products/LearningFields';
import { EMPTY_DELIVERY, deliveryPayload, deliveryError } from '@/features/seller/components/products/DeliveryFormatField';
import { currencySymbol as symbolForCurrency } from '@/utils/currency';
import { offersPayload, PREMIUM_BLANK_MESSAGE, OFFER_CONFLICT_MESSAGE, type OfferFlags } from './ProductOffersCard';
import { premiumPercentError } from './PremiumPriceField';
import { effectiveSellerPercent, premiumGapMessage, usePremiumTerms } from './PremiumEarningsCalculator';
import {
  isDigitalFamilyType, findCategoryName,
  type DigForm, type PhysForm, type ProductStatus, type ProductType,
} from './ProductFormKit';
import {
  ActionBar, ProductPreview, StepRail, WizardNav, WIZARD_STEPS, dirtyCapture, timeAgo,
  useDraftAutosave, useLeaveGuard, useWizard, type WizardIssue,
} from './ProductWizard';
import { ProductFormSteps } from './ProductFormSteps';
import { AlertCircle } from 'lucide-react';

const initPhys: PhysForm = {
  name: '', description: '', price: '', compareAtPrice: '',
  stock: '', options: [] as VariantOption[], shippingWeight: '', subCategoryId: '',
  // Sensible default: the primary button publishes; "Save as draft" is always one click away.
  status: 'active', isListedOnEdudeen: true,
  scheduledAt: '', tagInput: '', tags: [], images: [],
};
const initDig: DigForm = {
  name: '', description: '', price: '', compareAtPrice: '', subCategoryId: '',
  status: 'active', isListedOnEdudeen: true,
  scheduledAt: '', tagInput: '', tags: [], images: [],
  files: [] as PrivateUploadData[],
  sampleFile: null,
  tiers: EMPTY_TIERS,
  downloadLimit: 'unlimited', linkExpiryDays: '',
  pdfStampingEnabled: false, licenseType: 'personal',
  buyerDeliveryMessage: '', educationLevel: '', customLevel: '',
  previewEnabled: false,
};

interface DraftSnapshot {
  pType: ProductType; phys: PhysForm; dig: DigForm; learning: typeof EMPTY_LEARNING; delivery: typeof EMPTY_DELIVERY;
  campaignIds: string[]; premiumPct: string; premiumOptOut: boolean; attributeValues: AttributeValuesState; categoryChoice: string | null;
}

export default function StoreAddProduct() {
  const navigate           = useNavigate();
  const { storeId, store } = useStoreWorkspace();
  // Every price on this form is in the STORE's own currency (locked at onboarding) — never assume PKR.
  const currencySymbol = symbolForCurrency(store?.baseCurrency);

  const supportsPhysical    = !store || (store.productTypes ?? []).includes('physical_products');
  const supportsDigital     = !store || (store.productTypes ?? []).includes('digital_downloads');
  const supportsEducational = !store || (store.productTypes ?? []).includes('educational_resources');

  const { categories, loading: catLoading, error: catError, refetch: refetchCats } = useSellerCategories();
  // Main category chosen for THIS product; defaults to the store's own category.
  const [categoryChoice, setCategoryChoice] = useState<string | null>(null);
  const categoryId   = categoryChoice ?? store?.categoryId ?? '';
  const rootCategory = categories.find(c => c._id === categoryId);
  const subcategories = rootCategory?.children ?? [];
  const [pType,             setPType]             = useState<ProductType>('physical');
  const [saving,            setSaving]            = useState(false);
  const [error,             setError]             = useState('');
  const [phys,              setPhys]              = useState<PhysForm>(initPhys);
  const [dig,               setDig]               = useState<DigForm>(initDig);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [attributeValues,   setAttributeValues]   = useState<AttributeValuesState>({});
  const [learning,          setLearning]          = useState(EMPTY_LEARNING);
  const [delivery,          setDelivery]          = useState(EMPTY_DELIVERY);
  const [campaignIds,       setCampaignIds]       = useState<string[]>([]);
  const [premiumPct,        setPremiumPct]        = useState('');
  const [premiumOptOut,    setPremiumOptOut]     = useState(false);
  const [offerFlags, setOfferFlags] = useState<OfferFlags>({ premiumBlank: false, conflict: false });
  const [touched,           setTouched]           = useState(false);
  const [now,               setNow]               = useState(() => Date.now());
  const storePremiumPct = store?.premiumDiscount?.enabled ? store.premiumDiscount.percent : 0;
  const { terms: premiumTerms } = usePremiumTerms(pType, store?.baseCurrency, storeId);

  // Once the store loads, never leave the form on a type this store can't sell.
  useEffect(() => {
    if (!store) return;
    const ok = pType === 'physical' ? supportsPhysical : pType === 'digital' ? supportsDigital : supportsEducational;
    if (ok) return;
    if (supportsPhysical) setPType('physical');
    else if (supportsDigital) setPType('digital');
    else if (supportsEducational) setPType('educational');
  }, [store, pType, supportsPhysical, supportsDigital, supportsEducational]);

  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(t); }, []);

  const sp = <K extends keyof PhysForm>(k: K, v: PhysForm[K]) => setPhys(f => ({ ...f, [k]: v }));
  const sd = <K extends keyof DigForm> (k: K, v: DigForm[K])  => setDig(f  => ({ ...f, [k]: v }));

  const isDigitalFamily = isDigitalFamilyType(pType);
  const cur = pType === 'physical' ? phys : dig;

  const changeCategory = (id: string) => {
    if (id === categoryId) return;
    setCategoryChoice(id);
    sp('subCategoryId', '');
    sd('subCategoryId', '');
    setAttributeValues({});
  };

  // Attributes are scoped to whichever category the product actually sits
  // under — the chosen subcategory, else the store's main category.
  const effectiveCategoryId = cur.subCategoryId || categoryId || null;
  const { definitions: attrDefs, loading: attrLoading } = useCategoryAttributes(effectiveCategoryId);

  const addTag = () => {
    if (pType === 'physical') { const v = phys.tagInput.replace(',', '').trim(); if (v && !phys.tags.includes(v)) sp('tags', [...phys.tags, v]); sp('tagInput', ''); }
    else                      { const v = dig.tagInput.replace(',', '').trim();  if (v && !dig.tags.includes(v))  sd('tags', [...dig.tags, v]);  sd('tagInput', ''); }
  };

  const isCourse = isDigitalFamily && delivery.format === 'course';

  // ── Every rule the form enforces, grouped by the step it belongs to ──────────
  const collectIssues = (status: ProductStatus): WizardIssue[] => {
    const out: WizardIssue[] = [];
    const finalStatus = isCourse ? 'draft' : status;
    if (!cur.name) out.push({ step: 0, message: 'Add a product title', fieldId: 'ap-name' });
    if (!cur.description.trim()) out.push({ step: 0, message: 'Add a description', fieldId: 'ap-desc' });
    if (isDigitalFamily) {
      const dErr = deliveryError(delivery);
      if (dErr) out.push({ step: 1, message: dErr, fieldId: 'fld-delivery' });
      if (delivery.format === 'download' && finalStatus !== 'draft' && dig.files.length === 0)
        out.push({ step: 1, message: 'Upload the file buyers will receive (or save as draft)', fieldId: 'fld-files', publishOnly: true });
    }
    if (!cur.price) out.push({ step: 2, message: 'Add a price', fieldId: 'ap-price' });
    if (pType === 'physical' && !phys.stock) out.push({ step: 2, message: 'Add the stock quantity', fieldId: 'ap-stock' });
    if (isDigitalFamily) { const tErr = tiersError(dig.tiers); if (tErr) out.push({ step: 2, message: tErr, fieldId: 'fld-tiers' }); }
    if (pType === 'educational' && !dig.educationLevel) out.push({ step: 3, message: 'Choose an education level', fieldId: 'fld-level' });
    else if (pType === 'educational' && dig.educationLevel === 'other' && !dig.customLevel.trim()) out.push({ step: 3, message: 'Describe the custom education level', fieldId: 'fld-level' });
    const lErr = learningError(learning);
    if (lErr) out.push({ step: 3, message: lErr, fieldId: 'fld-learning' });
    const missingAttr = findMissingRequiredAttribute(attrDefs, attributeValues);
    if (missingAttr) out.push({ step: 3, message: `${missingAttr.label} is required`, fieldId: 'fld-attrs' });
    const pErr = premiumPercentError(premiumPct);
    if (pErr) out.push({ step: 4, message: pErr, fieldId: 'fld-offers' });
    // Owner rule: the normal sale must stay at least the admin's gap below the Premium discount (the API enforces it too).
    const gapErr = premiumTerms ? premiumGapMessage(Number(cur.price), Number(cur.compareAtPrice), effectiveSellerPercent(premiumPct, storePremiumPct, premiumOptOut || campaignIds.length > 0), premiumTerms.minGapPercent) : null;
    if (gapErr) out.push({ step: 4, message: gapErr, fieldId: 'fld-offers' });
    if (offerFlags.premiumBlank) out.push({ step: 4, message: PREMIUM_BLANK_MESSAGE, fieldId: 'fld-offers' });
    if (offerFlags.conflict) out.push({ step: 4, message: OFFER_CONFLICT_MESSAGE, fieldId: 'fld-offers' });
    if (finalStatus === 'scheduled' && !cur.scheduledAt) out.push({ step: 5, message: 'Pick a date and time for your scheduled listing', fieldId: 'fld-schedule', publishOnly: true });
    return out;
  };
  // Issues for the status currently chosen (what Publish would run into).
  const issues = collectIssues(cur.status);
  const wiz = useWizard(issues, 'Add');

  // ── Autosave to this device (never publishes) ───────────────────────────────
  const snapshot = useMemo<DraftSnapshot>(() => ({ pType, phys, dig, learning, delivery, campaignIds, premiumPct, premiumOptOut, attributeValues, categoryChoice }),
    [pType, phys, dig, learning, delivery, campaignIds, premiumPct, premiumOptOut, attributeValues, categoryChoice]);
  const hasContent = touched && !!(cur.name || cur.price || cur.description || cur.images.length || dig.files.length);
  const draft = useDraftAutosave<DraftSnapshot>(`edudeen:add-product:${storeId}`, snapshot, hasContent, true);
  const guard = useLeaveGuard(touched && !saving);

  const restoreDraft = () => {
    const r = draft.restorable?.data;
    if (!r) return;
    setPType(r.pType); setPhys({ ...initPhys, ...r.phys }); setDig({ ...initDig, ...r.dig });
    setLearning({ ...EMPTY_LEARNING, ...r.learning }); setDelivery({ ...EMPTY_DELIVERY, ...r.delivery });
    setCampaignIds(r.campaignIds ?? []); setPremiumPct(r.premiumPct ?? ''); setPremiumOptOut(!!r.premiumOptOut);
    setAttributeValues(r.attributeValues ?? {}); setCategoryChoice(r.categoryChoice ?? null);
    setTouched(true); wiz.markAllVisited(); draft.accept();
  };

  const handleSubmit = async (statusOverride?: ProductStatus) => {
    setError('');
    const finalStatus = isCourse ? 'draft' : statusOverride ?? cur.status;
    const found = collectIssues(finalStatus);
    if (found.length) {
      wiz.setAttempted(true);
      setError(found[0].message);
      wiz.go(found[0].step, found[0].fieldId);
      if (found[0].fieldId === 'fld-schedule') setShowScheduleModal(true);
      return;
    }
    if (pType === 'physical' && (!phys.name || !phys.price || !phys.stock)) { setError('Name, price, and stock are required.'); return; }
    if (pType !== 'physical' && (!dig.name  || !dig.price))                  { setError('Name and price are required.'); return; }
    setSaving(true);
    try {
      let productId: string;
      if (pType === 'physical') {
        const res = await apiCreatePhysicalProduct({
          storeId, name: phys.name, description: phys.description,
          categoryId: categoryId || undefined, subCategoryId: phys.subCategoryId || null, images: phys.images, tags: phys.tags,
          isListedOnEdudeen: phys.isListedOnEdudeen, status: finalStatus, ...offersPayload({ premiumPct, premiumOptOut, campaignIds }),
          scheduledAt: finalStatus === 'scheduled' ? phys.scheduledAt || null : null,
          ...learningPayload(learning),
          variants: [{
            price: Number(phys.price),
            compareAtPrice: phys.compareAtPrice ? Number(phys.compareAtPrice) : null,
            options: phys.options,
            stock: Number(phys.stock),
            shippingWeight: phys.shippingWeight,
          }],
        });
        const created = res.data.defaultVariant ?? res.data.variants?.find(v => v.isDefault) ?? res.data.variants?.[0];
        if (created) addCachedProduct(storeId, { product: res.data.product, variant: created });
        productId = res.data.product._id;
      } else {
        const toFile = (f: PrivateUploadData) => ({ url: f.publicId, name: f.fileName, size: f.fileSize, mimeType: f.mimeType });
        const files = dig.files.map(toFile);
        const res = await apiCreateDigitalProduct({
          storeId, name: dig.name, description: dig.description,
          productType: pType === 'educational' ? 'educational' : 'digital',
          categoryId: categoryId || undefined, subCategoryId: dig.subCategoryId || null, images: dig.images, tags: dig.tags,
          educationLevel: pType === 'educational' ? (dig.educationLevel || null) : null,
          customLevel: pType === 'educational' && dig.educationLevel === 'other' ? dig.customLevel : null,
          isListedOnEdudeen: dig.isListedOnEdudeen, status: finalStatus, ...offersPayload({ premiumPct, premiumOptOut, campaignIds }),
          scheduledAt: finalStatus === 'scheduled' ? dig.scheduledAt || null : null,
          price: Number(dig.price), compareAtPrice: dig.compareAtPrice ? Number(dig.compareAtPrice) : null,
          ...learningPayload(learning),
          ...deliveryPayload(delivery),
          licenseTiers: tiersPayload(dig.tiers.filter(t => t.license !== dig.licenseType)),
          digital: { files, downloadLimit: dig.downloadLimit, linkExpiryDays: dig.linkExpiryDays ? Number(dig.linkExpiryDays) : null, pdfStampingEnabled: dig.pdfStampingEnabled, licenseType: dig.licenseType, buyerDeliveryMessage: dig.buyerDeliveryMessage, preview: { enabled: dig.previewEnabled, sourceFileIndex: 0 }, sampleFile: dig.sampleFile ? toFile(dig.sampleFile) : null },
        });
        if (res.data.defaultVariant) addCachedProduct(storeId, { product: res.data.product, variant: res.data.defaultVariant });
        productId = res.data.product._id;
      }

      const attrInputs = toAttributeInputs(attributeValues);
      if (attrInputs.length) await apiSetProductAttributes(productId, attrInputs);

      draft.clear();
      guard.allow.current = true;
      navigate(isCourse ? `/store/${storeId}/products/${productId}/course` : `/store/${storeId}/products`);
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
  const primaryLabel = isCourse ? 'Save & build the course' : cur.status === 'scheduled' ? 'Schedule listing' : cur.status === 'draft' ? 'Save as draft' : 'Publish now';

  const requiredMissing = issues.length;
  const showMissing = () => { wiz.setAttempted(true); wiz.go(5); };

  const subName = findCategoryName(categories, cur.subCategoryId);
  const summaryRows = [
    { label: 'Type', value: pType === 'physical' ? 'Physical product' : pType === 'educational' ? 'Educational resource' : 'Digital download', step: 0 },
    { label: 'Title', value: cur.name || 'Missing', step: 0, ok: !!cur.name },
    { label: 'Description', value: cur.description ? `${cur.description.length} characters` : 'Missing', step: 0, ok: !!cur.description.trim() },
    { label: 'Photos', value: cur.images.length ? `${cur.images.length} added` : 'None yet (recommended)', step: 1 },
    ...(isDigitalFamily ? [{ label: 'Files', value: dig.files.length ? `${dig.files.length} uploaded` : delivery.format === 'download' ? 'None yet' : 'None', step: 1, ok: !(delivery.format === 'download' && cur.status !== 'draft' && dig.files.length === 0) }] : []),
    { label: 'Price', value: cur.price === '' ? 'Missing' : `${currencySymbol} ${cur.price}${cur.compareAtPrice ? ` (was ${currencySymbol} ${cur.compareAtPrice})` : ''}`, step: 2, ok: cur.price !== '' },
    ...(pType === 'physical' ? [{ label: 'Stock', value: phys.stock === '' ? 'Missing' : phys.stock, step: 2, ok: phys.stock !== '' }] : []),
    { label: 'Category', value: [rootCategory?.name, subName].filter(Boolean).join(' › ') || 'Not chosen', step: 3 },
    ...(pType === 'educational' ? [{ label: 'Education level', value: dig.educationLevel || 'Missing', step: 3, ok: !!dig.educationLevel }] : []),
    { label: 'Offers', value: campaignIds.length ? 'In a platform sale' : effectiveSellerPercent(premiumPct, storePremiumPct, premiumOptOut) > 0 ? `Premium discount ${effectiveSellerPercent(premiumPct, storePremiumPct, premiumOptOut)}%` : 'None', step: 4 },
    { label: 'Status', value: cur.status === 'active' ? 'Publish now' : cur.status === 'scheduled' ? 'Scheduled' : 'Draft', step: 5 },
  ];

  const saveNote = saving ? 'Saving…' : draft.savedAt ? `Draft autosaved on this device ${timeAgo(draft.savedAt, now)}` : touched ? 'Unsaved changes' : 'Nothing saved yet';

  return (
    <div className="min-h-full" {...dirtyCapture(() => setTouched(true))}>
      <StorePageHeader
        title="Add a new product"
        subtitle={`Step ${wiz.step + 1} of ${WIZARD_STEPS.length} — ${WIZARD_STEPS[wiz.step].title}. Items marked Required must be filled.`}
      />

      {draft.restorable && (
        <div className="px-4 md:px-8 pt-5">
          <div role="status" className="mx-auto max-w-[1700px] flex flex-wrap items-center gap-3 rounded-xl border border-info/30 bg-info-bg px-4 py-3 text-[13px] text-carbon">
            <span className="flex-1 min-w-[200px]"><b>Continue your unsaved product?</b> You have a draft from {timeAgo(draft.restorable.savedAt, now)}{draft.restorable.data?.phys?.name || draft.restorable.data?.dig?.name ? `: "${(draft.restorable.data.pType === 'physical' ? draft.restorable.data.phys?.name : draft.restorable.data.dig?.name) || 'Untitled'}"` : ''}.</span>
            <button type="button" onClick={restoreDraft} className="px-3 py-1.5 rounded-lg text-[13px] font-bold bg-brand-royal text-white border-none cursor-pointer">Continue</button>
            <button type="button" onClick={draft.dismiss} className="px-3 py-1.5 rounded-lg text-[13px] font-bold bg-white text-graphite border border-bone cursor-pointer">Start fresh</button>
          </div>
        </div>
      )}

      <div ref={wiz.topRef} className="px-4 md:px-8 py-5 max-lg:pb-24">
        <div className="mx-auto max-w-[1700px] grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[220px_minmax(0,1100px)_300px] items-start">
          <StepRail step={wiz.step} statusOf={wiz.statusOf} onGo={i => wiz.go(i)} />

          <div className="flex flex-col gap-5 min-w-0">
            {error && (
              <p role="alert" className="m-0 flex items-start gap-2 text-[13px] text-error font-medium bg-error-bg border border-error-border rounded-lg px-4 py-3">
                <AlertCircle size={16} className="mt-px shrink-0" /> {error}
              </p>
            )}
            <ProductPreview variant="inline" data={previewData()} />

            <ProductFormSteps
              mode="add" step={wiz.step} go={wiz.go} blockedStep={wiz.blockedStep} stepIssues={wiz.stepIssues} issues={issues}
              storeId={storeId} store={store} currencySymbol={currencySymbol}
              pType={pType} setPType={setPType} supports={{ physical: supportsPhysical, digital: supportsDigital, educational: supportsEducational }}
              phys={phys} dig={dig} sp={sp} sd={sd}
              delivery={delivery} setDelivery={setDelivery} learning={learning} setLearning={setLearning}
              offers={{ storePremiumPct, premiumPct, setPremiumPct, premiumOptOut, setPremiumOptOut, campaignIds, setCampaignIds: v => setCampaignIds(v), onFlags: setOfferFlags }}
              category={{ categories, loading: catLoading, error: catError, refetch: refetchCats, categoryId, rootName: rootCategory?.name ?? '', subcategories, change: changeCategory }}
              attrs={{ defs: attrDefs, loading: attrLoading, value: attributeValues, onChange: setAttributeValues }}
              addTag={addTag} setStatus={setStatus} openSchedule={() => setShowScheduleModal(true)} summaryRows={summaryRows}
            />

            <WizardNav step={wiz.step} onBack={wiz.back} onNext={wiz.next} />
          </div>

          <ProductPreview variant="column" data={previewData()} />
        </div>
      </div>

      <ActionBar
        saving={saving} primaryLabel={primaryLabel} onPrimary={() => handleSubmit()}
        onDraft={cur.status !== 'draft' && !isCourse ? () => handleSubmit('draft') : undefined}
        saveNote={saveNote} missing={requiredMissing} onShowMissing={showMissing}
      />

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
      {guard.dialog}
    </div>
  );

  function previewData() {
    return {
      name: cur.name, images: cur.images, price: cur.price, compareAtPrice: cur.compareAtPrice, currency: store?.baseCurrency,
      productType: pType, deliveryFormat: delivery.format, educationLevel: dig.educationLevel, customLevel: dig.customLevel,
      premiumPercent: campaignIds.length ? 0 : effectiveSellerPercent(premiumPct, storePremiumPct, premiumOptOut),
      ageMin: learning.ageMin, ageMax: learning.ageMax, storeName: store?.name,
    };
  }
}
