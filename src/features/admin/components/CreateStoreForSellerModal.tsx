import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Modal, Button, Input, Select, Textarea } from '@/components/comman/ui';
import { EntitySearchSelect, type EntityOption } from '@/features/admin/components/analytics/EntitySearchSelect';
import { apiListAdminUsers } from '@/api/services/users/adminUsers';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { apiCreateStoreForSeller, type CreatedStoreResult } from '@/api/services/adminStores';
import { MAX_STORE_CATEGORIES } from '@/api/services/store';
import { useBusyAction } from '@/hooks/useBusyAction';

async function searchSellers(query: string): Promise<EntityOption[]> {
  const res = await apiListAdminUsers({ role: 'seller', search: query, limit: 8 });
  return res.data.items.map(u => ({ id: u.id, label: u.name, sub: u.email }));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CURRENCIES = ['PKR', 'USD'];

interface Props { onClose: () => void; onCreated: (r: CreatedStoreResult) => void }

/** Admin creates a store FOR a seller: an existing seller, or a new one who gets an invitation e-mail and sets their own password. */
export function CreateStoreForSellerModal({ onClose, onCreated }: Props) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [seller, setSeller] = useState<EntityOption | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [currency, setCurrency] = useState('PKR');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [catError, setCatError] = useState(false);
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { run, busy } = useBusyAction();

  const loadCats = () => { setCatError(false); apiGetCategoryTree().then(r => setCategories(r.data)).catch(() => setCatError(true)); };
  useEffect(loadCats, []);

  const toggleCategory = (id: string) => {
    setCategoryIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_STORE_CATEGORIES) return prev;
      return [...prev, id];
    });
  };

  const errors = {
    seller: mode === 'existing' && !seller ? 'Pick a seller' : '',
    name: mode === 'new' && name.trim().length < 2 ? 'Enter the seller name (2+ letters)' : '',
    email: mode === 'new' && !EMAIL_RE.test(email.trim()) ? 'Enter a valid e-mail address' : '',
    storeName: storeName.trim().length < 2 ? 'Store name must be at least 2 letters' : storeName.trim().length > 60 ? 'Store name can be at most 60 letters' : '',
    category: categoryIds.length === 0 ? 'Pick at least one category' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  async function submit() {
    setTouched(true); setServerError(null);
    if (hasErrors) return;
    await run(async () => {
      try {
        const r = await apiCreateStoreForSeller({
          ...(mode === 'existing' ? { sellerId: seller!.id } : { newSeller: { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined } }),
          store: { name: storeName.trim(), categoryIds, baseCurrency: currency, description: description.trim() || undefined },
        });
        onCreated(r);
      } catch (e: any) {
        // A cancelled password prompt is not an error worth showing.
        if (e?.response?.data?.code === 'REAUTH_REQUIRED') return;
        setServerError(e?.response?.data?.message ?? e?.message ?? 'Could not create the store. Try again.');
      }
    });
  }

  const show = (m: string) => (touched ? m : '');

  return (
    <Modal mobileSheet title="Create store for a seller" onClose={onClose} width={560}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="primary" onClick={submit} loading={busy}>Create store</Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <p className="text-[12.5px] text-slate leading-[1.6]">The seller owns the store. You can open it afterwards with <strong>Manage as seller</strong>. A new seller gets an e-mail and chooses their own password.</p>

        <div role="radiogroup" aria-label="Seller" className="flex gap-2">
          {(['existing', 'new'] as const).map(m => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
              className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-semibold ${mode === m ? 'border-brand-orange bg-brand-pale-orange text-carbon' : 'border-bone bg-white text-charcoal'}`}>
              {m === 'existing' ? 'Existing seller' : 'New seller'}
            </button>
          ))}
        </div>

        {mode === 'existing' ? (
          <div>
            <EntitySearchSelect label="Seller" placeholder="Search by seller name or e-mail…" selectedId={seller?.id ?? ''} onSelect={setSeller} search={searchSellers} />
            {show(errors.seller) && <p role="alert" className="mt-1 text-[12px] text-error">{errors.seller}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Seller name" value={name} onChange={e => setName(e.target.value)} maxLength={80} error={show(errors.name)} />
            <Input label="Seller e-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} error={show(errors.email)} />
            <Input label="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} />
          </div>
        )}

        <div className="border-t border-bone pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><Input label="Store name" value={storeName} onChange={e => setStoreName(e.target.value)} maxLength={60} error={show(errors.storeName)} /></div>
          <div className="sm:col-span-2">
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">
              Categories <span className="text-slate font-normal">— pick up to {MAX_STORE_CATEGORIES}, covers everything filed under them too</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => {
                const picked = categoryIds.includes(c._id);
                const disabled = !picked && categoryIds.length >= MAX_STORE_CATEGORIES;
                return (
                  <button key={c._id} type="button" onClick={() => toggleCategory(c._id)} disabled={disabled} aria-pressed={picked}
                    className={clsx(
                      'px-3 py-[6px] rounded-full text-[12.5px] font-medium border cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                      picked ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-charcoal border-bone hover:border-brand-orange/50',
                    )}>
                    {c.name}
                  </button>
                );
              })}
            </div>
            {show(errors.category) && <p role="alert" className="mt-1 text-[12px] text-error">{errors.category}</p>}
            {catError && <p className="mt-1 text-[12px] text-error">Could not load categories. <button type="button" className="underline" onClick={loadCats}>Retry</button></p>}
          </div>
          <div>
            <Select label="Prices in" value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <p className="mt-1 text-[12px] text-slate">Cannot be changed after the first product.</p>
          </div>
          <div className="sm:col-span-2"><Textarea label="Description (optional)" rows={3} value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} /></div>
        </div>

        {serverError && <div role="alert" className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{serverError}</div>}
      </div>
    </Modal>
  );
}
