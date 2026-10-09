import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { EdudeenLogo } from '@/components/comman/ui/EdudeenLogo';
import { apiGetQuote, INSTITUTION_TYPES, NET_TERMS_LABEL, QUOTE_STATUS_LABEL, type QuoteRequest } from '@/api/services/classroom';
import { money } from './orderFormat';

const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

/**
 * Printable quotation for a school's bulk request — what an accounts office
 * needs to approve the purchase. Readable by the buyer and the seller.
 */
export function QuotationPage() {
  const { quoteId = '' } = useParams();
  const [q, setQ] = useState<QuoteRequest | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { apiGetQuote(quoteId).then(res => setQ(res.data)).catch(err => setError(err instanceof Error ? err.message : 'Could not load this quotation.')); }, [quoteId]);
  useEffect(() => { if (q) document.title = `Quotation ${q.number} — Edudeen`; }, [q]);

  if (error) return <p className="p-8 text-error">{error}</p>;
  if (!q) return <p className="p-8 text-slate">Loading quotation…</p>;
  const type = INSTITUTION_TYPES.find(t => t.value === q.institutionType)?.label ?? 'Institute';

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
            <h1 className="text-[22px] font-bold tracking-tight">Quotation</h1>
            <p className="font-mono mt-1">{q.number}</p>
            <p className="text-slate">Issued: {date(q.quotedAt ?? q.createdAt)}</p>
            {q.offer?.validUntil && <p className="text-slate">Valid until: {date(q.offer.validUntil)}</p>}
            <p className="mt-1 font-semibold">{QUOTE_STATUS_LABEL[q.status]}</p>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-bone">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Prepared for</p>
            <p className="font-semibold">{q.institutionName}</p>
            <p className="text-graphite">{type}{q.city ? ` · ${q.city}` : ''}</p>
            <p className="text-graphite">Attn: {q.contactName} · {q.contactPhone}</p>
            {q.buyerEmail && <p className="text-graphite">{q.buyerEmail}</p>}
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">From</p>
            <p className="font-semibold">{q.storeName}</p>
            {q.storeContactEmail && <p className="text-graphite">{q.storeContactEmail}</p>}
            {q.storeContactPhone && <p className="text-graphite">{q.storeContactPhone}</p>}
          </div>
        </section>

        <table className="w-full mt-6 border-collapse">
          <thead>
            <tr className="text-start text-[12px] uppercase tracking-[0.06em] text-slate border-b border-bone">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 font-semibold text-end">Qty</th>
              <th className="py-2 font-semibold text-end">Unit price</th>
              <th className="py-2 font-semibold text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#f1f1ee] align-top">
              <td className="py-2 pe-3 font-medium">{q.productName}</td>
              <td className="py-2 text-end tabular-nums">{q.quantity}</td>
              <td className="py-2 text-end tabular-nums">{q.offer ? money(q.offer.unitPrice, q.offer.currency) : '—'}</td>
              <td className="py-2 text-end tabular-nums">{q.offer ? money(q.offer.totalPrice, q.offer.currency) : '—'}</td>
            </tr>
          </tbody>
        </table>
        {q.offer && (
          <div className="ms-auto mt-4 w-full sm:w-[300px] flex justify-between border-t border-carbon pt-2 text-[15px] font-bold tabular-nums">
            <span>Total</span><span>{money(q.offer.totalPrice, q.offer.currency)}</span>
          </div>
        )}
        {q.offer && (
          <section className="mt-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Payment terms</p>
            <p className="text-graphite">{NET_TERMS_LABEL[q.offer.netTerms ?? 'none']}</p>
          </section>
        )}
        {(q.purchaseOrderNumber || q.purchaseOrderUrl) && (
          <section className="mt-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Purchase order</p>
            {q.purchaseOrderNumber && <p className="text-graphite">PO number: <span className="font-mono">{q.purchaseOrderNumber}</span></p>}
            {q.purchaseOrderUrl && <p className="text-graphite print:hidden"><a href={q.purchaseOrderUrl} target="_blank" rel="noopener noreferrer" className="text-brand-orange underline">View purchase order file</a></p>}
          </section>
        )}
        {q.offer?.note && (
          <section className="mt-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Terms from the seller</p>
            <p className="whitespace-pre-line text-graphite">{q.offer.note}</p>
          </section>
        )}
        <footer className="mt-10 pt-4 border-t border-bone text-[12px] text-slate">
          This quotation is between the institute and the seller named above, arranged through Edudeen. Quote {q.number} when you pay or contact the seller.
        </footer>
      </article>
    </div>
  );
}
