import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { UrduCopyCard } from '@/components/ai/UrduCopyCard';
import {
  apiGetMyProductById, apiEditPhysicalProduct, apiEditDigitalProduct, apiUpdateVariant,
  type EducationLevel, type StoreProduct, type ProductVariant,
} from '@/api/services/product';
import { getCachedProducts, updateCachedProduct, type ProductEntry } from './_cache';
import { toAttributeInputs, findMissingRequiredAttribute, type AttributeValuesState } from './attributeFormUtils';
import { apiGetProductAttributes, apiSetProductAttributes } from '@/api/services/attributes';
import { useSellerCategories } from '@/hooks/store/useSellerCategories';
import { useCategoryAttributes } from '@/hooks/marketplace/useCategoryAttributes';
import { type PrivateUploadData, DateTimePickerModal, SkeletonBox } from '@/components/comman/ui';
import {
  EMPTY_LEARNING, learningPayload, learningError, type LearningValue,
  EMPTY_TIERS, tiersPayload, tiersError, type LicenseTierValue,
} from '@/features/seller/components/products/LearningFields';
import { EMPTY_DELIVERY, deliveryPayload, deliveryError, deliveryFromProduct } from '@/features/seller/components/products/DeliveryFormatField';
import { currencySymbol as symbolForCurrency } from '@/utils/currency';
import { offersPayload, PREMIUM_BLANK_MESSAGE, OFFER_CONFLICT_MESSAGE, type OfferFlags } from './ProductOffersCard';
import { premiumPercentError } from './PremiumPriceField';
import { effectiveSellerPercent, premiumGapMessage, usePremiumTerms } from './PremiumEarningsCalculator';
import { titleError, classRangeError } from './productQuality';
import { reviewNoticeText } from './reviewNotice';
import { useToast } from '@/contexts/ToastContext';
import { descriptionError, validatePrices, weightTextError, parseWeightKg, stockError } from './priceRules';
import type { VariantOption } from '@/api/services/product';
import { findCategoryName, type DigForm, type LicenseType, type PhysForm, type ProductStatus } from './ProductFormKit';
import {
  ActionBar, ProductPreview, StepRail, WizardNav, WIZARD_STEPS, dirtyCapture,
  useLeaveGuard, useWizard, type WizardIssue,
} from './ProductWizard';
import { ProductFormSteps } from './ProductFormSteps';
const blankPhys: PhysForm = {
  name: '', description: '', price: '', compareAtPrice: '',
  stock: '', options: [] as VariantOption[], shippingWeight: '', subCategoryId: '',
  status: 'draft' as ProductStatus, isListedOnEdudeen: false,
  scheduledAt: '', tagInput: '', tags: [] as string[], images: [] as string[],
};
const blankDig: DigForm = {
  name: '', description: '', price: '', compareAtPrice: '', subCategoryId: '',
  status: 'draft' as ProductStatus, isListedOnEdudeen: false,
  scheduledAt: '', tagInput: '', tags: [] as string[], images: [] as string[],
  files: [] as PrivateUploadData[],
  sampleFile: null as PrivateUploadData | null,
  tiers: EMPTY_TIERS as LicenseTierValue[],
  downloadLimit: 'unlimited', linkExpiryDays: '',
  pdfStampingEnabled: false, licenseType: 'personal' as LicenseType,
  buyerDeliveryMessage: '', educationLevel: '' as EducationLevel | '', customLevel: '',
  previewEnabled: false,
};

