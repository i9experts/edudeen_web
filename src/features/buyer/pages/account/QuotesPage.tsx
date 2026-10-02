import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { Card, Button, SkeletonBox, EmptyState } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { apiGetMyQuotes, apiRespondToQuote, QUOTE_STATUS_LABEL, QUOTE_TONE, type QuoteRequest } from '@/api/services/classroom';
import { getStorePagePath } from '@/utils/storefrontUrl';
import { money } from './orderFormat';

const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Account → School Quotes: bulk price requests and the sellers' replies. */
export function QuotesPage() {
  const toast = useToast();
  const [quotes, setQuotes] = useState<QuoteRequest[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { apiGetMyQuotes().then(res => setQuotes(res.data ?? [])).catch(() => setQuotes([])); }, []);

  const respond = async (q: QuoteRequest, action: 'accept' | 'decline' | 'cancel') => {
    if (action !== 'accept' && !window.confirm(action === 'cancel' ? 'Cancel this request?' : 'Decline this price?')) return;
    setBusy(q._id + action);
    try {
      const res = await apiRespondToQuote(q._id, action);
      setQuotes(prev => (prev ?? []).map(x => x._id === q._id ? { ...x, status: res.data.status, respondedAt: res.data.respondedAt } : x));
      toast.success(res.message ?? 'Updated');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not update.'); }
    finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[20px] font-bold text-carbon">School Quotes</h1>
        <p className="text-[13px] text-slate">Bulk prices you asked for on behalf of a school, madrasa or academy.</p>
      </div>
      {quotes === null ? (
        <SkeletonBox height={140} rounded="12px" />
      ) : quotes.length === 0 ? (
        <Card><EmptyState icon={<FileSpreadsheet size={22} />} title="No quote requests yet" description="On any product page, tap “Buying for a school? Get a bulk price”." /></Card>
      ) : quotes.map(q => (
        <Card key={q._id} padding="none">
          <div className="px-4 md:px-5 py-3 border-b border-bone flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[13px] font-semibold text-carbon">{q.number}</span>
            <span className={clsx('rounded-full px-2 py-[2px] text-[11px] font-semibold', QUOTE_TONE[q.status])}>{QUOTE_STATUS_LABEL[q.status]}</span>
            <span className="ms-auto text-[12px] text-slate">Asked {date(q.createdAt)}</span>
          </div>
          <div className="px-4 md:px-5 py-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
            <div className="min-w-0">
              <Link to={`/product/${q.productId}`} className="text-[14px] font-semibold text-carbon no-underline hover:text-brand-orange">{q.productName}</Link>
              <p className="text-[12.5px] text-slate mt-0.5">
                {q.quantity} for {q.institutionName}{q.city ? `, ${q.city}` : ''} · from {q.storeSlug ? <Link to={getStorePagePath(q.storeSlug)} className="text-slate">{q.storeName}</Link> : q.storeName}
              </p>
              {q.offer && (
                <div className="mt-3 rounded-lg bg-cream px-3 py-2 text-[13px]">
                  <p><b className="text-carbon">{money(q.offer.totalPrice, q.offer.currency)}</b> <span className="text-slate">({money(q.offer.unitPrice, q.offer.currency)} each)</span></p>
                  {q.offer.validUntil && <p className="text-[12px] text-slate">Valid until {date(q.offer.validUntil)}</p>}
                  {q.offer.note && <p className="text-[12.5px] text-graphite mt-1 whitespace-pre-line">{q.offer.note}</p>}
                </div>
              )}
              {q.status === 'declined' && q.declineReason && <p className="mt-2 text-[12.5px] text-graphite">Seller: {q.declineReason}</p>}
              {q.status === 'accepted' && <p className="mt-2 text-[12.5px] text-success">The seller will contact {q.contactName} on {q.contactPhone} to arrange payment and delivery.</p>}
            </div>
            <div className="flex md:flex-col gap-2 md:items-end flex-wrap">
              {q.status === 'quoted' && (
                <>
                  <Button variant="primary" size="sm" loading={busy === q._id + 'accept'} onClick={() => respond(q, 'accept')}>Accept price</Button>
                  <Button variant="ghost" size="sm" loading={busy === q._id + 'decline'} onClick={() => respond(q, 'decline')}>Decline</Button>
                </>
              )}
              {q.status === 'pending' && <Button variant="ghost" size="sm" loading={busy === q._id + 'cancel'} onClick={() => respond(q, 'cancel')}>Cancel request</Button>}
              {q.offer && (
                <Link to={`/quotes/${q._id}/print`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-bone bg-white px-3 py-[6px] text-[12.5px] font-semibold text-carbon no-underline hover:border-brand-orange">
                  <FileText size={13} /> Quotation
                </Link>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
