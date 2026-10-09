import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, FileText, Phone } from 'lucide-react';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Card, Button, Input, Textarea, Modal, SkeletonBox, EmptyState } from '@/components/comman/ui';
import { TabBar } from '@/components/comman/ui/TabBar';
import { useToast } from '@/contexts/ToastContext';
import {
  apiGetSellerQuotes, apiSendQuoteOffer, apiDeclineQuote, INSTITUTION_TYPES, NET_TERMS_LABEL, QUOTE_STATUS_LABEL, QUOTE_TONE, type NetTerms, type QuoteRequest,
} from '@/api/services/classroom';
import { currencySymbol } from '@/utils/currency';

const FILTERS = [
  { id: 'pending', label: 'New requests' },
  { id: 'quoted', label: 'Price sent' },
  { id: 'accepted', label: 'Accepted' },
  { id: '', label: 'All' },
];
const fmt = (n: number, c: string) => `${currencySymbol(c)} ${n.toLocaleString()}`;

function OfferDialog({ q, storeId, currency, onDone, onClose }: { q: QuoteRequest; storeId: string; currency: string; onDone: (q: QuoteRequest) => void; onClose: () => void }) {
  const toast = useToast();
  const [in14] = useState(() => new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10));
  const [unit, setUnit] = useState(q.offer ? String(q.offer.unitPrice) : '');
  const [validUntil, setValidUntil] = useState(q.offer?.validUntil?.slice(0, 10) ?? in14);
  const [note, setNote] = useState(q.offer?.note ?? '');
  const [netTerms, setNetTerms] = useState<NetTerms>(q.offer?.netTerms ?? 'none');
  const [busy, setBusy] = useState(false);
  const unitNum = Number(unit);

  const send = async () => {
    setBusy(true);
    try {
      const res = await apiSendQuoteOffer(storeId, q._id, { unitPrice: unitNum, validUntil: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : null, note, netTerms });
      toast.success('Quote sent to the buyer');
      onDone(res.data);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not send.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={`Price for ${q.institutionName}`} onClose={onClose} width={480} mobileSheet footer={
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="md" loading={busy} disabled={!(unitNum > 0)} onClick={send}>Send quote</Button>
      </div>
    }>
      <div className="px-5 py-4 flex flex-col gap-3">
        <p className="text-[13px] text-graphite">{q.quantity} × <b className="text-carbon">{q.productName}</b></p>
        <div className="grid grid-cols-2 gap-3">
          <Input label={`Price per unit (${currency})`} type="number" min={1} value={unit} onChange={e => setUnit(e.target.value)} />
          <Input label="Valid until" type="date" value={validUntil} min={new Date().toISOString().slice(0, 10)} onChange={e => setValidUntil(e.target.value)} />
        </div>
        {unitNum > 0 && <p className="text-[13px]">Total: <b>{fmt(Math.round(unitNum * q.quantity * 100) / 100, currency)}</b></p>}
        <div>
          <label htmlFor="quote-net-terms" className="block text-[12px] font-medium text-graphite mb-[6px]">Payment terms</label>
          <select id="quote-net-terms" value={netTerms} onChange={e => setNetTerms(e.target.value as NetTerms)} className="w-full py-[9px] px-3 text-[13px] border border-bone rounded-lg bg-white text-charcoal">
            {(Object.keys(NET_TERMS_LABEL) as NetTerms[]).map(k => <option key={k} value={k}>{NET_TERMS_LABEL[k]}</option>)}
          </select>
        </div>
        <Textarea label="Terms (optional)" rows={3} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder="Payment by bank transfer, delivery in 7 days, school licence included…" />
      </div>
    </Modal>
  );
}

