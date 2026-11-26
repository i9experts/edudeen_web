import { useEffect, useState } from 'react';
import { Modal, Button, Input, Textarea, Select } from '@/components/comman/ui';
import { apiCreateCategoryRequest, apiGetCategoryTree, type CategoryRequestType, type CategoryRequest } from '@/api/services/categories';
import { useBusyAction } from '@/hooks/useBusyAction';

/** Same limits as the API (`cleanRequestInput`). `name` isn't user-typed for `extra_category` (picked from
 *  a dropdown, always a real category's own name), so it's not validated the same way as the others. */
export function validateCategoryRequest(v: { name: string; reason: string; exampleProduct: string }, opts: { skipName?: boolean } = {}) {
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
  const e: { name?: string; reason?: string; exampleProduct?: string } = {};
  const n = clean(v.name).length, r = clean(v.reason).length, x = clean(v.exampleProduct).length;
  if (!opts.skipName && (n < 2 || n > 50)) e.name = 'Use 2 to 50 characters.';
  if (r < 10 || r > 500) e.reason = 'Use 10 to 500 characters.';
  if (x < 2 || x > 120) e.exampleProduct = 'Add one example product (2 to 120 characters).';
  return e;
}

export default function CategoryRequestModal({ storeId, type, categoryId, excludeCategoryIds, onClose, onCreated }: {
  storeId: string; type: CategoryRequestType; onClose: () => void; onCreated: (r: CategoryRequest) => void;
  /** Which of the store's own (possibly several) main categories a 'subcategory' request nests under. */
  categoryId?: string;
  /** `extra_category` only: the store's current main categories, excluded from the picker. */
  excludeCategoryIds?: string[];
}) {
  const main = type === 'main_change';
  const extra = type === 'extra_category';
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [example, setExample] = useState('');
  const [requestedCategoryId, setRequestedCategoryId] = useState('');
  const [options, setOptions] = useState<{ _id: string; name: string }[] | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const save = useBusyAction();
  const errors = validateCategoryRequest({ name, reason, exampleProduct: example }, { skipName: extra });
  const show = (k: 'name' | 'reason' | 'exampleProduct') => (touched[k] || submitted ? errors[k] : undefined);
  const touch = (k: string) => setTouched(t => ({ ...t, [k]: true }));

  useEffect(() => {
    if (!extra) return;
    apiGetCategoryTree().then(res => {
      const opts = res.data.filter(c => !excludeCategoryIds?.includes(c._id)).map(c => ({ _id: c._id, name: c.name }));
      setOptions(opts);
      if (opts.length) setRequestedCategoryId(opts[0]._id);
    }).catch(() => setOptions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extra]);

  const submit = async () => {
    setSubmitted(true);
    if (extra && !requestedCategoryId) return;
    if (Object.keys(errors).length) return;
    const picked = extra ? options?.find(o => o._id === requestedCategoryId) : undefined;
    const r = await save.run(() => apiCreateCategoryRequest({
      storeId, type, name: extra ? (picked?.name ?? '') : name, reason, exampleProduct: example,
      categoryId, requestedCategoryId: extra ? requestedCategoryId : undefined,
    }));
    if (r) { onCreated(r.data); onClose(); }
  };

  return (
    <Modal
      title={main ? 'Request a main category change' : extra ? 'Request an additional category' : 'Request a subcategory'}
      onClose={onClose}
      width={460}
      mobileSheet
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={save.busy}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={save.busy || (extra && options?.length === 0)}>{save.busy ? 'Sending…' : 'Send request'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <p className="m-0 text-[13px] text-slate">
          {main
            ? 'Your store\'s main category is set once. Tell us which one fits better and why. The Edudeen team reviews it.'
            : extra
            ? 'Your store is already at the 3-category limit. Tell us which one you need and why — if approved, it\'s added to your store right away.'
            : 'Tell us the subcategory you need. The Edudeen team reviews it and adds it if it fits. You can have up to 3 requests waiting at a time.'}
        </p>
        {extra ? (
          options === null ? (
            <p className="m-0 text-[13px] text-slate">Loading categories…</p>
          ) : options.length === 0 ? (
            <p className="m-0 text-[13px] text-error">Your store already covers every main category.</p>
          ) : (
            <Select label="Category you want added" value={requestedCategoryId} onChange={e => setRequestedCategoryId(e.target.value)}>
              {options.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
            </Select>
          )
        ) : (
          <Input
            label={main ? 'Main category you want' : 'Subcategory name'}
            value={name} maxLength={50} autoFocus
            onChange={e => { setName(e.target.value); save.setError(''); }} onBlur={() => touch('name')}
            error={show('name')}
          />
        )}
        <Textarea
          label="Why do you need it?" rows={3} value={reason} maxLength={500}
          onChange={e => { setReason(e.target.value); save.setError(''); }} onBlur={() => touch('reason')}
          error={show('reason')}
        />
        <Input
          label="One example product that would go in it"
          value={example} maxLength={120}
          onChange={e => { setExample(e.target.value); save.setError(''); }} onBlur={() => touch('exampleProduct')}
          error={show('exampleProduct')}
        />
        {save.error && <p role="alert" className="m-0 text-[12px] text-error">{save.error}</p>}
      </div>
    </Modal>
  );
}
