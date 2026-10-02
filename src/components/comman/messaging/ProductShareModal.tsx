import { useEffect, useRef, useState } from 'react';
import { X, Search, ImageOff, Loader2 } from 'lucide-react';
import { apiGetPublicStoreProducts, type PublicStoreProduct } from '@/api/services/store';
import { useFocusTrap } from '@/components/comman/ui/useFocusTrap';
import { EmptyState } from '@/components/comman/ui';

interface ProductShareModalProps {
  storeId:  string;
  onClose:  () => void;
  onShare:  (productId: string) => void;
  sharing:  boolean;
}

// Lets a buyer (or a seller replying about their own catalog) pick one of
// the conversation's store products to send as a `product_share` message —
// the message type the backend already fully supports end-to-end.
export function ProductShareModal({ storeId, onClose, onShare, sharing }: ProductShareModalProps) {
  const [products, setProducts] = useState<PublicStoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);

  useEffect(() => {
    let cancelled = false;
    apiGetPublicStoreProducts(storeId, { limit: 30 })
      .then(res => { if (!cancelled) setProducts(res.data.products ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId]);

  const filtered = query.trim()
    ? products.filter(p => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : products;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 transition-opacity duration-200 starting:opacity-0">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Share a product"
        tabIndex={-1}
        className="w-full max-w-[420px] max-h-[80vh] bg-white border border-bone rounded-[16px] overflow-hidden outline-none flex flex-col transition-all duration-200 ease-out starting:opacity-0 starting:scale-95"
      >
        <div className="flex items-center justify-between px-4 py-[14px] border-b border-[#eeece4] shrink-0">
          <p className="text-[15px] font-bold text-charcoal">Share a product</p>
          <button onClick={onClose} aria-label="Close dialog" className="w-7 h-7 flex items-center justify-center rounded-full bg-cream border-none cursor-pointer">
            <X size={13} className="text-charcoal" />
          </button>
        </div>

        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-[8px] bg-cream rounded-full px-[12px] py-[8px]">
            <Search size={14} className="text-slate shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search products…"
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-charcoal"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-brand-orange" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<ImageOff size={24} className="text-brand-orange opacity-55" />} title="No products found" className="py-8" />
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map(p => (
                <button
                  key={p._id}
                  onClick={() => setSelectedId(p._id)}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-[10px] text-start cursor-pointer border-none transition-colors ${selectedId === p._id ? 'bg-brand-pale-orange' : 'bg-transparent hover:bg-cream'}`}
                >
                  <div className="w-11 h-11 rounded-[9px] bg-cream border border-bone overflow-hidden shrink-0 flex items-center justify-center">
                    {p.images?.[0] ? <img loading="lazy" decoding="async" src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <ImageOff size={14} className="text-slate" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-charcoal truncate">{p.name}</p>
                    {p.defaultVariantPrice != null && <p className="text-[12px] text-slate">${p.defaultVariantPrice.toLocaleString()}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-[#eeece4] shrink-0">
          <button
            onClick={() => selectedId && onShare(selectedId)}
            disabled={!selectedId || sharing}
            className="w-full py-[11px] rounded-full bg-brand-orange text-white text-[13px] font-semibold border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {sharing && <Loader2 size={14} className="animate-spin" />}
            {sharing ? 'Sharing…' : 'Share Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
