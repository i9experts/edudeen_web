import { WeightField } from './WeightField';
import type { ReactNode } from 'react';
import { Download, GraduationCap, CalendarClock, Check, Truck, FileDown } from 'lucide-react';
import { EDUCATION_LEVELS } from '@/api/services/product';
import type { CategoryNode } from '@/api/services/categories';
import type { StoreData } from '@/api/services/store';
import type { AttributeDefinition } from '@/api/services/attributes';
import { ProductPhotosUploader } from './ProductPhotosUploader';
import {
  LearningFields, LicenseTiersField, DeliverableFilesField, SampleFileField,
  type LearningValue,
} from '@/features/seller/components/products/LearningFields';
import { DeliveryFormatField, type DeliveryState } from '@/features/seller/components/products/DeliveryFormatField';
import { SubcategoryField } from './SubcategoryField';
import { CustomLevelInput } from './CustomLevelInput';
import { DynamicAttributeFields } from './DynamicAttributeFields';
import type { AttributeValuesState } from './attributeFormUtils';
import { ProductOffersCard, type OfferFlags } from './ProductOffersCard';
import {
  Block, F, MoreOptions, Toggle, TagInput, VariantOptionsField, inp, ta, isDigitalFamilyType,
  type DigForm, type PhysForm, type ProductStatus, type ProductType,
} from './ProductFormKit';
import { IssueLinks, StepPanel, SummaryRows, type WizardIssue } from './ProductWizard';

export interface ProductFormStepsProps {
  mode: 'add' | 'edit';
  step: number;
  go: (step: number, fieldId?: string) => void;
  blockedStep: number | null;
  stepIssues: (step: number, forNext?: boolean) => WizardIssue[];
  issues: WizardIssue[];

  storeId: string;
  store: StoreData | null;
  currencySymbol: string;

  pType: ProductType;
  setPType: (t: ProductType) => void;
  supports: { physical: boolean; digital: boolean; educational: boolean };
  phys: PhysForm; dig: DigForm;
  sp: <K extends keyof PhysForm>(k: K, v: PhysForm[K]) => void;
  sd: <K extends keyof DigForm>(k: K, v: DigForm[K]) => void;

  delivery: DeliveryState; setDelivery: (v: DeliveryState) => void;
  learning: LearningValue; setLearning: (v: LearningValue) => void;
  offers: {
    storePremiumPct: number;
    premiumPct: string | null; setPremiumPct: (v: string) => void;
    premiumOptOut: boolean | null; setPremiumOptOut: (v: boolean) => void;
    campaignIds: string[] | null; setCampaignIds: (v: string[]) => void;
    onFlags?: (f: OfferFlags) => void;
  };
  category: {
    categories: CategoryNode[]; loading: boolean; error: boolean; refetch: () => void;
    categoryId: string; rootName: string; subcategories: CategoryNode[]; change: (id: string) => void;
  };
  attrs: { defs: AttributeDefinition[]; loading: boolean; value: AttributeValuesState; onChange: (v: AttributeValuesState) => void };
  addTag: () => void;

  setStatus: (v: ProductStatus) => void;
  openSchedule: () => void;
  summaryRows: { label: string; value: string; step: number; ok?: boolean }[];

  /** edit-only slots */
  basicsExtra?: ReactNode;
  deliveryExtra?: ReactNode;
  reviewBanner?: ReactNode;
}

