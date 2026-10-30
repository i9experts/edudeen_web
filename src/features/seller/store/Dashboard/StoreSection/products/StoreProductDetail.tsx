import { useState, useEffect } from 'react';
import { formatPrice } from '@/utils/formatPrice';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Edit2, Package, Download, Tag, Globe,
  Calendar, CheckCircle, XCircle, Hash, MonitorPlay, Users, BookOpen,
} from 'lucide-react';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { apiGetMyProductById } from '@/api/services/product';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { apiGetCourseBuilder, type CourseBuilderData } from '@/api/services/classroom';
import { DeliveryFormatBadge } from '@/components/comman/ui/DeliveryFormatBadge';
import { normalizeDeliveryFormat, deliveryFormatLabel } from '@/utils/deliveryFormat';
import { getCachedProducts, type ProductEntry } from './_cache';
import { SkeletonBox, StatusBadge, InfoRow, Card, Button } from '@/components/comman/ui';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

// A titled panel, composed on top of the shared `Card` (rather than a
// from-scratch bordered div) so this page picks up the same container
// styling/tokens as every other panel in the app — the title+icon header
// row itself is specific enough to this detail-page layout that it isn't
// worth adding as a variant of the generic `Card`.
function SectionCard({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <Card padding="none">
      <div className="px-5 py-3.5 border-b border-bone flex items-center gap-2">
        {Icon && <Icon size={14} className="text-brand-orange shrink-0" />}
        <p className="text-[12px] font-bold text-charcoal uppercase tracking-[0.06em]">{title}</p>
      </div>
      <div className="px-5 py-1">{children}</div>
    </Card>
  );
}

