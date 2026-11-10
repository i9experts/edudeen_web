import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { apiGetSellerOrdersForPrint, type SellerPrintOrder } from '@/api/services/product';
import { EdudeenLogo } from '@/components/comman/ui/EdudeenLogo';
import { useAppQrDataUrl } from '@/components/comman/ui/AppPromoParts';
import { LICENSE_LABEL } from '@/constants/learning';
import { formatAddressLine, formatPhone } from '@/utils/formatAddress';
import { formatPrice } from '@/utils/formatPrice';

type Mode = 'slip' | 'invoice';
type Size = 'A4' | 'A5';

const PAYMENT_LABEL: Record<string, string> = {
  stripe: 'Card', cash_on_delivery: 'Cash on delivery', manual_bank_transfer: 'Bank transfer',
};

function OrderQr({ value }: { value: string }) {
  const url = useAppQrDataUrl(value);
  if (!url) return <div className="size-[72px]" aria-hidden />;
  return <img src={url} alt={`QR code for order ${value}`} width={72} height={72} />;
}

function Sheet({ o, store, mode }: { o: SellerPrintOrder; store: { name: string; logo: string | null }; mode: Mode }) {
  const addr = o.shippingAddress;
  const money = (n: number | null) => (n == null ? '' : formatPrice(n, o.currency));
  const showPrices = mode === 'invoice' && !o.pricesHidden;
  const ship = o.type !== 'digital';
  return (
    <article className="print-sheet bg-white text-carbon text-[13px] p-8 print:p-0 mx-auto max-w-[820px] shadow-sm print:shadow-none rounded-xl print:rounded-none mb-6 print:mb-0">
      <header className="flex items-start justify-between gap-4 border-b border-bone pb-4">
        <div className="flex items-center gap-3 min-w-0">
          {store.logo
            ? <img src={store.logo} alt="" className="size-12 rounded object-contain" />
            : <EdudeenLogo size={28} />}
          <div className="min-w-0">
            <p className="font-bold text-[16px] break-words" dir="auto">{store.name}</p>
            <p className="text-slate">{mode === 'invoice' ? 'Invoice' : 'Packing slip'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-end">
            <p className="font-mono font-bold" dir="ltr">{o.orderNumber}</p>
            <p className="text-slate">{new Date(o.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <OrderQr value={o.orderNumber} />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6 py-4 border-b border-bone">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">{ship ? 'Ship to' : 'Buyer'}</p>
          <p className="font-semibold" dir="auto">{addr?.recipientName || o.customer.name}</p>
          {ship && addr ? (
            <>
              <p dir="auto">{formatAddressLine(addr)}</p>
              {addr.phoneNumber && <p dir="ltr" className="text-start">{formatPhone(addr.phoneNumber)}</p>}
            </>
          ) : ship ? <p className="text-slate">No shipping address on this order.</p> : null}
        </div>
        {mode === 'invoice' ? (
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Payment</p>
            <p>{PAYMENT_LABEL[o.paymentType] ?? o.paymentType.replace(/_/g, ' ')}</p>
            <p className="font-semibold">{o.isPaid ? 'Paid' : 'Unpaid'}</p>
            {!o.isPaid && o.paymentType === 'cash_on_delivery' && o.codAmount != null && o.codAmount > 0 && (
              <p>Cash to collect: <span className="font-bold">{money(o.codAmount)}</span></p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Gift</p>
            <p>{o.isGift ? (o.giftWrap ? 'Gift wrap requested' : 'Gift order') : '—'}</p>
          </div>
        )}
      </section>

      <table className="w-full border-collapse mt-3">
        <thead>
          <tr className="text-[12px] uppercase tracking-[0.06em] text-slate border-b border-bone">
            <th className="py-2 font-semibold text-start">Item</th>
            <th className="py-2 font-semibold text-start">SKU</th>
            <th className="py-2 font-semibold text-end">Qty</th>
            {showPrices && <th className="py-2 font-semibold text-end">Price</th>}
            {showPrices && <th className="py-2 font-semibold text-end">Amount</th>}
          </tr>
        </thead>
        <tbody>
          {o.items.map((it, i) => {
            const extras = [
              it.licenseType ? `${LICENSE_LABEL[it.licenseType] ?? it.licenseType} license` : null,
              ...it.options.map(x => `${x.name}: ${x.value}`),
            ].filter(Boolean);
            return (
              <tr key={i} className="border-b border-[#f1f1ee] align-top">
                <td className="py-2 pe-3">
                  <p className="font-medium" dir="auto">{it.name}</p>
                  {extras.length > 0 && <p className="text-[12px] text-slate" dir="auto">{extras.join(' · ')}</p>}
                </td>
                <td className="py-2 pe-3 font-mono text-[12px]" dir="ltr">{it.sku || '—'}</td>
                <td className="py-2 text-end tabular-nums font-semibold">{it.quantity}</td>
                {showPrices && <td className="py-2 text-end tabular-nums">{money(it.price)}</td>}
                {showPrices && <td className="py-2 text-end tabular-nums">{money(it.totalPrice)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>

      {showPrices && (
        <dl className="ms-auto mt-4 w-[260px] flex flex-col gap-1 tabular-nums">
          <div className="flex justify-between"><dt className="text-slate">Subtotal</dt><dd>{money(o.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate">Shipping</dt><dd>{o.shippingFee ? money(o.shippingFee) : 'Free'}</dd></div>
        </dl>
      )}
      {mode === 'invoice' && o.pricesHidden && (
        <p className="mt-4 text-slate text-[12px]">This is a gift order, so prices are not shown.</p>
      )}

      {o.giftMessage && (
        <section className="mt-4 rounded-lg border border-bone p-3">
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Buyer note</p>
          <p className="whitespace-pre-line break-words" dir="auto">{o.giftMessage}</p>
        </section>
      )}
    </article>
  );
}

/** Printable packing slips / invoices for up to 50 orders, one order per page. Opens outside the store layout. */
export function OrderPrintPage() {
  const { storeId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const ids = useMemo(() => Array.from(new Set((params.get('ids') ?? '').split(',').map(s => s.trim()).filter(Boolean))), [params]);
  const mode: Mode = params.get('mode') === 'invoice' ? 'invoice' : 'slip';
  const [size, setSize] = useState<Size>('A4');
  const [data, setData] = useState<{ store: { name: string; logo: string | null }; orders: SellerPrintOrder[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    document.title = `${mode === 'invoice' ? 'Invoices' : 'Packing slips'} — Edudeen`;
  }, [mode]);

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError('');
    apiGetSellerOrdersForPrint(storeId, ids)
      .then(res => { if (!cancelled) setData(res.data); })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load these orders.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, ids, tick]);

  const setMode = (m: Mode) => setParams(prev => { const n = new URLSearchParams(prev); n.set('mode', m); return n; }, { replace: true });
  const pill = (active: boolean) => `px-3 py-1.5 rounded-lg text-[13px] font-semibold border cursor-pointer ${active ? 'bg-carbon text-white border-carbon' : 'bg-white text-carbon border-bone'}`;

  return (
    <div className="min-h-screen bg-[#eef1f4] print:bg-white py-6 print:py-0 px-4 print:px-0">
      <style>{`
        @page { size: ${size}; margin: 12mm; }
        @media print { .print-sheet { break-after: page; page-break-after: always; } .print-sheet:last-child { break-after: auto; page-break-after: auto; } }
        .print-sheet { font-family: 'Edudeen Urdu', inherit; }
      `}</style>

      <div className="max-w-[820px] mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={pill(mode === 'slip')} onClick={() => setMode('slip')}>Packing slip</button>
          <button type="button" className={pill(mode === 'invoice')} onClick={() => setMode('invoice')}>Invoice</button>
          <span className="mx-1 text-slate">|</span>
          <button type="button" className={pill(size === 'A4')} onClick={() => setSize('A4')}>A4</button>
          <button type="button" className={pill(size === 'A5')} onClick={() => setSize('A5')}>A5</button>
        </div>
        <button type="button" onClick={() => window.print()} disabled={!data || data.orders.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-carbon text-white px-4 py-2 text-[13px] font-semibold border-none cursor-pointer disabled:opacity-50">
          <Printer size={14} /> Print {data ? `(${data.orders.length})` : ''}
        </button>
      </div>

      {loading ? (
        <p className="max-w-[820px] mx-auto p-8 text-slate" role="status">Loading orders…</p>
      ) : error ? (
        <div className="max-w-[820px] mx-auto p-8 flex items-center gap-3" role="alert">
          <p className="text-error m-0">{error}</p>
          <button type="button" className={pill(false)} onClick={() => setTick(t => t + 1)}>Retry</button>
        </div>
      ) : ids.length === 0 || !data || data.orders.length === 0 ? (
        <p className="max-w-[820px] mx-auto p-8 text-slate">No orders selected. Go back to Orders, tick the orders you want and choose “Print selected”.</p>
      ) : (
        data.orders.map(o => <Sheet key={o.orderId} o={o} store={data.store} mode={mode} />)
      )}
    </div>
  );
}