// A listing waiting for review (or sent back) shows as "Active": saving it
// asks to publish again, and the server puts it back in the review queue.
function formStatus(s: string): ProductStatus {
  return s === 'pending_review' || s === 'rejected' ? 'active' : (s as ProductStatus);
}
function physFromEntry(p: StoreProduct, v: ProductVariant): PhysForm {
  return {
    name: p.name, description: p.description,
    price: String(v.price), compareAtPrice: v.compareAtPrice != null ? String(v.compareAtPrice) : '',
    stock: String(v.stock), options: [...(v.options ?? [])], shippingWeight: v.shippingWeight ?? '',
    subCategoryId: p.subCategoryId ?? '',
    status: formStatus(p.status), isListedOnEdudeen: p.isListedOnEdudeen,
    scheduledAt: '', tags: [...(p.tags ?? [])], tagInput: '', images: [...(p.images ?? [])],
  };
}
function digFromEntry(p: StoreProduct, v: ProductVariant): DigForm {
  const d = p.digital;
  const toUpload = (f: { url: string; name: string; size: number; mimeType: string }): PrivateUploadData => ({ publicId: f.url, resourceType: 'raw', fileName: f.name, fileSize: f.size, mimeType: f.mimeType });
  return {
    name: p.name, description: p.description,
    price: String(v.price), compareAtPrice: v.compareAtPrice != null ? String(v.compareAtPrice) : '',
    subCategoryId: p.subCategoryId ?? '',
    status: formStatus(p.status), isListedOnEdudeen: p.isListedOnEdudeen,
    scheduledAt: '', tags: [...(p.tags ?? [])], tagInput: '', images: [...(p.images ?? [])],
    files: (d?.files ?? []).map(toUpload),
    sampleFile: d?.sampleFile ? toUpload(d.sampleFile) : null,
    tiers: EMPTY_TIERS,
    downloadLimit: d?.downloadLimit ?? 'unlimited',
    linkExpiryDays: d?.linkExpiryDays != null ? String(d.linkExpiryDays) : '',
    pdfStampingEnabled: d?.pdfStampingEnabled ?? false,
    licenseType: (d?.licenseType as LicenseType) ?? 'personal',
    buyerDeliveryMessage: d?.buyerDeliveryMessage ?? '',
    educationLevel: (p.educationLevel as EducationLevel) ?? '',
    customLevel: p.customLevel ?? '',
    previewEnabled: d?.preview?.enabled ?? false,
  };
}

