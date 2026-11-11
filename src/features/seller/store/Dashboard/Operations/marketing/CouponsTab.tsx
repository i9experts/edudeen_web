import { useEffect, useState, useCallback } from 'react';
import { Tag as TagIcon, Plus } from 'lucide-react';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { EmptyState, SkeletonBox, Modal, Button } from '@/components/comman/ui';
import { currencySymbol } from '@/utils/currency';
import { apiGetCoupons, apiCreateCoupon, apiUpdateCoupon, apiDeleteCoupon, type Coupon, type DiscountType, type CouponScope } from '@/api/services/marketing';
import { INPUT_CLS } from './marketingShared';
import { CouponScopePicker } from './CouponScopePicker';
import { PromotionStatsRow } from './PromotionStatsContext';

/** Computed status from the API; falls back to the stored flag + expiry for older responses. */
function couponState(c: { status?: string; isActive: boolean; expiresAt: string | null }): 'active' | 'paused' | 'expired' | 'scheduled' {
  if (c.status === 'active' || c.status === 'paused' || c.status === 'expired' || c.status === 'scheduled') return c.status;
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return 'expired';
  return c.isActive ? 'active' : 'paused';
}

const emptyForm = {
  code: '', discountType: '' as DiscountType | '', value: '', minOrder: '', usageLimit: '', expiryDate: '',
  appliesTo: 'store' as CouponScope, targetIds: [] as string[], startDate: '', perCustomer: '',
  firstOrderOnly: false, visibility: 'private' as 'public' | 'private',
};
const SCOPE_LABEL: Record<CouponScope, string> = { store: 'Whole store', categories: 'Selected categories', products: 'Selected products' };

