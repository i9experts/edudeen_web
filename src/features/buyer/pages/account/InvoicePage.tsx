import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { apiGetOrderById, type OrderDetail } from '@/api/services/orders';
import { TokenStorage } from '@/api/services/auth';
import { EdudeenLogo } from '@/components/comman/ui/EdudeenLogo';
import { LICENSE_LABEL } from '@/constants/learning';
import { money, discountLines } from './orderFormat';

const PAYMENT_LABEL: Record<string, string> = {
  stripe: 'Card', cash_on_delivery: 'Cash on delivery', manual_bank_transfer: 'Bank transfer',
};

/**
 * A printable invoice for one order — what schools and parents file or claim
 * against. Opens on its own page without the account layout so "Print" (or
 * "Save as PDF" in the print dialog) gives a clean sheet.
 */
export function InvoicePage() {
  const { orderId = '' } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const buyer = TokenStorage.getUser<{ name?: string; email?: string }>();

  useEffect(() => {
    apiGetOrderById(orderId).then(res => setOrder(res.data)).catch(err => setError(err instanceof Error ? err.message : 'Could not load this invoice.'));
  }, [orderId]);

  useEffect(() => { if (order) document.title = `Invoice ${order.orderNumber} — Edudeen`; }, [order]);

  if (error) return <p className="p-8 text-error">{error}</p>;
  if (!order) return <p className="p-8 text-slate">Loading invoice…</p>;

  const addr = order.shippingAddress as Record<string, string> | null;
  const items = order.sellerOrders.flatMap(so => so.items.map((it: any) => ({ ...it, store: so.storeName ?? so.sellerName ?? 'Store' })));
  const sellers = order.sellerOrders.map(so => ({ name: so.storeName ?? so.sellerName ?? 'Store', email: so.storeContactEmail, phone: so.storeContactPhone }));

  return (
    <div className="min-h-screen bg-[#eef1f4] print:bg-white py-8 print:py-0 px-4">
      <div className="max-w-[820px] mx-auto mb-4 flex justify-end print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-carbon text-white px-4 py-2 text-[13px] font-semibold border-none cursor-pointer">
          <Printer size={14} /> Print or save as PDF
        </button>
      </div>
      <article className="max-w-[820px] mx-auto bg-white shadow-sm print:shadow-none rounded-xl print:rounded-none p-8 md:p-10 text-[13px] text-carbon">
        <header className="flex items-start justify-between gap-6 flex-wrap border-b border-bone pb-6">
          <div>
            <EdudeenLogo size={30} />
            <p className="text-slate mt-2">Edudeen marketplace · support@edudeen.com</p>
          </div>
          <div className="text-end">
            <h1 className="text-[22px] font-bold tracking-tight">Invoice</h1>
            <p className="font-mono mt-1">{order.orderNumber}</p>
            <p className="text-slate">Date: {new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="mt-1 font-semibold">{order.isPaid ? `Paid${order.paidAt ? ` on ${new Date(order.paidAt).toLocaleDateString('en-PK')}` : ''}` : 'Payment due'}</p>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-bone">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Billed to</p>
            <p className="font-semibold">{addr?.recipientName || buyer?.name || 'Customer'}</p>
            {buyer?.email && <p>{buyer.email}</p>}
            {addr?.addressLine1 && <p className="text-graphite">{[addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')}</p>}
            {addr?.phoneNumber && <p className="text-graphite">{addr.phoneNumber}</p>}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Sold by</p>
            {sellers.map(s => (
              <p key={s.name}><span className="font-semibold">{s.name}</span>{s.email ? ` · ${s.email}` : ''}{s.phone ? ` · ${s.phone}` : ''}</p>
            ))}
            <p className="text-graphite mt-1">Payment: {PAYMENT_LABEL[order.paymentType] ?? order.paymentType}</p>
          </div>
        </section>

        <table className="w-full mt-6 border-collapse">
          <thead>
            <tr className="text-start text-[11px] uppercase tracking-[0.06em] text-slate border-b border-bone">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 font-semibold text-end">Qty</th>
              <th className="py-2 font-semibold text-end">Unit price</th>
              <th className="py-2 font-semibold text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it._id ?? i} className="border-b border-[#f1f1ee] align-top">
                <td className="py-2 pe-3">
                  <p className="font-medium">{it.name}</p>
                  <p className="text-[11.5px] text-slate">{it.store}{it.licenseType ? ` · ${LICENSE_LABEL[it.licenseType] ?? it.licenseType} license` : ''}{it.sku ? ` · ${it.sku}` : ''}</p>
                </td>
                <td className="py-2 text-end tabular-nums">{it.quantity}</td>
                <td className="py-2 text-end tabular-nums">{money(it.price, order.currency)}</td>
                <td className="py-2 text-end tabular-nums">{money(it.totalPrice, order.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ms-auto mt-4 w-full sm:w-[300px] flex flex-col gap-1 tabular-nums">
          <div className="flex justify-between"><dt className="text-slate">Subtotal</dt><dd>{money(order.subtotal, order.currency)}</dd></div>
          {discountLines(order).map(([l, v]) => <div key={l} className="flex justify-between"><dt className="text-slate">{l}</dt><dd>−{money(v, order.currency)}</dd></div>)}
          <div className="flex justify-between"><dt className="text-slate">Shipping</dt><dd>{order.shippingFee ? money(order.shippingFee, order.currency) : 'Free'}</dd></div>
          {order.taxAmount > 0 && <div className="flex justify-between"><dt className="text-slate">Tax</dt><dd>{money(order.taxAmount, order.currency)}</dd></div>}
          <div className="flex justify-between border-t border-carbon pt-2 mt-1 text-[15px] font-bold"><dt>Total</dt><dd>{money(order.totalAmount, order.currency)}</dd></div>
        </dl>

        <footer className="mt-10 pt-4 border-t border-bone text-[11.5px] text-slate">
          Thank you for learning with Edudeen. Questions about this order? Email support@edudeen.com with the order number above.
        </footer>
      </article>
    </div>
  );
}