function findCategoryName(nodes: CategoryNode[], id?: string | null): string | null {
  if (!id) return null;
  for (const n of nodes) {
    if (n._id === id) return n.name;
    const hit = findCategoryName(n.children ?? [], id);
    if (hit) return hit;
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StoreProductDetail() {
  const navigate           = useNavigate();
  const { state }          = useLocation() as { state: { entry?: ProductEntry } | null };
  const { productId = '' } = useParams<{ productId: string }>();
  const { storeId, store } = useStoreWorkspace();

  const [entry,    setEntry]    = useState<ProductEntry | null>(state?.entry ?? null);
  const [fetching, setFetching] = useState(!state?.entry);
  const [names, setNames] = useState<{ category: string | null; sub: string | null }>({ category: null, sub: null });
  const [course, setCourse] = useState<CourseBuilderData | null>(null);

  useEffect(() => {
    let alive = true;
    const cached = state?.entry ?? getCachedProducts(storeId).find(e => e.product._id === productId) ?? null;
    if (cached) { setEntry(cached); setFetching(false); }
    // Always read the fresh product too: the list cache has no category names.
    apiGetMyProductById(productId)
      .then(async res => {
        if (!alive) return;
        setEntry({
          product: res.data.product,
          // The real default variant (never a made-up price 0, which the Edit form would then inherit).
          variant: res.data.defaultVariant ?? res.data.variants?.[0] ?? cached?.variant ?? { _id: '', productId, sku: '—', price: 0, compareAtPrice: null, options: [], stock: 0, unlimitedStock: false, shippingWeight: null, images: [], isDefault: true, status: 'active', isDelete: false, createdAt: '', updatedAt: '' },
        });
        let category = res.data.categoryName ?? null;
        let sub = res.data.subCategoryName ?? null;
        // Older API: resolve the names from the category tree instead of printing ids.
        if ((!category && res.data.product.categoryId) || (!sub && res.data.product.subCategoryId)) {
          try {
            const tree = (await apiGetCategoryTree()).data ?? [];
            category = category ?? findCategoryName(tree, res.data.product.categoryId);
            sub = sub ?? findCategoryName(tree, res.data.product.subCategoryId);
          } catch { /* shows a dash */ }
        }
        if (alive) setNames({ category, sub });
      })
      .catch(() => { if (alive && !cached) navigate(`/store/${storeId}/products`, { replace: true }); })
      .finally(() => { if (alive) setFetching(false); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const format = normalizeDeliveryFormat(entry?.product.deliveryFormat);
  useEffect(() => {
    if (format !== 'course') return;
    apiGetCourseBuilder(storeId, productId).then(res => setCourse(res.data)).catch(() => {});
  }, [format, storeId, productId]);

  if (fetching) {
    return (
      <div className="bg-cream min-h-screen">

        {/* ── Header skeleton ── */}
        <div className="sticky top-0 z-10 bg-white border-b border-bone px-7 py-[14px] flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <SkeletonBox width={220} height={17} rounded="6px" />
            <SkeletonBox width={90} height={18} rounded="5px" />
          </div>
          <SkeletonBox width={150} height={38} rounded="9px" />
        </div>

        <div className="px-7 py-5 flex flex-col gap-4">

          {/* ── Hero skeleton ── */}
          <div className="bg-white border border-bone rounded-[10px] overflow-hidden flex">
            <SkeletonBox width={200} height={200} rounded="0px" className="shrink-0" />
            <div className="flex-1 px-6 py-5 flex flex-col gap-3">
              <SkeletonBox width="55%" height={20} rounded="6px" />
              <SkeletonBox width="30%" height={14} rounded="5px" />
              <SkeletonBox width="90%" height={14} rounded="5px" />
              <div className="flex items-center gap-6 pt-4 mt-4 border-t border-bone">
                <SkeletonBox width={70} height={30} rounded="5px" />
                <SkeletonBox width={70} height={30} rounded="5px" />
                <SkeletonBox width={70} height={30} rounded="5px" />
                <SkeletonBox width={70} height={30} rounded="5px" />
              </div>
            </div>
          </div>

          {/* ── Content grid skeleton ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">

            {/* Left column */}
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-bone rounded-[10px] px-5 py-4 flex flex-col gap-3">
                  <SkeletonBox width={140} height={12} rounded="4px" />
                  <SkeletonBox width="100%" height={14} rounded="5px" />
                  <SkeletonBox width="100%" height={14} rounded="5px" />
                  <SkeletonBox width="60%" height={14} rounded="5px" />
                </div>
              ))}
            </div>

            {/* Right sidebar */}
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-bone rounded-[10px] px-5 py-4 flex flex-col gap-3">
                  <SkeletonBox width={100} height={12} rounded="4px" />
                  <SkeletonBox width="100%" height={14} rounded="5px" />
                  <SkeletonBox width="50%" height={14} rounded="5px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!entry) return null;

  const { product: p, variant: v } = entry;
  const isPhysical = p.productType === 'physical';
  const isDigital  = !isPhysical;
  const typeLabel  = isPhysical ? 'Physical' : 'Digital';
  const discountPct = v.compareAtPrice != null && v.compareAtPrice > v.price
    ? Math.round(((v.compareAtPrice - v.price) / v.compareAtPrice) * 100)
    : null;

  return (
    <div className="bg-cream min-h-screen">

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-bone px-7 py-[14px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[17px] font-bold text-charcoal leading-tight">{p.name}</h1>
            <div className="flex items-center gap-2 mt-[3px]">
              <StatusBadge status={p.status} />
              {p.slug && <span className="text-[12px] text-slate">/{p.slug}</span>}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/store/${storeId}/products/edit/${p._id}`, { state: { entry } })}
          className="flex items-center gap-1.5 bg-brand-orange text-white border-none rounded-[9px] px-5 py-[10px] text-[13px] font-semibold cursor-pointer hover:opacity-90 transition-opacity"
        >
          <Edit2 size={14} /> Edit Product
        </button>
      </div>

      <div className="px-7 py-5 flex flex-col gap-4">

        {/* ── Hero ── */}
        <div className="bg-white border border-bone rounded-[10px] overflow-hidden flex">
          {/* Image */}
          <div className="w-[200px] shrink-0 bg-[#f5f4ef] flex items-center justify-center border-r border-bone">
            {p.images?.[0]
              ? <img loading="lazy" decoding="async" src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
              : (
                <div className="flex flex-col items-center gap-2 p-6">
                  {isDigital ? <Download size={28} className="text-dark-text" /> : <Package size={28} className="text-dark-text" />}
                  <span className="text-[12px] text-slate">No image</span>
                </div>
              )}
          </div>

          {/* Key info */}
          <div className="flex-1 px-6 py-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-[18px] font-bold text-charcoal leading-tight">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={p.status} />
                    <span className="text-[12px] text-slate flex items-center gap-1">
                      {isDigital ? <Download size={11} /> : <Package size={11} />}
                      {isDigital ? `${typeLabel} · ${deliveryFormatLabel(format)}` : `${typeLabel} Product`}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[24px] font-bold text-brand-orange">{formatPrice(v.price, store?.baseCurrency)}</p>
                  {v.compareAtPrice != null && (
                    <p className="text-[12px] text-slate line-through mt-0.5">{formatPrice(v.compareAtPrice, store?.baseCurrency)}</p>
                  )}
                  {discountPct !== null && (
                    <span className="inline-block text-[12px] font-bold text-success bg-success-bg px-2 py-0.5 rounded-[5px] mt-1">{discountPct}% OFF</span>
                  )}
                </div>
              </div>

              {p.description && (
                <p className="text-[12px] text-slate leading-[1.6] line-clamp-2">{p.description}</p>
              )}
            </div>

            {/* Quick stats row */}
            <div className="flex items-center gap-6 pt-4 mt-4 border-t border-bone">
              {!isDigital && (
                <div>
                  <p className="text-[12px] text-slate uppercase tracking-[0.06em] font-semibold">Stock</p>
                  <p className="text-[14px] font-bold text-charcoal mt-0.5">{v.stock} units</p>
                </div>
              )}
              <div>
                <p className="text-[12px] text-slate uppercase tracking-[0.06em] font-semibold">Marketplace</p>
                <p className="text-[14px] font-bold text-charcoal mt-0.5">{p.isListedOnEdudeen ? 'Listed' : 'Not listed'}</p>
              </div>
              <div>
                <p className="text-[12px] text-slate uppercase tracking-[0.06em] font-semibold">Tags</p>
                <p className="text-[14px] font-bold text-charcoal mt-0.5">{(p.tags ?? []).length}</p>
              </div>
              <div>
                <p className="text-[12px] text-slate uppercase tracking-[0.06em] font-semibold">Created</p>
                <p className="text-[14px] font-bold text-charcoal mt-0.5">{formatDate(p.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">

          {/* ── Left column ── */}
          <div className="flex flex-col gap-4">

            {/* Basic Info */}
            <SectionCard title="Basic Information" icon={Package}>
              <InfoRow label="Product Name" value={<strong>{p.name}</strong>} />
              <InfoRow label="Product Type" value={
                isPhysical ? (
                  <span className="flex items-center gap-1.5 justify-end"><Package size={12} className="text-brand-orange" /> Physical Product</span>
                ) : (
                  <span className="flex items-center gap-2 justify-end flex-wrap">
                    <DeliveryFormatBadge format={format} />
                  </span>
                )
              } />
              <InfoRow label="Category"    value={names.category || '—'} />
              <InfoRow label="Sub-Category" value={names.sub || '—'} />
              {p.description && (
                <div className="py-3">
                  <p className="text-[12px] text-slate mb-1.5">Description</p>
                  <p className="text-[13px] text-charcoal leading-[1.7]">{p.description}</p>
                </div>
              )}
            </SectionCard>

            {/* Pricing */}
            <SectionCard title="Pricing" icon={Tag}>
              <InfoRow label="Selling Price" value={
                <span className="font-bold text-charcoal">{formatPrice(v.price, store?.baseCurrency)}</span>
              } />
              <InfoRow label="Compare At Price" value={
                v.compareAtPrice != null
                  ? <span className="line-through text-slate">{formatPrice(v.compareAtPrice, store?.baseCurrency)}</span>
                  : '—'
              } />
              {discountPct !== null && (
                <InfoRow label="Discount" value={
                  <span className="font-semibold text-success">{discountPct}% off</span>
                } />
              )}
            </SectionCard>

            {/* Physical: Inventory */}
            {!isDigital && (
              <SectionCard title="Inventory & Shipping" icon={Package}>
                <InfoRow label="SKU"             value={<code className="text-[12px] bg-bone px-[6px] py-[2px] rounded font-mono">{v.sku}</code>} />
                <InfoRow label="Stock"           value={`${v.stock} units`} />
                {(v.options ?? []).map(o => (
                  <InfoRow key={o.name} label={o.name} value={o.value} />
                ))}
                <InfoRow label="Shipping Weight" value={v.shippingWeight || '—'} />
              </SectionCard>
            )}

            {/* Online course: curriculum summary */}
            {isDigital && format === 'course' && (
              <SectionCard title="Online course" icon={MonitorPlay}>
                {(() => {
                  const sections = course?.sections ?? [];
                  const lessons = sections.reduce((n, s) => n + s.lessons.length, 0);
                  const minutes = sections.reduce((n, s) => n + s.lessons.reduce((m, l) => m + (l.durationMinutes ?? 0), 0), 0);
                  const byType = (t: string) => sections.reduce((n, s) => n + s.lessons.filter(l => l.type === t).length, 0);
                  return (
                    <>
                      <InfoRow label="Sections" value={course ? sections.length : '…'} />
                      <InfoRow label="Lessons" value={course ? `${lessons} (${byType('video')} video, ${byType('pdf')} PDF, ${byType('text')} text, ${byType('quiz')} quiz)` : '…'} />
                      <InfoRow label="Total length" value={course ? (minutes ? `${minutes} min` : '—') : '…'} />
                      <InfoRow label="Free previews" value={course ? sections.reduce((n, s) => n + s.lessons.filter(l => l.isPreview).length, 0) : '…'} />
                      <InfoRow label="Certificate" value={course ? (course.certificateEnabled ? 'Yes' : 'No') : '…'} />
                      <InfoRow label="Access" value={course ? (course.accessDays ? `${course.accessDays} days` : 'Lifetime') : '…'} />
                      <InfoRow label="Students" value={course ? course.learners : '…'} />
                      <div className="py-3 flex gap-2 flex-wrap">
                        <Button size="sm" variant="primary" to={`/store/${storeId}/products/${p._id}/course`}><BookOpen size={13} /> Edit / build course</Button>
                        <Button size="sm" variant="outline" to={`/store/${storeId}/products/${p._id}/course/students`}><Users size={13} /> Students & progress</Button>
                      </div>
                    </>
                  );
                })()}
              </SectionCard>
            )}

            {/* Digital delivery (file downloads only) */}
            {isDigital && format === 'download' && p.digital && (
              <SectionCard title="Digital Delivery" icon={Download}>
                {(p.digital.files ?? []).length > 0 ? (
                  <div className="py-3 border-b border-bone">
                    <p className="text-[12px] text-slate mb-2">Attached File</p>
                    {(p.digital.files ?? []).map((f, i) => (
                      <div key={i} className="flex items-center gap-2.5 bg-[#f5f4ef] border border-bone rounded-lg px-3 py-2.5">
                        <Download size={14} className="text-brand-orange shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-charcoal truncate">{f.name}</p>
                          <p className="text-[12px] text-slate mt-0.5">{f.mimeType} · {f.size > 0 ? `${(f.size / 1024 / 1024).toFixed(2)} MB` : '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <InfoRow label="File" value="No file attached" />
                )}
                <InfoRow label="Download Limit" value={p.digital.downloadLimit === 'unlimited' ? 'Unlimited' : p.digital.downloadLimit} />
                <InfoRow label="Link Expiry"    value={p.digital.linkExpiryDays ? `${p.digital.linkExpiryDays} days` : 'No expiry'} />
                <InfoRow label="License"        value={<span className="capitalize">{p.digital.licenseType}</span>} />
                <InfoRow label="PDF Stamping"   value={
                  p.digital.pdfStampingEnabled
                    ? <span className="flex items-center gap-1 text-success justify-end"><CheckCircle size={13} /> Enabled</span>
                    : <span className="flex items-center gap-1 text-slate justify-end"><XCircle size={13} /> Disabled</span>
                } />
                {p.digital.buyerDeliveryMessage && (
                  <div className="py-3">
                    <p className="text-[12px] text-slate mb-1.5">Buyer Delivery Message</p>
                    <p className="text-[12px] text-charcoal leading-[1.6] italic bg-[#f5f4ef] px-3 py-2.5 rounded-lg border border-bone">
                      "{p.digital.buyerDeliveryMessage}"
                    </p>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Tags */}
            {(p.tags ?? []).length > 0 && (
              <SectionCard title="Tags" icon={Tag}>
                <div className="flex flex-wrap gap-1.5 py-3">
                  {(p.tags ?? []).map((t, i) => (
                    <span key={i} className="bg-brand-pale-orange text-brand-orange border border-brand-orange/20 rounded-[6px] px-[10px] py-[4px] text-[12px] font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="flex flex-col gap-4">

            {/* Additional images */}
            {(p.images ?? []).length > 1 && (
              <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-bone">
                  <p className="text-[12px] font-bold text-charcoal uppercase tracking-[0.06em]">Images</p>
                </div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(p.images ?? []).map((img, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-[#f5f4ef] border border-bone">
                      <img loading="lazy" decoding="async" src={img} alt={`${p.name} ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings */}
            <SectionCard title="Settings" icon={Globe}>
              <InfoRow label="Marketplace" value={
                p.isListedOnEdudeen
                  ? <span className="flex items-center gap-1 text-success justify-end"><CheckCircle size={13} /> Listed</span>
                  : <span className="flex items-center gap-1 text-slate justify-end"><XCircle size={13} /> Not listed</span>
              } />
              {!isDigital && <InfoRow label="SKU" value={<code className="text-[12px] bg-bone px-[6px] py-[2px] rounded font-mono">{v.sku}</code>} />}
            </SectionCard>

            {/* Timeline */}
            <SectionCard title="Timeline" icon={Calendar}>
              <InfoRow label="Created"      value={formatDate(p.createdAt)} />
              <InfoRow label="Last Updated" value={formatDate(p.updatedAt)} />
            </SectionCard>

            {/* Product ID */}
            <SectionCard title="Product ID" icon={Hash}>
              <div className="py-3">
                <p className="text-[12px] text-slate font-mono break-all leading-[1.6]">{p._id}</p>
              </div>
            </SectionCard>

          </div>
        </div>
      </div>
    </div>
  );
}