export function CouponsTab() {
  const { store, storeId } = useStoreWorkspace();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    apiGetCoupons(storeId)
      .then(res => setCoupons(res.data.coupons ?? []))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load coupons.'))
      .finally(() => setLoading(false));
  }, [storeId]);
  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
  }

  function startEdit(c: Coupon) {
    setEditingId(c._id);
    setForm({
      code: c.code,
      discountType: c.discountType,
      value: String(c.discountValue),
      minOrder: c.minOrderAmount != null ? String(c.minOrderAmount) : '',
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : '',
      expiryDate: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      appliesTo: c.appliesTo ?? 'store',
      targetIds: c.targetIds ?? [],
      startDate: c.startsAt ? c.startsAt.slice(0, 10) : '',
      perCustomer: c.perCustomerLimit != null ? String(c.perCustomerLimit) : '',
      firstOrderOnly: !!c.firstOrderOnly,
      visibility: c.visibility ?? 'private',
    });
    setFormErrors({});
    setFormOpen(true);
  }

  async function togglePause(c: Coupon) {
    setError('');
    try {
      const res = await apiUpdateCoupon(storeId, c._id, { isActive: !c.isActive });
      setCoupons(prev => prev.map(x => x._id === c._id ? res.data : x));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update coupon.');
    }
  }

  function validateCoupon() {
    const errs: Record<string, string> = {};
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) errs.code = 'Use 3-20 letters, numbers, - or _';
    if (!form.discountType) errs.discountType = 'Choose a discount type';
    const value = Number(form.value);
    if (!form.value || !Number.isFinite(value) || value <= 0) errs.value = 'Enter a value greater than 0';
    else if (form.discountType === 'percentage' && value > 90) errs.value = 'Percentage cannot exceed 90';
    const min = form.minOrder ? Number(form.minOrder) : null;
    if (min !== null && (!Number.isFinite(min) || min < 0)) errs.minOrder = 'Enter 0 or more';
    else if (form.discountType === 'fixed' && min && value > min) errs.value = 'Fixed discount cannot be more than the minimum order';
    if (form.usageLimit && (!Number.isInteger(Number(form.usageLimit)) || Number(form.usageLimit) < 1)) errs.usageLimit = 'Enter a whole number, 1 or more';
    if (form.expiryDate) {
      const d = new Date(`${form.expiryDate}T23:59:59`);
      if (Number.isNaN(d.getTime()) || d.getTime() < Date.now()) errs.expiryDate = 'Expiry date cannot be in the past';
    }
    if (form.startDate && form.expiryDate && form.startDate >= form.expiryDate) errs.startDate = 'Start date must be before the expiry date';
    if (form.perCustomer && (!Number.isInteger(Number(form.perCustomer)) || Number(form.perCustomer) < 1)) errs.perCustomer = 'Enter a whole number, 1 or more';
    if (form.appliesTo !== 'store' && form.targetIds.length === 0) errs.targetIds = form.appliesTo === 'products' ? 'Pick at least one product' : 'Pick at least one category';
    setFormErrors(errs);
    return errs;
  }

  async function handleSubmit() {
    if (saving) return;
    setFormErrors({});
    if (Object.keys(validateCoupon()).length) return;
    const payload = {
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType as DiscountType,
      discountValue: Number(form.value),
      minOrderAmount: form.minOrder ? Number(form.minOrder) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      expiresAt: form.expiryDate || undefined,
      appliesTo: form.appliesTo,
      targetIds: form.appliesTo === 'store' ? [] : form.targetIds,
      // null clears on edit; create ignores nothing (API treats null as none)
      startsAt: form.startDate ? form.startDate : (editingId ? null : undefined),
      perCustomerLimit: form.perCustomer ? Number(form.perCustomer) : (editingId ? null : undefined),
      firstOrderOnly: form.firstOrderOnly,
      visibility: form.visibility,
    };
    setSaving(true);
    try {
      if (editingId) {
        const res = await apiUpdateCoupon(storeId, editingId, payload);
        setCoupons(prev => prev.map(c => c._id === editingId ? res.data : c));
      } else {
        const res = await apiCreateCoupon(storeId, payload);
        setCoupons(prev => [res.data, ...prev]);
      }
      setSaving(false);
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setSaving(false);
      setFormErrors({ _form: err instanceof Error ? err.message : 'Failed to save coupon.' });
    }
  }

  async function confirmDelete() {
    if (!deletingCoupon) return;
    setDeleteBusy(true);
    setError('');
    try {
      await apiDeleteCoupon(storeId, deletingCoupon._id);
      setCoupons(prev => prev.filter(c => c._id !== deletingCoupon._id));
      setDeletingCoupon(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete coupon.');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[15px] font-bold text-carbon">Coupons</p>
          <Button icon={<Plus size={14} />} onClick={openCreate}>Create coupon</Button>
        </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white border border-bone rounded-[10px] px-[22px] py-5 flex flex-col gap-3">
                    <SkeletonBox width="45%" height={26} rounded="8px" />
                    <SkeletonBox width="60%" height={16} />
                    <SkeletonBox width="100%" height={40} rounded="6px" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex items-center gap-3"><p className="text-xs text-error">{error}</p><Button variant="ghost" size="sm" onClick={load}>Retry</Button></div>
            ) : coupons.length === 0 ? (
              <EmptyState
                icon={<TagIcon size={28} className="text-brand-orange opacity-55" />}
                title="No coupons yet"
                description="Create your first coupon to give buyers a discount code."
                action={{ label: 'Create coupon', onClick: openCreate }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map(coupon => (
                  <div key={coupon._id} className="bg-white border border-bone rounded-[10px] px-[22px] py-5 transition-transform duration-200 hover:-translate-y-[1px]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="px-3 py-[5px] rounded-lg border-2 border-dashed border-brand-orange font-mono text-[13px] font-bold text-brand-deep-orange bg-brand-pale-orange">
                        {coupon.code}
                      </div>
                      <span className="px-2.5 py-[3px] rounded-[5px] text-[12px] font-semibold" style={{ background: couponState(coupon) === 'active' ? '#E3F4EA' : couponState(coupon) === 'expired' ? '#FBE9E7' : couponState(coupon) === 'scheduled' ? '#E8F0FB' : '#F0EEE6', color: couponState(coupon) === 'active' ? '#1E7A3C' : couponState(coupon) === 'expired' ? '#B3261E' : couponState(coupon) === 'scheduled' ? '#1F4E9A' : '#5A5852' }}>
                        {couponState(coupon) === 'active' ? 'Active' : couponState(coupon) === 'expired' ? 'Expired' : couponState(coupon) === 'scheduled' ? 'Scheduled' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-carbon mb-3">
                      {coupon.discountType === 'percentage' ? `${coupon.discountValue}% Off` : `${currencySymbol(store?.baseCurrency)}${coupon.discountValue} Off`}
                    </p>
                    <table className="w-full border-collapse text-xs mb-3">
                      <tbody>
                        {[
                          ['Uses', `${coupon.usageCount} / ${coupon.usageLimit ?? 'Unlimited'}`],
                          ...(coupon.startsAt ? [['Starts', new Date(coupon.startsAt).toLocaleDateString()]] : []),
                          ['Expires', coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'],
                          ['Applies to', SCOPE_LABEL[coupon.appliesTo ?? 'store']],
                          ...(coupon.perCustomerLimit ? [['Per customer', String(coupon.perCustomerLimit)]] : []),
                          ...(coupon.firstOrderOnly ? [['First order only', 'Yes']] : []),
                          ['Visible', coupon.visibility === 'public' ? 'Public badge' : 'Code only'],
                        ].map(([label, val]) => (
                          <tr key={label} style={{ borderBottom: '1px solid #F0EEE6' }}>
                            <td className="py-1.5 text-slate">{label}</td>
                            <td className="py-1.5 font-semibold text-carbon text-right">{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <PromotionStatsRow kind="coupon" id={coupon._id} />
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => startEdit(coupon)} className="flex-1 min-h-11 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">Edit</button>
                      <button onClick={() => togglePause(coupon)} className="flex-1 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">{couponState(coupon) === 'paused' ? 'Activate' : 'Pause'}</button>
                      <button onClick={() => setDeletingCoupon(coupon)} className="flex-1 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-error cursor-pointer transition-colors duration-150 hover:bg-error hover:text-white hover:border-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>

      {formOpen && (
        <Modal
          title={editingId ? 'Edit coupon' : 'Create coupon'}
          onClose={closeForm}
          drawer
          footer={
            <>
              <Button variant="ghost" onClick={closeForm} disabled={saving}>Cancel</Button>
              <Button onClick={handleSubmit} loading={saving}>{editingId ? 'Update coupon' : 'Create coupon'}</Button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-3.5">
                <div>
                  <label htmlFor="cp-code" className="text-xs font-medium text-graphite mb-[5px] block">Coupon Code <span className="text-error">*</span></label>
                  <input id="cp-code" aria-invalid={!!formErrors.code} aria-describedby={formErrors.code ? 'cp-code-err' : undefined} placeholder="e.g. SAVE20" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className={INPUT_CLS} />
                  {formErrors.code && <p id="cp-code-err" className="text-[11.5px] text-error mt-1">{formErrors.code}</p>}
                </div>
                <div>
                  <label htmlFor="cp-discountType" className="text-xs font-medium text-graphite mb-[5px] block">Discount Type <span className="text-error">*</span></label>
                  <select id="cp-discountType" aria-invalid={!!formErrors.discountType} aria-describedby={formErrors.discountType ? 'cp-discountType-err' : undefined} value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as DiscountType }))}
                    className={`${INPUT_CLS} cursor-pointer`}>
                    <option value="">Select type…</option>
                    <option value="percentage">Percentage Off</option>
                    <option value="fixed">Fixed Amount Off</option>
                  </select>
                  {formErrors.discountType && <p id="cp-discountType-err" className="text-[11.5px] text-error mt-1">{formErrors.discountType}</p>}
                </div>
                <div>
                  <label htmlFor="cp-value" className="text-xs font-medium text-graphite mb-[5px] block">Value <span className="text-error">*</span></label>
                  <input id="cp-value" aria-invalid={!!formErrors.value} aria-describedby={formErrors.value ? 'cp-value-err' : undefined} placeholder="e.g. 20 or 10.00" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    className={INPUT_CLS} />
                  {formErrors.value && <p id="cp-value-err" className="text-[11.5px] text-error mt-1">{formErrors.value}</p>}
                </div>
                <div>
                  <label htmlFor="cp-minOrder" className="text-xs font-medium text-graphite mb-[5px] block">Minimum Order ({currencySymbol(store?.baseCurrency)})</label>
                  <input id="cp-minOrder" aria-invalid={!!formErrors.minOrder} aria-describedby={formErrors.minOrder ? 'cp-minOrder-err' : undefined} placeholder="0" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))}
                    className={INPUT_CLS} />
                  {formErrors.minOrder && <p id="cp-minOrder-err" className="text-[11.5px] text-error mt-1">{formErrors.minOrder}</p>}
                </div>
                <div>
                  <label htmlFor="cp-usageLimit" className="text-xs font-medium text-graphite mb-[5px] block">Usage Limit</label>
                  <input id="cp-usageLimit" aria-invalid={!!formErrors.usageLimit} aria-describedby={formErrors.usageLimit ? 'cp-usageLimit-err' : undefined} placeholder="Leave blank for unlimited" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))}
                    className={INPUT_CLS} />
                  {formErrors.usageLimit && <p id="cp-usageLimit-err" className="text-[11.5px] text-error mt-1">{formErrors.usageLimit}</p>}
                </div>
                <div>
                  <label htmlFor="cp-expiryDate" className="text-xs font-medium text-graphite mb-[5px] block">Expiry Date</label>
                  <input id="cp-expiryDate" aria-invalid={!!formErrors.expiryDate} aria-describedby={formErrors.expiryDate ? 'cp-expiryDate-err' : undefined} type="date" min={new Date().toISOString().slice(0, 10)} value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                    className={INPUT_CLS} />
                  {formErrors.expiryDate && <p id="cp-expiryDate-err" className="text-[11.5px] text-error mt-1">{formErrors.expiryDate}</p>}
                </div>
                <div>
                  <label htmlFor="cp-startDate" className="text-xs font-medium text-graphite mb-[5px] block">Start Date</label>
                  <input id="cp-startDate" aria-invalid={!!formErrors.startDate} type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={INPUT_CLS} />
                  <p className="text-[11.5px] text-slate mt-1">Leave blank to start right away.</p>
                  {formErrors.startDate && <p className="text-[11.5px] text-error mt-1">{formErrors.startDate}</p>}
                </div>
                <div>
                  <label htmlFor="cp-appliesTo" className="text-xs font-medium text-graphite mb-[5px] block">Applies to</label>
                  <select id="cp-appliesTo" value={form.appliesTo} onChange={e => setForm(f => ({ ...f, appliesTo: e.target.value as CouponScope, targetIds: [] }))} className={`${INPUT_CLS} cursor-pointer`}>
                    <option value="store">Whole store</option>
                    <option value="categories">Selected categories</option>
                    <option value="products">Selected products</option>
                  </select>
                </div>
                {form.appliesTo !== 'store' && (
                  <CouponScopePicker storeId={storeId} kind={form.appliesTo} value={form.targetIds} onChange={targetIds => setForm(f => ({ ...f, targetIds }))} error={formErrors.targetIds} />
                )}
                <div>
                  <label htmlFor="cp-perCustomer" className="text-xs font-medium text-graphite mb-[5px] block">Uses per customer</label>
                  <input id="cp-perCustomer" inputMode="numeric" aria-invalid={!!formErrors.perCustomer} placeholder="Leave blank for unlimited" value={form.perCustomer} onChange={e => setForm(f => ({ ...f, perCustomer: e.target.value }))} className={INPUT_CLS} />
                  {formErrors.perCustomer && <p className="text-[11.5px] text-error mt-1">{formErrors.perCustomer}</p>}
                </div>
                <label className="flex items-center gap-3 min-h-11 cursor-pointer text-[13px] text-carbon">
                  <input type="checkbox" className="size-4" checked={form.firstOrderOnly} onChange={e => setForm(f => ({ ...f, firstOrderOnly: e.target.checked }))} />
                  First order only (new buyers of your store)
                </label>
                <div>
                  <label htmlFor="cp-visibility" className="text-xs font-medium text-graphite mb-[5px] block">Visibility</label>
                  <select id="cp-visibility" value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value as 'public' | 'private' }))} className={`${INPUT_CLS} cursor-pointer`}>
                    <option value="private">Private — buyers need the code</option>
                    <option value="public">Public — show a "Coupon: X% off" badge on product pages</option>
                  </select>
                  <p className="text-[11.5px] text-slate mt-1">Badge shows for percentage coupons only.</p>
                </div>
                <p className="text-[12px] text-slate bg-cream rounded-[8px] px-3 py-2">Only the single best discount applies; a Platform Sale and a coupon don't stack.</p>
          </div>
          {formErrors._form && <p className="text-xs text-error mt-3" role="alert">{formErrors._form}</p>}
        </Modal>
      )}

      {deletingCoupon && (
        <Modal title="Delete Coupon" onClose={() => setDeletingCoupon(null)} mobileSheet footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingCoupon(null)} disabled={deleteBusy}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleteBusy}>Delete Coupon</Button>
          </>
        }>
          <p className="text-[13px] text-charcoal">
            Delete coupon <strong>{deletingCoupon.code}</strong>? {deletingCoupon.usageCount > 0 && `It has been redeemed ${deletingCoupon.usageCount} time${deletingCoupon.usageCount !== 1 ? 's' : ''}. `}This cannot be undone.
          </p>
          {error && <p className="text-[12px] text-error mt-2">{error}</p>}
        </Modal>
      )}
    </>
  );
}
