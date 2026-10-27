import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { Card, Avatar, Button, InlineError } from '@/components/comman/ui';
import { apiGetSellerFreeClaims, type FreeClaim } from '@/api/services/product';

const PAGE = 10;

/** Who availed (claimed) the store's free products. These are not orders: nothing to ship or confirm. */
export function FreeClaimsCard({ storeId }: { storeId: string }) {
  const [claims, setClaims] = useState<FreeClaim[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiGetSellerFreeClaims(storeId, page, PAGE)
      .then(res => { if (!cancelled) { setClaims(res.data.claims ?? []); setTotal(res.data.total ?? 0); setError(''); } })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load free claims.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, page, retry]);

  if (!loading && !error && total === 0) return null;

  return (
    <Card padding="none">
      <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center gap-2">
        <Gift size={16} className="text-brand-orange" />
        <p className="text-[14px] font-bold text-charcoal">Free resource claims</p>
        <span className="text-[12px] text-slate ms-auto">{total} total</span>
      </div>
      {error ? (
        <div className="px-4 sm:px-5 pb-4"><InlineError message={error} onRetry={() => { setLoading(true); setRetry(n => n + 1); }} /></div>
      ) : loading ? (
        <p className="px-5 pb-4 text-[13px] text-slate">Loading…</p>
      ) : (
        <ul className="divide-y divide-bone">
          {claims.map((c, i) => (
            <li key={`${c.orderId}-${c.productId ?? i}`} className="px-4 sm:px-5 py-2.5 flex items-center gap-3">
              <Avatar name={c.buyerName} size={30} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-charcoal truncate">{c.buyerName}</p>
                <p className="text-[12px] text-slate truncate">claimed “{c.productName}”</p>
              </div>
              <span className="text-[12px] text-slate shrink-0">{new Date(c.claimedAt).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
      {total > PAGE && (
        <div className="px-4 sm:px-5 py-3 flex justify-end gap-2">
          <Button variant="outline" size="xs" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage(p => p - 1); }}>Previous</Button>
          <Button variant="outline" size="xs" disabled={page * PAGE >= total || loading} onClick={() => { setLoading(true); setPage(p => p + 1); }}>Next</Button>
        </div>
      )}
    </Card>
  );
}
