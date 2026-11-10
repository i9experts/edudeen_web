import { useState } from 'react';
import { Modal, Button, Input, Textarea } from '@/components/comman/ui';
import { apiCreateCategoryRequest, type CategoryRequestType, type CategoryRequest } from '@/api/services/categories';
import { useBusyAction } from '@/hooks/useBusyAction';

/** Same limits as the API (`cleanRequestInput`). */
export function validateCategoryRequest(v: { name: string; reason: string; exampleProduct: string }) {
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
  const e: { name?: string; reason?: string; exampleProduct?: string } = {};
  const n = clean(v.name).length, r = clean(v.reason).length, x = clean(v.exampleProduct).length;
  if (n < 2 || n > 50) e.name = 'Use 2 to 50 characters.';
  if (r < 10 || r > 500) e.reason = 'Use 10 to 500 characters.';
  if (x < 2 || x > 120) e.exampleProduct = 'Add one example product (2 to 120 characters).';
  return e;
}

export default function CategoryRequestModal({ storeId, type, onClose, onCreated }: {
  storeId: string; type: CategoryRequestType; onClose: () => void; onCreated: (r: CategoryRequest) => void;
}) {
  const main = type === 'main_change';
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [example, setExample] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const save = useBusyAction();
  const errors = validateCategoryRequest({ name, reason, exampleProduct: example });
  const show = (k: 'name' | 'reason' | 'exampleProduct') => (touched[k] || submitted ? errors[k] : undefined);
  const touch = (k: string) => setTouched(t => ({ ...t, [k]: true }));

  const submit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const r = await save.run(() => apiCreateCategoryRequest({ storeId, type, name, reason, exampleProduct: example }));
    if (r) { onCreated(r.data); onClose(); }
  };

  return (
    <Modal
      title={main ? 'Request a main category change' : 'Request a subcategory'}
      onClose={onClose}
      width={460}
      mobileSheet
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={save.busy}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={save.busy}>{save.busy ? 'Sending…' : 'Send request'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <p className="m-0 text-[13px] text-slate">
          {main
            ? 'Your store\'s main category is set once. Tell us which one fits better and why. The Edudeen team reviews it.'
            : 'Tell us the subcategory you need. The Edudeen team reviews it and adds it if it fits. You can have up to 3 requests waiting at a time.'}
        </p>
        <Input
          label={main ? 'Main category you want' : 'Subcategory name'}
          value={name} maxLength={50} autoFocus
          onChange={e => { setName(e.target.value); save.setError(''); }} onBlur={() => touch('name')}
          error={show('name')}
        />
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