/** Store → School Quotes: bulk price requests from schools and institutes. */
export function StoreQuotes() {
  usePageTitle('School Quotes');
  const toast = useToast();
  const { storeId, store } = useStoreWorkspace();
  const currency = (store as { baseCurrency?: string } | null)?.baseCurrency || 'PKR';
  const [filter, setFilter] = useState('pending');
  const [rows, setRows] = useState<QuoteRequest[] | null>(null);
  const [pending, setPending] = useState(0);
  const [pricing, setPricing] = useState<QuoteRequest | null>(null);

  const load = () => apiGetSellerQuotes(storeId, filter || undefined)
    .then(res => { setRows(res.data.quotes); setPending(res.data.pending); })
    .catch(() => setRows([]));
  useEffect(() => { setRows(null); void load(); }, [storeId, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const decline = async (q: QuoteRequest) => {
    const reason = window.prompt('Tell the buyer why (optional) — e.g. "Can only supply up to 50 copies"', '');
    if (reason === null) return;
    try { await apiDeclineQuote(storeId, q._id, reason); toast.success('Request declined'); void load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not decline.'); }
  };

  return (
    <>
      <StorePageHeader title="School Quotes" subtitle="Schools, madrasas and academies asking for a bulk price. Reply with a price; they accept and you arrange payment and delivery." />
      <div className="px-4 lg:px-7 pb-8 pt-5 flex flex-col gap-4 max-w-[980px]">
        <TabBar tabs={FILTERS.map(f => ({ id: f.id || 'all', label: f.id === 'pending' && pending ? `${f.label} (${pending})` : f.label }))} active={filter || 'all'} onChange={id => setFilter(id === 'all' ? '' : id)} />
        {rows === null ? (
          <SkeletonBox height={150} rounded="12px" />
        ) : rows.length === 0 ? (
          <Card><EmptyState icon={<FileSpreadsheet size={22} />} title="No requests here" description="Buyers see a “Get a bulk price” button on every product page." /></Card>
        ) : rows.map(q => (
          <Card key={q._id} padding="none">
            <div className="px-4 md:px-5 py-3 border-b border-bone flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[13px] font-semibold text-carbon">{q.number}</span>
              <span className={clsx('rounded-full px-2 py-[2px] text-[12px] font-semibold', QUOTE_TONE[q.status])}>{QUOTE_STATUS_LABEL[q.status]}</span>
              <span className="ml-auto text-[12px] text-slate">{new Date(q.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="px-4 md:px-5 py-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
              <div className="min-w-0 flex flex-col gap-1">
                <p className="text-[14px] font-semibold text-carbon">{q.quantity} × {q.productName}</p>
                <p className="text-[13px] text-charcoal">{q.institutionName} <span className="text-slate">· {INSTITUTION_TYPES.find(t => t.value === q.institutionType)?.label}{q.city ? ` · ${q.city}` : ''}</span></p>
                <p className="inline-flex items-center gap-1 text-[12.5px] text-graphite"><Phone size={12} /> {q.contactName} · <a href={`tel:${q.contactPhone}`} className="text-brand-orange">{q.contactPhone}</a>{q.buyerEmail ? ` · ${q.buyerEmail}` : ''}</p>
                {q.message && <p className="text-[12.5px] text-graphite mt-1 whitespace-pre-line rounded-lg bg-cream px-3 py-2">{q.message}</p>}
                {(q.purchaseOrderNumber || q.purchaseOrderUrl) && (
                  <p className="text-[12.5px] text-graphite mt-1">
                    Purchase order: {q.purchaseOrderNumber ? <b className="font-mono">{q.purchaseOrderNumber}</b> : null}
                    {q.purchaseOrderUrl && <> {q.purchaseOrderNumber ? '· ' : ''}<a href={q.purchaseOrderUrl} target="_blank" rel="noopener noreferrer" className="text-brand-orange underline">view file</a></>}
                  </p>
                )}
                {q.offer && <p className="text-[12.5px] text-slate mt-1">Your price: <b className="text-carbon">{fmt(q.offer.totalPrice, q.offer.currency)}</b> ({fmt(q.offer.unitPrice, q.offer.currency)} each){q.offer.validUntil ? ` · valid until ${new Date(q.offer.validUntil).toLocaleDateString()}` : ''}</p>}
              </div>
              <div className="flex md:flex-col gap-2 md:items-end flex-wrap">
                {(q.status === 'pending' || q.status === 'quoted') && (
                  <>
                    <Button variant="primary" size="sm" onClick={() => setPricing(q)}>{q.status === 'quoted' ? 'Update price' : 'Send a price'}</Button>
                    <Button variant="ghost" size="sm" onClick={() => decline(q)}>Decline</Button>
                  </>
                )}
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
      {pricing && <OfferDialog q={pricing} storeId={storeId} currency={currency} onClose={() => setPricing(null)} onDone={() => { setPricing(null); void load(); }} />}
    </>
  );
}