export default function StoreEditProduct() {
  const navigate           = useNavigate();
  const toast              = useToast();
  const { state }          = useLocation() as { state: { entry?: ProductEntry } | null };
  const { productId = '' } = useParams<{ productId: string }>();
  const { storeId, store } = useStoreWorkspace();
  // Every price on this form is in the STORE's own currency (locked at
  // onboarding) — never assume PKR. Uses the shared currencySymbol() util
  // (supports every SupportedCurrency, not just a PKR/USD ternary that
  // mislabeled any other currency as "Rs").
  const currencySymbol = symbolForCurrency(store?.baseCurrency);
  const { categories, loading: catLoading, error: catError, refetch: refetchCats } = useSellerCategories();
  // Main category chosen for THIS product; defaults to the store's own category.
  const [categoryChoice, setCategoryChoice] = useState<string | null>(null);
  const categoryId   = categoryChoice ?? store?.categoryId ?? '';
  const rootCategory = categories.find(c => c._id === categoryId);
  const subcategories = rootCategory?.children ?? [];
  const [fetching,          setFetching]          = useState(true);
  const [saving,            setSaving]            = useState(false);
  const [touched,           setTouched]           = useState(false);
  const [error,             setError]             = useState('');
  const [pType,             setPType]             = useState<'physical' | 'digital' | 'educational'>('physical');
  const [variantId,         setVariantId]         = useState<string | null>(null);
  const [phys,              setPhys]              = useState<PhysForm>(blankPhys);
  const [dig,               setDig]               = useState<DigForm>(blankDig);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [attributeValues,   setAttributeValues]   = useState<AttributeValuesState>({});
  // Listing review state from the server (not editable here).
  const [review, setReview] = useState<{ status: string; note: string | null } | null>(null);
  const [learning, setLearning] = useState<LearningValue>(EMPTY_LEARNING);
  const [delivery, setDelivery] = useState(EMPTY_DELIVERY);
  // null until the product's own list arrives, so a save never wipes a selection that was not loaded yet.
  const [campaignIds, setCampaignIds] = useState<string[] | null>(null);
  // null until the product is read fresh, so saving never clears a Premium price that has not loaded.
  const [premiumPct, setPremiumPct] = useState<string | null>(null);
  const [premiumOptOut, setPremiumOptOut] = useState<boolean | null>(null);
  // Edits to a live listing wait for admin approval; the form shows that state.
  const [editReview, setEditReview] = useState<{ pending: boolean; rejection: string | null }>({ pending: false, rejection: null });
  const [offerFlags, setOfferFlags] = useState<OfferFlags>({ premiumBlank: false, conflict: false });
  const storePremiumPct = store?.premiumDiscount?.enabled ? store.premiumDiscount.percent : 0;
  const { terms: premiumTerms } = usePremiumTerms(pType, store?.baseCurrency, storeId);

  // Old products may have no weight: it is only required once the product has one (or the seller types one), so they stay editable.
  const hadWeight = useRef(false);
  const originalName = useRef('');
  // The attribute list as loaded from the server (null = never loaded): an unchanged list is not sent again on save.
  const savedAttrs = useRef<string | null>(null);
  const sp = <K extends keyof PhysForm>(k: K, v: PhysForm[K]) => setPhys(f => ({ ...f, [k]: v }));
  const sd = <K extends keyof DigForm> (k: K, v: DigForm[K])  => setDig(f  => ({ ...f, [k]: v }));

  function init(p: StoreProduct, v: ProductVariant) {
    setPType(p.productType);
    if (p.categoryId) setCategoryChoice(p.categoryId);
    originalName.current = p.name ?? '';
    setReview(p.status === 'pending_review' || p.status === 'rejected' ? { status: p.status, note: p.reviewNote ?? null } : null);
    setVariantId(v._id || null);
    setLearning({ curricula: [...(p.curricula ?? [])], ageMin: p.ageMin != null ? String(p.ageMin) : '', ageMax: p.ageMax != null ? String(p.ageMax) : '', classFrom: p.classFrom ?? '', classTo: p.classTo ?? '' });
    if (p.productType === 'physical') { setPhys(physFromEntry(p, v)); hadWeight.current = !!String(v?.shippingWeight ?? '').trim(); }
    else                              setDig(digFromEntry(p, v));
  }

  useEffect(() => {
    const stateEntry = state?.entry;
    // A cached/router entry without its variant would show price 0 (or crash) - then read the product fresh instead.
    if (stateEntry?.variant) { init(stateEntry.product, stateEntry.variant); setFetching(false); return; }
    const cached = getCachedProducts(storeId).find(e => e.product._id === productId);
    if (cached?.variant) { init(cached.product, cached.variant); setFetching(false); return; }
    apiGetMyProductById(productId)
      .then(res => {
        // No variant found: leave the price blank (never a made-up 0 that a save would write over the real price).
        const fallback = { _id: '', productId, sku: '', price: '', compareAtPrice: null, options: [], stock: 0, unlimitedStock: false, shippingWeight: null, images: [], isDefault: true, status: 'active', isDelete: false, createdAt: '', updatedAt: '' } as unknown as ProductVariant;
        const variant = res.data.defaultVariant ?? res.data.variants?.[0] ?? fallback;
        init(res.data.product, variant);
      })
      .catch(() => navigate(`/store/${storeId}/products`, { replace: true }))
      .finally(() => setFetching(false));

    // The list cache has no extra license variants or full file list — always
    // read those fresh, without touching what the seller is typing.
    apiGetMyProductById(productId)
      .then(res => {
        const p = res.data.product;
        const variants = res.data.variants ?? [];
        setCampaignIds([...(p.campaignIds ?? [])]);
        setPremiumPct(p.premiumDiscountPercent != null ? String(p.premiumDiscountPercent) : '');
        setPremiumOptOut(!!p.premiumOptOut);
        const pe = p as unknown as { pendingEditInfo?: unknown; lastEditRejection?: { reason?: string } | null };
        setEditReview({ pending: !!pe.pendingEditInfo, rejection: pe.lastEditRejection?.reason ?? null });
        setLearning({ curricula: [...(p.curricula ?? [])], ageMin: p.ageMin != null ? String(p.ageMin) : '', ageMax: p.ageMax != null ? String(p.ageMax) : '', classFrom: p.classFrom ?? '', classTo: p.classTo ?? '' });
        if (p.type === 'digital') {
          setDelivery(deliveryFromProduct(p));
          const priceFor = (label: string) => variants.find(v => !v.isDefault && v.options?.some(o => o.name === 'License' && o.value === label));
          const fresh = digFromEntry(p, res.data.defaultVariant ?? variants[0]);
          setDig(f => ({
            ...f,
            files: fresh.files,
            sampleFile: fresh.sampleFile,
            tiers: EMPTY_TIERS.map(t => {
              const v = priceFor(t.license === 'school' ? 'Whole school' : 'One classroom');
              return v ? { ...t, enabled: true, price: String(v.price) } : t;
            }),
          }));
        }
      })
      .catch(() => {});

    apiGetProductAttributes(productId)
      .then(res => {
        const seeded: AttributeValuesState = {};
        for (const a of res.data) seeded[a.attributeDefinitionId] = a.values;
        setAttributeValues(seeded);
        savedAttrs.current = JSON.stringify(toAttributeInputs(seeded));
      })
      .catch(() => {}); // no existing classification yet — leave the form blank
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = pType === 'physical' ? phys : dig;

  const changeCategory = (id: string) => {
    if (id === categoryId) return;
    setCategoryChoice(id);
    sp('subCategoryId', '');
    sd('subCategoryId', '');
    setAttributeValues({});
  };

  const effectiveCategoryId = cur.subCategoryId || categoryId || null;
  const { definitions: attrDefs, loading: attrLoading } = useCategoryAttributes(effectiveCategoryId);

  const addTag = () => {
    if (pType === 'physical') { const v = phys.tagInput.replace(',', '').trim(); if (v && !phys.tags.includes(v)) sp('tags', [...phys.tags, v]); sp('tagInput', ''); }
    else                      { const v = dig.tagInput.replace(',', '').trim();  if (v && !dig.tags.includes(v))  sd('tags', [...dig.tags, v]);  sd('tagInput', ''); }
  };


  const isDigitalFamily = pType === 'digital' || pType === 'educational';
  const finalStatusOf = (s?: ProductStatus) => s ?? (pType === 'physical' ? phys.status : dig.status);

  // Every rule the form enforces, grouped by the step it belongs to.
  const issues = useMemo<WizardIssue[]>(() => {
    const out: WizardIssue[] = [];
    // Only a title the seller changed must meet the minimum (old short titles stay editable).
    const tErr0 = !cur.name.trim() ? 'Add a product title' : cur.name.trim() !== originalName.current.trim() ? titleError(cur.name) : null;
    if (tErr0) out.push({ step: 0, message: tErr0, fieldId: 'ap-name' });
    if (isDigitalFamily) { const dErr = deliveryError(delivery); if (dErr) out.push({ step: 1, message: dErr, fieldId: 'fld-delivery' }); }
    if (isDigitalFamily && cur.status !== 'draft' && !dig.sampleFile) out.push({ step: 1, message: 'Upload a free sample', fieldId: 'fld-sample' });
    const descErr = descriptionError(cur.description);
    if (descErr) out.push({ step: 0, message: descErr, fieldId: 'ap-desc' });
    const priceCheck = validatePrices({ price: cur.price, compareAt: cur.compareAtPrice, currency: store?.baseCurrency, free: true });
    if (priceCheck.price) out.push({ step: 2, message: priceCheck.price, fieldId: 'ap-price' });
    if (priceCheck.compareAt) out.push({ step: 2, message: priceCheck.compareAt, fieldId: 'ap-compare' });
    if (pType === 'physical') {
      const sErr = stockError(phys.stock, false);
      if (sErr) out.push({ step: 2, message: sErr, fieldId: 'ap-stock' });
      if (hadWeight.current || phys.shippingWeight.trim()) { const wErr = weightTextError(phys.shippingWeight); if (wErr) out.push({ step: 2, message: wErr, fieldId: 'ap-weight' }); }
    }
    if (isDigitalFamily) { const tErr = tiersError(dig.tiers); if (tErr) out.push({ step: 2, message: tErr, fieldId: 'fld-tiers' }); }
    if (pType === 'educational' && !dig.educationLevel) out.push({ step: 3, message: 'Choose an education level', fieldId: 'fld-level' });
    else if (pType === 'educational' && dig.educationLevel === 'other' && !dig.customLevel.trim()) out.push({ step: 3, message: 'Describe the custom education level', fieldId: 'fld-level' });
    const lErr = learningError(learning);
    if (lErr) out.push({ step: 3, message: lErr, fieldId: 'fld-learning' });
    const cErr = cur.status === 'active' || cur.status === 'scheduled' ? classRangeError(pType, learning.classFrom, learning.classTo) : null;
    if (cErr) out.push({ step: 3, message: cErr, fieldId: 'fld-learning', publishOnly: true });
    const missingAttr = findMissingRequiredAttribute(attrDefs, attributeValues);
    if (missingAttr) out.push({ step: 3, message: `${missingAttr.label} is required`, fieldId: 'fld-attrs' });
    const pErr = premiumPercentError(premiumPct ?? '');
    if (pErr) out.push({ step: 4, message: pErr, fieldId: 'fld-offers' });
    // Owner rule: the normal sale must stay at least the admin's gap below the Premium discount (the API enforces it too).
    const gapErr = premiumTerms ? premiumGapMessage(Number(cur.price), Number(cur.compareAtPrice), effectiveSellerPercent(premiumPct ?? '', storePremiumPct, !!premiumOptOut || (campaignIds?.length ?? 0) > 0), premiumTerms.minGapPercent) : null;
    if (gapErr) out.push({ step: 4, message: gapErr, fieldId: 'fld-offers' });
    if (offerFlags.premiumBlank) out.push({ step: 4, message: PREMIUM_BLANK_MESSAGE, fieldId: 'fld-offers' });
    if (offerFlags.conflict) out.push({ step: 4, message: OFFER_CONFLICT_MESSAGE, fieldId: 'fld-offers' });
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, pType, phys.stock, phys.shippingWeight, store?.baseCurrency, dig.sampleFile, dig.tiers, dig.educationLevel, dig.customLevel, delivery, learning, attrDefs, attributeValues, premiumPct, premiumOptOut, campaignIds, premiumTerms, storePremiumPct, offerFlags]);

  const wiz = useWizard(issues, 'Edit', [0, 1, 2, 3, 4, 5]);
  const guard = useLeaveGuard(touched && !saving);

  const handleSubmit = async (statusOverride?: ProductStatus) => {
    setError('');
    if (issues.length) {
      wiz.setAttempted(true);
      setError(issues[0].message);
      wiz.go(issues[0].step, issues[0].fieldId);
      return;
    }
    setSaving(true);
    try {
      const finalStatus = finalStatusOf(statusOverride);
      if (pType === 'physical') {
        const res = await apiEditPhysicalProduct(productId, {
          productId, name: phys.name, description: phys.description,
          categoryId: categoryId || undefined, subCategoryId: phys.subCategoryId || null, images: phys.images, tags: phys.tags,
          isListedOnEdudeen: phys.isListedOnEdudeen, status: finalStatus,
          ...offersPayload({ premiumPct, premiumOptOut, campaignIds }),
          scheduledAt: finalStatus === 'scheduled' ? phys.scheduledAt || null : null,
          ...learningPayload(learning),
        });
        const note = reviewNoticeText(res); if (note) toast.info(note);
        let variant = res.data.variant;
        // The variant update and the attribute list are independent writes: send them together (the product edit above validates first).
        const attrInputs = toAttributeInputs(attributeValues);
        const attrJson = JSON.stringify(attrInputs);
        const [vRes] = await Promise.all([
          variantId ? apiUpdateVariant(productId, variantId, {
            price: Number(phys.price), compareAtPrice: phys.compareAtPrice ? Number(phys.compareAtPrice) : null,
            options: phys.options, stock: Number(phys.stock),
            ...(parseWeightKg(phys.shippingWeight) !== null ? { shippingWeight: `${parseWeightKg(phys.shippingWeight)} kg` } : {}),
          }) : Promise.resolve(null),
          attrJson === savedAttrs.current ? Promise.resolve(null) : apiSetProductAttributes(productId, attrInputs), // replace-all — also clears any removed values
        ]);
        if (vRes) variant = vRes.data;
        updateCachedProduct(storeId, productId, { product: res.data.product, variant });
      } else {
        const toFile = (f: PrivateUploadData) => ({ url: f.publicId, name: f.fileName, size: f.fileSize, mimeType: f.mimeType });
        const files = dig.files.map(toFile);
        const res = await apiEditDigitalProduct(productId, {
          productId, variantId,
          name: dig.name, description: dig.description,
          categoryId: categoryId || undefined, subCategoryId: dig.subCategoryId || null,
          images: dig.images, tags: dig.tags, isListedOnEdudeen: dig.isListedOnEdudeen,
          educationLevel: pType === 'educational' ? (dig.educationLevel || null) : undefined,
          customLevel: pType === 'educational' && dig.educationLevel === 'other' ? dig.customLevel : undefined,
          status: finalStatus,
          ...offersPayload({ premiumPct, premiumOptOut, campaignIds }),
          scheduledAt: finalStatus === 'scheduled' ? dig.scheduledAt || null : null,
          price: Number(dig.price),
          compareAtPrice: dig.compareAtPrice ? Number(dig.compareAtPrice) : null,
          ...learningPayload(learning),
          ...deliveryPayload(delivery),
          licenseTiers: pType === 'educational' && dig.licenseType !== 'commercial' ? tiersPayload(dig.tiers.filter(t => t.license !== dig.licenseType)) : [],
          digital: { files, downloadLimit: dig.downloadLimit, linkExpiryDays: dig.linkExpiryDays ? Number(dig.linkExpiryDays) : null, pdfStampingEnabled: dig.pdfStampingEnabled, licenseType: dig.licenseType, buyerDeliveryMessage: dig.buyerDeliveryMessage, preview: { enabled: dig.previewEnabled, sourceFileIndex: 0 }, sampleFile: dig.sampleFile ? toFile(dig.sampleFile) : null },
        });
        const note = reviewNoticeText(res); if (note) toast.info(note);
        updateCachedProduct(storeId, productId, { product: res.data.product, variant: res.data.variant });
      }

      if (pType !== 'physical') {
        const attrInputs = toAttributeInputs(attributeValues);
        if (JSON.stringify(attrInputs) !== savedAttrs.current) await apiSetProductAttributes(productId, attrInputs); // replace-all — also clears any removed values
      }

      guard.allow.current = true;
      navigate(`/store/${storeId}/products`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div className="bg-cream min-h-screen">
        <div className="px-7 py-5 bg-white border-b border-bone flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <SkeletonBox width={160} height={18} rounded="6px" />
            <SkeletonBox width={120} height={12} rounded="4px" />
          </div>
          <SkeletonBox width={110} height={36} rounded="9px" />
        </div>
        <div className="px-4 sm:px-7 py-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5 items-start">
          <div className="hidden lg:flex flex-col gap-3">
            {WIZARD_STEPS.map(s => <SkeletonBox key={s.key} height={40} rounded="8px" />)}
          </div>
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-bone rounded-[10px] p-5 flex flex-col gap-4">
              <SkeletonBox width="30%" height={14} rounded="4px" />
              <SkeletonBox height={38} rounded="8px" />
              <SkeletonBox height={100} rounded="8px" />
            </div>
            <div className="bg-white border border-bone rounded-[10px] p-5">
              <SkeletonBox height={120} rounded="8px" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const subName = findCategoryName(categories, cur.subCategoryId);
  const summaryRows = [
    { label: 'Type', value: pType === 'physical' ? 'Physical product' : pType === 'educational' ? 'Educational resource' : 'Digital download', step: 0 },
    { label: 'Title', value: cur.name || 'Missing', step: 0, ok: !!cur.name },
    { label: 'Description', value: cur.description ? `${cur.description.length} characters` : 'None yet (recommended)', step: 0 },
    { label: 'Photos', value: cur.images.length ? `${cur.images.length} added` : 'None yet (recommended)', step: 1 },
    ...(isDigitalFamily ? [{ label: 'Files', value: dig.files.length ? `${dig.files.length} uploaded` : 'None', step: 1 }] : []),
    { label: 'Price', value: String(cur.price).trim() === '' ? 'Missing' : `${currencySymbol} ${cur.price}${cur.compareAtPrice ? ` (was ${currencySymbol} ${cur.compareAtPrice})` : ''}`, step: 2, ok: String(cur.price).trim() !== '' },
    ...(pType === 'physical' ? [{ label: 'Stock', value: phys.stock === '' ? 'Not set' : phys.stock, step: 2 }] : []),
    { label: 'Category', value: [rootCategory?.name, subName].filter(Boolean).join(' › ') || 'Not chosen', step: 3 },
    ...(pType === 'educational' ? [{ label: 'Education level', value: dig.educationLevel || 'Missing', step: 3, ok: !!dig.educationLevel }] : []),
    { label: 'Offers', value: (campaignIds?.length ?? 0) > 0 ? 'In a platform sale' : effectiveSellerPercent(premiumPct ?? '', storePremiumPct, !!premiumOptOut) > 0 ? `Premium discount ${effectiveSellerPercent(premiumPct ?? '', storePremiumPct, !!premiumOptOut)}%` : 'None', step: 4 },
    { label: 'Status', value: cur.status === 'active' ? 'Active' : cur.status === 'scheduled' ? 'Scheduled' : 'Draft', step: 5 },
  ];

  const previewData = {
    name: cur.name, images: cur.images, price: String(cur.price), compareAtPrice: cur.compareAtPrice, currency: store?.baseCurrency,
    productType: pType, deliveryFormat: delivery.format, educationLevel: dig.educationLevel, customLevel: dig.customLevel,
    premiumPercent: (campaignIds?.length ?? 0) > 0 ? 0 : effectiveSellerPercent(premiumPct ?? '', storePremiumPct, !!premiumOptOut),
    ageMin: learning.ageMin, ageMax: learning.ageMax, classFrom: learning.classFrom, classTo: learning.classTo, storeName: store?.name,
  };

  const reviewBanner = review ? (
    <div role="status" className={`rounded-xl border px-4 py-3 text-[13px] ${review.status === 'rejected' ? 'border-error/30 bg-error-bg text-error' : 'border-info/30 bg-info-bg text-carbon'}`}>
      {review.status === 'rejected' ? (
        <><b>Edudeen asked for changes:</b> {review.note ?? 'See the note from the review team.'} Fix this and press Save changes with status Active to send it for review again.</>
      ) : (
        <><b>In review.</b> The Edudeen team checks new listings before they go live — usually within a day. You can still edit it.</>
      )}
    </div>
  ) : null;

  return (
    <div className="min-h-full flex flex-col tap-safe" {...dirtyCapture(() => setTouched(true))}>
      <StorePageHeader
        title="Edit product"
        subtitle={`Step ${wiz.step + 1} of ${WIZARD_STEPS.length} — ${WIZARD_STEPS[wiz.step].title}`}
      />

      <div ref={wiz.topRef} className="px-4 md:px-8 py-5 max-lg:pb-24">
        <div className="mx-auto max-w-[1700px] grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[220px_minmax(0,1100px)_300px] items-start">
          <StepRail step={wiz.step} statusOf={wiz.statusOf} onGo={i => wiz.go(i)} />

          <div className="flex flex-col gap-5 min-w-0">
            {editReview.pending && (
              <div role="status" className="rounded-xl border border-info/30 bg-info-bg px-4 py-3 text-[13px] text-carbon">
                <b>Your changes are waiting for Edudeen's review.</b> The live listing keeps its previous content until they are approved. You can keep editing.
              </div>
            )}
            {editReview.rejection && !editReview.pending && (
              <div role="status" className="rounded-xl border border-error/30 bg-error-bg px-4 py-3 text-[13px] text-error">
                <b>Your last changes were not approved:</b> {editReview.rejection} The live listing was not changed.
              </div>
            )}
            {review && wiz.step !== 5 && reviewBanner}
            {error && (
              <p role="alert" className="m-0 flex items-start gap-2 text-[13px] text-error font-medium bg-error-bg border border-error-border rounded-lg px-4 py-3">
                <AlertCircle size={16} className="mt-px shrink-0" /> {error}
              </p>
            )}
            <ProductPreview variant="inline" data={previewData} />

            <ProductFormSteps
              mode="edit" step={wiz.step} go={wiz.go} blockedStep={wiz.blockedStep} stepIssues={wiz.stepIssues} issues={issues}
              storeId={storeId} store={store} currencySymbol={currencySymbol}
              pType={pType} setPType={setPType} supports={{ physical: true, digital: true, educational: true }}
              phys={phys} dig={dig} sp={sp} sd={sd}
              delivery={delivery} setDelivery={setDelivery} learning={learning} setLearning={setLearning}
              offers={{ storePremiumPct, premiumPct, setPremiumPct, premiumOptOut, setPremiumOptOut, campaignIds, setCampaignIds: v => setCampaignIds(v), onFlags: setOfferFlags }}
              category={{ categories, loading: catLoading, error: catError, refetch: refetchCats, categoryId, rootName: rootCategory?.name ?? '', subcategories, change: changeCategory }}
              attrs={{ defs: attrDefs, loading: attrLoading, value: attributeValues, onChange: setAttributeValues }}
              addTag={addTag}
              setStatus={val => { if (pType === 'physical') sp('status', val); else sd('status', val); if (val === 'scheduled') setShowScheduleModal(true); }}
              openSchedule={() => setShowScheduleModal(true)} summaryRows={summaryRows}
              basicsExtra={<UrduCopyCard storeId={storeId} productId={productId} />}
              deliveryExtra={delivery.format === 'course' ? (
                <Link to={`/store/${storeId}/products/${productId}/course`} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-royal text-white px-4 py-2 text-[13px] font-bold no-underline">
                  Open the course builder
                </Link>
              ) : undefined}
              reviewBanner={reviewBanner}
            />

            <WizardNav step={wiz.step} onBack={wiz.back} onNext={wiz.next} />
          </div>

          <ProductPreview variant="column" data={previewData} />
        </div>
      </div>

      <ActionBar
        saving={saving} primaryLabel="Save changes" onPrimary={() => handleSubmit()} onCancel={() => navigate(`/store/${storeId}/products`)}
        saveNote={saving ? 'Saving…' : touched ? 'Unsaved changes' : 'No changes yet'} missing={issues.length} onShowMissing={() => { wiz.setAttempted(true); wiz.go(5); }}
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
}