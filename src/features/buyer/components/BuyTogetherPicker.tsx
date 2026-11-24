import { useState } from 'react';
import { Package2 } from 'lucide-react';
import { Button } from '@/components/comman/ui';
import { ProductImage } from '@/components/comman/marketplace/ProductCard';
import { useCartContext } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { formatPrice } from '@/utils/formatPrice';

export interface PickerItem {
  productId: string;
  variantId: string;
  type: 'physical' | 'digital';
  name: string;
  image: string | null;
  price: number;
  currency?: 'PKR' | 'USD' | null;
  inStock: boolean;
}

/**
 * "Frequently bought together": tick the items, add them to the cart as separate lines (no discount, plain sum).
 * Out-of-stock items are unticked + disabled. Hidden with fewer than 2 items. Uses the normal cart add per item.
 */
export function BuyTogetherPicker({ items }: { items: PickerItem[] }) {
  const { addToCart } = useCartContext();
  const toast = useToast();
  const { currency: display, convert } = useCurrencyPreference();
  const [off, setOff] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  if (items.length < 2) return null;
  const picked = items.filter(i => i.inStock && !off.has(i.productId));
  const total = picked.reduce((s, i) => s + convert(i.price, i.currency ?? 'USD'), 0);

  const toggle = (id: string) => setOff(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const addSelected = async () => {
    if (!picked.length || adding) return;
    setAdding(true);
    let ok = 0;
    for (const i of picked) {
      try { if (await addToCart(i.productId, i.variantId, i.type, 1, { silent: true })) ok += 1; } catch { /* skip unavailable */ }
    }
    setAdding(false);
    if (!ok) toast.error('Nothing could be added — these items may be unavailable.');
    else toast.success(ok === picked.length ? `Added ${ok} to your cart` : `Added ${ok} of ${picked.length} to your cart`);
  };

  return (
    <section className="mb-6 rounded-2xl border border-bone bg-white p-4 md:p-5" aria-label="Frequently bought together">
      <div className="flex items-center gap-2 mb-3">
        <Package2 size={16} className="text-brand-orange" aria-hidden />
        <h2 className="text-[15px] font-bold text-carbon m-0">Frequently bought together</h2>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-2 m-0 p-0 list-none">
        {items.map(i => {
          const checked = i.inStock && !off.has(i.productId);
          return (
            <li key={i.productId} className={`shrink-0 w-[132px] ${i.inStock ? '' : 'opacity-60'}`}>
              <label className={`flex flex-col gap-1 ${i.inStock ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                <div className="relative">
                  <ProductImage images={i.image ? [i.image] : []} name={i.name} className="h-[132px] rounded-lg border border-bone" />
                  <input
                    type="checkbox" className="absolute top-2 start-2 h-4 w-4 accent-brand-orange"
                    checked={checked} disabled={!i.inStock} onChange={() => toggle(i.productId)} aria-label={i.name}
                  />
                </div>
                <span className="text-[12px] text-carbon line-clamp-2">{i.name}</span>
                <span className="text-[13px] font-bold text-carbon">{formatPrice(convert(i.price, i.currency ?? 'USD'), display)}</span>
                {!i.inStock && <span className="text-[11.5px] font-semibold text-error">Out of stock</span>}
              </label>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-0 -mx-4 md:mx-0 px-4 md:px-0 pt-3 pb-1 mt-2 bg-white border-t border-bone flex items-center gap-3">
        <p className="text-[13px] text-graphite m-0">
          {`Total for ${picked.length} ${picked.length === 1 ? 'item' : 'items'}:`} <b className="text-[16px] text-carbon">{formatPrice(total, display)}</b>
        </p>
        <Button variant="primary" size="sm" className="ms-auto" loading={adding} disabled={!picked.length} onClick={addSelected}>
          Add selected to cart
        </Button>
      </div>
    </section>
  );
}