/** All six step panels of the product form. Shared by Add and Edit so both stay identical. Panels stay mounted (hidden). */
export function ProductFormSteps(p: ProductFormStepsProps) {
  const { pType, phys, dig, sp, sd, currencySymbol, step, go } = p;
  const isDigitalFamily = isDigitalFamilyType(pType);
  const cur = pType === 'physical' ? phys : dig;
  const set = <K extends 'name' | 'description' | 'price' | 'compareAtPrice' | 'subCategoryId' | 'status' | 'isListedOnEdudeen' | 'scheduledAt' | 'tagInput' | 'tags' | 'images'>(k: K, v: PhysForm[K]) => {
    if (pType === 'physical') sp(k, v); else sd(k, v as unknown as DigForm[K]);
  };
  const digitalAvailable = p.supports.digital || p.supports.educational;
  const discountPct = (() => {
    const pr = Number(cur.price), c = Number(cur.compareAtPrice);
    return pr > 0 && c > pr ? Math.round((1 - pr / c) * 100) : null;
  })();
  const banner = (i: number) => p.blockedStep === i
    ? <IssueLinks issues={p.stepIssues(i, true)} onGo={go} title="Please fix this before moving on" /> : null;

  return (
    <>
      {/* ── 1. Type & basics ─────────────────────────────────────────── */}
      <StepPanel active={step === 0}>
        {banner(0)}
        {p.mode === 'add' ? (
          <Block title="What are you selling?" need="required" hint="Pick physical if you ship it, digital if buyers download it. You can't change this after publishing.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Product kind">
              {([
                { key: 'physical' as const, Icon: Truck,    label: 'Physical product', desc: 'Books, toys, prayer mats, games — anything you pack and ship to the buyer.', enabled: p.supports.physical },
                { key: 'digital'  as const, Icon: FileDown, label: 'Digital product',  desc: 'Worksheets, e-books, lessons, curricula — delivered instantly as a download.', enabled: digitalAvailable },
              ]).map(({ key, Icon: KIcon, label, desc, enabled }) => {
                const sel = key === 'physical' ? pType === 'physical' : isDigitalFamily;
                return (
                  <button key={key} type="button" role="radio" aria-checked={sel}
                    disabled={!enabled}
                    onClick={() => {
                      if (!enabled) return;
                      if (key === 'physical') p.setPType('physical');
                      else if (!isDigitalFamily) p.setPType(p.supports.digital ? 'digital' : 'educational');
                    }}
                    className={`flex items-start gap-4 p-5 rounded-xl text-start border-2 transition-colors ${
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
                    { t: 'digital'     as const, Icon: Download,      label: 'Digital download',     desc: 'Any instant downloadable file', enabled: p.supports.digital     },
                    { t: 'educational' as const, Icon: GraduationCap, label: 'Educational resource', desc: 'Worksheets, lessons, curricula — with an education level', enabled: p.supports.educational },
                  ]).map(({ t, Icon: TIcon, label, desc, enabled }) => {
                    const sel = pType === t;
                    return (
                      <button key={t} type="button" role="radio" aria-checked={sel}
                        onClick={() => enabled && p.setPType(t)} disabled={!enabled}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-start border transition-colors ${
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
          </Block>
        ) : (
          <p className="text-[13px] text-slate m-0">
            Product type: <b className="text-carbon">{pType === 'physical' ? 'Physical product' : pType === 'educational' ? 'Educational resource' : 'Digital download'}</b> (can't be changed).
          </p>
        )}

        <Block title="The basics" need="required" hint="A clear title and an honest description help buyers decide quickly.">
          <div className="flex flex-col gap-4">
            <F label="Product title" req htmlFor="ap-name" hint="Say what it is and who it's for — e.g. age or level.">
              <input id="ap-name" value={cur.name} onChange={e => set('name', e.target.value)}
                placeholder={pType === 'physical' ? 'e.g. Wooden Arabic Alphabet Puzzle (ages 3–6)' : 'e.g. My Purposeful Learning Week — printable planner'}
                className={inp} />
            </F>
            <F label="Description" req htmlFor="ap-desc" hint="Required, at least 20 characters. What's included, the learning goal, and how it's used at home or in class.">
              <textarea id="ap-desc" value={cur.description} onChange={e => set('description', e.target.value)}
                placeholder="Describe your product — what it includes, who it's for, and what makes it special…" className={ta} />
            </F>
          </div>
        </Block>
        {p.basicsExtra}
      </StepPanel>

      {/* ── 2. Photos & files ────────────────────────────────────────── */}
      <StepPanel active={step === 1}>
        {banner(1)}
        <Block title="Photos" need="recommended" hint="Up to 20 images - select several at once. The first image is the cover buyers see in search and on your shelf.">
          <ProductPhotosUploader value={cur.images} onChange={urls => set('images', urls)} />
        </Block>

        {isDigitalFamily && (
          <Block id="fld-delivery" title="How buyers get it" need="required" hint="Downloadable files, an online course with lessons, or a live class at a set time.">
            <DeliveryFormatField value={p.delivery} onChange={p.setDelivery} />
            {p.deliveryExtra}
          </Block>
        )}

        {isDigitalFamily && (
          <Block id="fld-files" title={p.delivery.format === 'download' ? (pType === 'educational' ? 'Resource file' : 'Digital file') : 'Extra files'}
            need={p.delivery.format === 'download' ? 'required' : 'optional'}
            hint={p.delivery.format === 'download' ? 'The file buyers receive instantly after purchase. Required to publish — drafts can be saved without it.' : 'Worksheets, slides or notes buyers can download alongside the ' + (p.delivery.format === 'course' ? 'course.' : 'class.')}>
            <DeliverableFilesField files={dig.files} onChange={v => sd('files', v)} />
          </Block>
        )}

        {isDigitalFamily && (
          <Block title="Free sample" need="optional" hint="Let teachers and parents try before they buy.">
            <SampleFileField value={dig.sampleFile} onChange={v => sd('sampleFile', v)} />
          </Block>
        )}
      </StepPanel>

      {/* ── 3. Price & stock ─────────────────────────────────────────── */}
      <StepPanel active={step === 2}>
        {banner(2)}
        <Block title="Price" need="required" hint={`Prices are in your store's currency (${currencySymbol}). Enter 0 for a free resource.`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label={`Price (${currencySymbol})`} req htmlFor="ap-price">
              <input id="ap-price" type="number" min="0" inputMode="decimal" value={cur.price} onChange={e => set('price', e.target.value)} placeholder="0.00" className={inp} />
            </F>
            <F label={`Compare-at price (${currencySymbol})`} htmlFor="ap-compare" hint="Original price, shown struck through when you offer a discount.">
              <input id="ap-compare" type="number" min="0" inputMode="decimal" value={cur.compareAtPrice} onChange={e => set('compareAtPrice', e.target.value)} placeholder="0.00" className={inp} />
            </F>
          </div>
          {discountPct !== null && (
            <div className="flex items-center gap-1.5 px-3 py-2 mt-3 bg-success-bg border border-success/20 rounded-lg w-fit">
              <span className="text-[12.5px] font-bold text-success">{discountPct}% OFF</span>
              <span className="text-[12px] text-success">shown to buyers</span>
            </div>
          )}
        </Block>

        {pType === 'physical' && (
          <Block title="Stock & options" need="required" hint="How many you have, and any options buyers can choose between.">
            <div className="flex flex-col gap-4">
              <F label="Stock quantity" req htmlFor="ap-stock">
                <input id="ap-stock" type="number" min="0" inputMode="numeric" value={phys.stock} onChange={e => sp('stock', e.target.value)} placeholder="0" className={`${inp} sm:max-w-[240px]`} />
              </F>
              <F label="Shipping weight" req htmlFor="ap-weight" hint="Required. Used to estimate delivery cost (minimum 1 g, maximum 50 kg).">
                <WeightField id="ap-weight" value={phys.shippingWeight} onChange={v => sp('shippingWeight', v)} />
              </F>
              <F label="Variant attributes">
                <VariantOptionsField options={phys.options} onChange={v => sp('options', v)} />
              </F>
            </div>
          </Block>
        )}

        {isDigitalFamily && (
          <Block title="Licence" need="optional" hint="Personal licence is the default. Educational resources can also sell classroom and school licences.">
            <div className="flex flex-col gap-4">
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
              {pType === 'educational' && dig.licenseType !== 'commercial' && (
                <div id="fld-tiers">
                  <F label="Classroom & school licenses">
                    <LicenseTiersField baseLicense={dig.licenseType} tiers={dig.tiers} onChange={v => sd('tiers', v)} currencySymbol={currencySymbol} />
                  </F>
                </div>
              )}
            </div>
          </Block>
        )}

        {isDigitalFamily && <MoreOptions title="More options" hint="Download limit, link expiry, buyer message, PDF stamping, preview">
          {isDigitalFamily && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <F label="Download limit" htmlFor="ap-dl" hint={'Type a number, or leave "unlimited".'}>
                  <input id="ap-dl" value={dig.downloadLimit} onChange={e => sd('downloadLimit', e.target.value)} placeholder="unlimited" className={inp} />
                </F>
                <F label="Link expiry (days)" htmlFor="ap-exp" hint="Leave empty for links that never expire.">
                  <input id="ap-exp" type="number" min="0" value={dig.linkExpiryDays} onChange={e => sd('linkExpiryDays', e.target.value)} placeholder="No expiry" className={inp} />
                </F>
              </div>
              <F label="Buyer delivery message" htmlFor="ap-msg" hint="Shown to the buyer with their download.">
                <textarea id="ap-msg" value={dig.buyerDeliveryMessage} onChange={e => sd('buyerDeliveryMessage', e.target.value)}
                  placeholder="Thank you for your purchase! Here is your download link…" className={ta} />
              </F>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <div>
                  <p className="text-[13.5px] font-bold text-carbon m-0">PDF stamping</p>
                  <p className="text-[12px] text-slate mt-0.5 mb-0">Watermark PDFs with the buyer's name</p>
                </div>
                <Toggle label="PDF stamping" checked={dig.pdfStampingEnabled} onChange={v => sd('pdfStampingEnabled', v)} />
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <div>
                  <p className="text-[13.5px] font-bold text-carbon m-0">Buyer preview</p>
                  <p className="text-[12px] text-slate mt-0.5 mb-0">Let buyers see a watermarked/trimmed preview before purchase</p>
                </div>
                <Toggle label="Buyer preview" checked={dig.previewEnabled} onChange={v => sd('previewEnabled', v)} />
              </div>
            </>
          )}
        </MoreOptions>}
      </StepPanel>

      {/* ── 4. Category & details ────────────────────────────────────── */}
      <StepPanel active={step === 3}>
        {banner(3)}
        <Block title="Category" hint="Choose the category your product belongs to, then (optionally) narrower subcategories to help buyers browse.">
          <SubcategoryField
            mainCategoryName={p.category.rootName}
            mainCategoryId={p.category.categoryId}
            categories={p.category.categories}
            categoryId={p.category.categoryId}
            onCategoryChange={p.category.change}
            categoriesError={p.category.error}
            subcategories={p.category.subcategories}
            loading={p.category.loading}
            value={cur.subCategoryId}
            onChange={id => set('subCategoryId', id)}
            refetch={p.category.refetch}
          />
        </Block>

        {pType === 'educational' && (
          <Block id="fld-level" title="Education level" need="required" hint="Helps parents and teachers find resources for the right stage.">
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
          </Block>
        )}

        <Block id="fld-learning" title="Who it's for" need="optional" hint="Boards, ages and class range help the right buyers find this.">
          <LearningFields value={p.learning} onChange={p.setLearning} />
        </Block>

        {(p.attrs.loading || p.attrs.defs.length > 0) && (
          <Block id="fld-attrs" title="Additional details" hint="Details for this category, such as subject or format. Fields marked Required must be filled.">
            <DynamicAttributeFields definitions={p.attrs.defs} loading={p.attrs.loading} value={p.attrs.value} onChange={p.attrs.onChange} />
          </Block>
        )}

        <MoreOptions title="Tags & search" hint="Words buyers might search for — e.g. seerah, ramadan, phonics">
          <div>
            <TagInput
              tags={cur.tags} input={cur.tagInput}
              onInput={v => set('tagInput', v)}
              onAdd={p.addTag}
              onRemove={i => set('tags', cur.tags.filter((_, idx) => idx !== i))}
            />
            <p className="text-[12px] text-slate mt-2 mb-0">Press Enter or comma to add a tag</p>
          </div>
        </MoreOptions>
      </StepPanel>

      {/* ── 5. Offers & earnings ─────────────────────────────────────── */}
      <StepPanel active={step === 4}>
        {banner(4)}
        <Block id="fld-offers" title="Offers" need="optional" hint="A Premium member discount, or one of Edudeen's platform sales - a product is in one or the other. The calculator shows what you earn.">
          <ProductOffersCard
            storeId={p.storeId} currency={p.store?.baseCurrency} productType={pType} price={cur.price} compareAtPrice={cur.compareAtPrice}
            storePremiumPct={p.offers.storePremiumPct} onEditPrice={() => go(2, 'ap-compare')} premiumPct={p.offers.premiumPct} setPremiumPct={p.offers.setPremiumPct}
            premiumOptOut={p.offers.premiumOptOut} setPremiumOptOut={p.offers.setPremiumOptOut}
            campaignIds={p.offers.campaignIds} setCampaignIds={p.offers.setCampaignIds} onFlags={p.offers.onFlags}
          />
        </Block>
      </StepPanel>

      {/* ── 6. Review & publish ──────────────────────────────────────── */}
      <StepPanel active={step === 5}>
        {p.reviewBanner}
        <IssueLinks issues={p.issues} onGo={go} title={p.issues.length === 1 ? 'One thing is missing' : `${p.issues.length} things are missing`} />
        {p.issues.length === 0 && (
          <p className="m-0 flex items-center gap-2 rounded-xl border border-success/30 bg-success-bg px-4 py-3 text-[13px] font-bold text-success">
            <Check size={16} /> Everything required is filled in.
          </p>
        )}
        <Block title="Review" hint="A quick look at what you entered. Click a missing item above, or any step on the left, to change it.">
          <SummaryRows rows={p.summaryRows} />
        </Block>

        <Block title="Publish" hint="Choose when this product goes live. New listings get a quick check by the Edudeen team first, usually within a day.">
          <div role="radiogroup" aria-label="Listing status" className="flex flex-col gap-1.5">
            {([
              { val: 'active'    as const, label: p.mode === 'edit' ? 'Active' : 'Publish now', desc: p.mode === 'edit' ? 'Live once Edudeen approves it' : 'Goes live once Edudeen approves it', dotCls: 'bg-success' },
              { val: 'scheduled' as const, label: 'Schedule for later', desc: 'Approved first, then live on your date', dotCls: 'bg-brand-royal' },
              { val: 'draft'     as const, label: p.mode === 'edit' ? 'Draft' : 'Keep as draft', desc: 'Only you can see it', dotCls: 'bg-slate' },
            ]).map(({ val, label, desc, dotCls }) => {
              const sel = cur.status === val;
              return (
                <button key={val} type="button" role="radio" aria-checked={sel} onClick={() => p.setStatus(val)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer text-start transition-colors w-full ${sel ? 'bg-brand-pale-orange border-brand-orange' : 'bg-white border-bone hover:bg-cream'}`}>
                  <span className={`w-[8px] h-[8px] rounded-full shrink-0 ${dotCls}`} />
                  <span className="flex-1 min-w-0">
                    <span className={`block text-[13px] font-bold ${sel ? 'text-brand-orange' : 'text-carbon'}`}>{label}</span>
                    <span className="block text-[12px] text-slate">{desc}</span>
                  </span>
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? 'bg-brand-orange border-brand-orange' : 'border-border-hover bg-white'}`}>
                    {sel && <Check size={9} className="text-white" strokeWidth={3.5} />}
                  </span>
                </button>
              );
            })}
          </div>

          {cur.status === 'scheduled' && (
            <button id="fld-schedule" type="button" onClick={p.openSchedule}
              className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-bone bg-cream text-[12.5px] text-carbon cursor-pointer hover:border-brand-orange/40 transition-colors w-full text-start">
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
              <p className="text-[13px] font-bold text-carbon m-0">Also list on Edudeen Marketplace</p>
              <p className="text-[12px] text-slate m-0">Reach buyers beyond your own store</p>
            </div>
            <Toggle label="Also list on Edudeen Marketplace" checked={cur.isListedOnEdudeen} onChange={v => set('isListedOnEdudeen', v)} />
          </div>
        </Block>
      </StepPanel>
    </>
  );
}
