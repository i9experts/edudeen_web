import { useEffect, useRef, useState } from 'react';
import { Search, X, Pencil } from 'lucide-react';
import { Button, Modal, Input, Textarea, Select } from '@/components/comman/ui';
import { apiListAdminUsers } from '@/api/services/users/adminUsers';
import {
  apiAdminSearchManualOrderProducts, apiAdminCreateManualOrder,
  type ManualOrderProduct,
} from '@/api/services/adminOrders';
import { apiAdminListShippingZones, shippingZoneLabel, zonesForAddress, type ShippingZone } from '@/api/services/shipping';
import { AddressForm, EMPTY_ADDRESS_FORM } from '@/features/buyer/components/AddressForm';
import type { AddressPayload } from '@/api/services/address';

interface BuyerOption { id: string; name: string; email: string }

// ── Buyer search — same debounced-combobox pattern as EntitySearchSelect, but
// keeps the full row (name + email) instead of a generic {id,label,sub}. ──────
function BuyerPicker({ selected, onSelect }: { selected: BuyerOption | null; onSelect: (b: BuyerOption | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BuyerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || query.trim().length < 1) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      apiListAdminUsers({ role: 'buyer', search: query.trim(), limit: 8 })
        .then(res => { if (!cancelled) setResults(res.data.items.map(u => ({ id: u.id, name: u.name, email: u.email }))); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <label className="block text-[12px] font-semibold text-slate mb-1">Buyer *</label>
      <div className="relative">
        <Search size={13} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-slate pointer-events-none" />
        <input
          value={selected ? `${selected.name} (${selected.email})` : query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (selected) onSelect(null); }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name or email…"
          className="w-full pl-[30px] pr-8 py-[9px] text-[13px] text-carbon border border-bone rounded-lg outline-none transition-colors focus:border-brand-orange"
        />
        {selected && (
          <button type="button" onClick={() => { onSelect(null); setQuery(''); }} aria-label="Clear buyer"
            className="absolute right-[8px] top-1/2 -translate-y-1/2 text-slate hover:text-charcoal bg-transparent border-0 cursor-pointer p-0">
            <X size={13} />
          </button>
        )}
      </div>
      {open && !selected && query.trim().length >= 1 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-bone rounded-lg max-h-[220px] overflow-y-auto">
          {loading ? (
            <p className="px-3 py-[10px] text-[12px] text-slate">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-[10px] text-[12px] text-slate">No buyers match "{query.trim()}"</p>
          ) : (
            results.map(b => (
              <button key={b.id} type="button" onClick={() => { onSelect(b); setQuery(''); setOpen(false); }}
                className="w-full text-left px-3 py-[9px] text-[12.5px] bg-transparent border-0 cursor-pointer hover:bg-cream transition-colors">
                <div className="font-medium text-charcoal truncate">{b.name}</div>
                <div className="text-[12px] text-slate truncate">{b.email}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Product search — same shape of combobox, but keeps each result's full
// variant list (price/stock/options) for the picker that follows selection. ──
function ProductPicker({ selected, onSelect }: { selected: ManualOrderProduct | null; onSelect: (p: ManualOrderProduct | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ManualOrderProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      apiAdminSearchManualOrderProducts(query.trim())
        .then(res => { if (!cancelled) setResults(res.data.items); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <label className="block text-[12px] font-semibold text-slate mb-1">Product *</label>
      <div className="relative">
        <Search size={13} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-slate pointer-events-none" />
        <input
          value={selected ? `${selected.name} — ${selected.storeName}` : query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (selected) onSelect(null); }}
          onFocus={() => setOpen(true)}
          placeholder="Search products by name…"
          className="w-full pl-[30px] pr-8 py-[9px] text-[13px] text-carbon border border-bone rounded-lg outline-none transition-colors focus:border-brand-orange"
        />
        {selected && (
          <button type="button" onClick={() => { onSelect(null); setQuery(''); }} aria-label="Clear product"
            className="absolute right-[8px] top-1/2 -translate-y-1/2 text-slate hover:text-charcoal bg-transparent border-0 cursor-pointer p-0">
            <X size={13} />
          </button>
        )}
      </div>
      {open && !selected && query.trim().length >= 1 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-bone rounded-lg max-h-[260px] overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="px-3 py-[10px] text-[12px] text-slate">Keep typing (at least 2 characters)…</p>
          ) : loading ? (
            <p className="px-3 py-[10px] text-[12px] text-slate">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-[10px] text-[12px] text-slate">No products match "{query.trim()}"</p>
          ) : (
            results.map(p => (
              <button key={p.id} type="button" onClick={() => { onSelect(p); setQuery(''); setOpen(false); }}
                className="w-full flex items-center gap-2 text-left px-3 py-[9px] text-[12.5px] bg-transparent border-0 cursor-pointer hover:bg-cream transition-colors">
                {p.image ? <img src={p.image} alt="" className="w-8 h-8 rounded object-cover border border-bone shrink-0" /> : <span className="w-8 h-8 rounded bg-bone shrink-0" />}
                <div className="min-w-0">
                  <div className="font-medium text-charcoal truncate">{p.name}</div>
                  <div className="text-[12px] text-slate truncate">{p.storeName} · {p.type}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function CreateManualOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: (orderId: string) => void }) {
  const [buyer, setBuyer] = useState<BuyerOption | null>(null);
  const [product, setProduct] = useState<ManualOrderProduct | null>(null);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [addressForm, setAddressForm] = useState<AddressPayload | null>(null);
  const [editingAddress, setEditingAddress] = useState(true);

  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [shippingZoneId, setShippingZoneId] = useState('');

  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { apiAdminListShippingZones().then(res => setZones(res.data)).catch(() => setZones([])); }, []);

  // Auto-select the default variant, and reset downstream choices whenever the product changes.
  useEffect(() => {
    setVariantId(product?.variants.find(v => v.isDefault)?.id ?? product?.variants[0]?.id ?? '');
    setQuantity(1);
    setAddressForm(null);
    setEditingAddress(true);
    setShippingZoneId('');
  }, [product]);

  const variant = product?.variants.find(v => v.id === variantId) ?? null;
  const needsAddress = product?.type === 'physical';
  const maxQty = variant && !variant.unlimitedStock ? Math.max(1, Math.min(99, variant.stock)) : 99;
  const suggestedZones = addressForm ? zonesForAddress(zones, addressForm) : zones;
  const estimatedTotal = variant ? variant.price * quantity : 0;

  const canSubmit = !!buyer && !!product && !!variant
    && (!needsAddress || (!!addressForm && !editingAddress))
    && (zones.length === 0 || !needsAddress || !!shippingZoneId)
    && reason.trim().length >= 5;

  async function submit() {
    if (!buyer || !product || !variant) return;
    setBusy(true);
    setError('');
    try {
      const res = await apiAdminCreateManualOrder({
        buyerId: buyer.id,
        productId: product.id,
        variantId: variant.id,
        quantity,
        address: needsAddress && addressForm ? addressForm : undefined,
        shippingZoneId: shippingZoneId || undefined,
        reason: reason.trim(),
      });
      onCreated(res.data.orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create this order.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Create a manual order" onClose={onClose} width={620} mobileSheet
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="primary" loading={busy} disabled={!canSubmit} onClick={() => void submit()}>Create order</Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <p className="text-[12.5px] text-slate bg-cream border border-bone rounded-md px-3 py-2">
          For a phone/WhatsApp order, an offline sale, or a goodwill replacement. One product line, for an existing buyer account.
          A priced physical item is placed as Cash on Delivery (mark it paid once settled); a digital item can only be placed if it's free.
        </p>

        <BuyerPicker selected={buyer} onSelect={setBuyer} />
        <ProductPicker selected={product} onSelect={setProduct} />

        {product && variant && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {product.variants.length > 1 && (
              <Select label="Variant" value={variantId} onChange={e => setVariantId(e.target.value)}>
                {product.variants.map(v => (
                  <option key={v.id} value={v.id}>
                    {(v.options.map(o => `${o.name}: ${o.value}`).join(', ') || v.sku || 'Default')} — {v.currency} {v.price.toLocaleString()}
                  </option>
                ))}
              </Select>
            )}
            <Input
              label={`Quantity${!variant.unlimitedStock ? ` (${variant.stock} in stock)` : ''}`}
              type="number" min={1} max={maxQty} value={String(quantity)}
              onChange={e => setQuantity(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
            />
          </div>
        )}

        {needsAddress && (
          editingAddress ? (
            <AddressForm
              initial={addressForm ?? EMPTY_ADDRESS_FORM}
              saving={false}
              submitLabel="Use this address"
              cancelLabel="Cancel"
              onCancel={addressForm ? () => setEditingAddress(false) : undefined}
              onSave={form => { setAddressForm(form); setEditingAddress(false); }}
              note="This is saved to the buyer's account, same as if they'd entered it themselves."
            />
          ) : addressForm && (
            <div className="flex items-start justify-between gap-3 bg-cream border border-bone rounded-lg px-3 py-2.5">
              <div className="min-w-0 text-[13px] text-charcoal">
                <p className="font-semibold">{addressForm.recipientName} · {addressForm.phoneNumber}</p>
                <p className="text-slate">{addressForm.addressLine1}{addressForm.addressLine2 ? `, ${addressForm.addressLine2}` : ''}, {addressForm.city}, {addressForm.state} {addressForm.zipCode}</p>
              </div>
              <Button variant="ghost" size="xs" icon={<Pencil size={12} />} onClick={() => setEditingAddress(true)}>Edit</Button>
            </div>
          )
        )}

        {needsAddress && !editingAddress && zones.length > 0 && (
          <Select label="Delivery option *" value={shippingZoneId} onChange={e => setShippingZoneId(e.target.value)}>
            <option value="">Choose where this ships…</option>
            {suggestedZones.map(z => <option key={z._id} value={z._id}>{shippingZoneLabel(z)} — PKR {z.shippingPrice.toLocaleString()}</option>)}
          </Select>
        )}

        <Textarea label="Reason (internal — recorded on the order's activity log)" value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="e.g. Phone order from a repeat customer, confirmed via WhatsApp" maxLength={300} />

        {variant && (
          <p className="text-[12.5px] text-charcoal bg-cream border border-bone rounded-md px-3 py-2">
            Estimated total: <span className="font-semibold">{variant.currency} {estimatedTotal.toLocaleString()}</span>{needsAddress ? ' + shipping' : ''} — the exact total is computed when the order is placed.
          </p>
        )}

        {error && <p role="alert" className="text-[12.5px] text-error font-medium">{error}</p>}
      </div>
    </Modal>
  );
}
