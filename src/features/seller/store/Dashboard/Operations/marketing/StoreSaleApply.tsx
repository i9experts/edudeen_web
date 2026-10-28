import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Clock, Loader2, Megaphone, Search, User } from 'lucide-react';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { Button, EmptyState, SkeletonBox } from '@/components/comman/ui';
import { useStoreCampaigns } from '@/hooks/store/useStoreCampaigns';
import { usePageTitle } from '@/hooks/usePageTitle';
import { apiBulkOffers, apiGetStoreInventory, type InventoryProduct } from '@/api/services/product';
import { currencySymbol } from '@/utils/currency';
import { formatPrice } from '@/utils/formatPrice';
import { statusLabel } from '@/constants/statusLabels';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Every product of the store (paged 100 at a time; the API caps a page at 100). */
async function loadAllProducts(storeId: string): Promise<InventoryProduct[]> {
  const out: InventoryProduct[] = [];
  for (let page = 1; page <= 30; page++) {
    const res = await apiGetStoreInventory(storeId, page, 100);
    out.push(...(res.data?.products ?? []));
    if (page >= (res.data?.pagination?.totalPages ?? 1)) break;
  }
  return out;
}

/** "Apply now" page of one Edudeen sale: the seller picks which of the products they already uploaded take part.
 *  Nothing is selected for them. New products pick a sale on the Add product form (CampaignPicker). */
export function StoreSaleApply() {
  const { campaignId = '' } = useParams();
  const { storeId, store } = useStoreWorkspace();
  const { campaigns, loading: campaignsLoading, error: campaignsError, refresh } = useStoreCampaigns(storeId);
  const campaign = campaigns.find(c => c._id === campaignId);
  usePageTitle(campaign ? `Apply: ${campaign.name}` : 'Apply to sale');

  const [products, setProducts] = useState<InventoryProduct[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(() => {
    setLoadError('');
    loadAllProducts(storeId)
      .then(list => {
        // Drafts / archived products cannot be bought, so only listings that can go live are offered.
        const usable = list.filter(p => p.status !== 'archived');
        setProducts(usable);
        const chosen = new Set(usable.filter(p => p.campaignIds?.includes(campaignId)).map(p => p.productId));
        setSelected(chosen);
        setInitial(chosen);
      })
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Could not load your products.'));
  }, [storeId, campaignId]);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (products ?? []).filter(p => !needle || p.name.toLowerCase().includes(needle) || (p.sku ?? '').toLowerCase().includes(needle));
  }, [products, q]);

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allVisibleOn = visible.length > 0 && visible.every(p => selected.has(p.productId));
  const toggleVisible = () => setSelected(prev => {
    const next = new Set(prev);
    for (const p of visible) { if (allVisibleOn) next.delete(p.productId); else next.add(p.productId); }
    return next;
  });

  const toAdd = [...selected].filter(id => !initial.has(id));
  const toRemove = [...initial].filter(id => !selected.has(id));
  const changed = toAdd.length + toRemove.length;

  const chunks = <T,>(arr: T[], n = 200) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  const apply = async () => {
    if (!campaign || saving || changed === 0) return;
    setSaving(true);
    setMessage(null);
    const skipped: string[] = [];
    try {
      for (const ids of chunks(toAdd)) {
        const r = await apiBulkOffers({ storeId, productIds: ids, action: 'campaign_add', campaignId });
        skipped.push(...(r.data?.skipped ?? []).map(s => s.reason));
      }
      for (const ids of chunks(toRemove)) {
        await apiBulkOffers({ storeId, productIds: ids, action: 'campaign_remove', campaignId });
      }
      await refresh();
      load();
      setMessage(skipped.length
        ? { kind: 'error', text: `Saved, but ${skipped.length} product(s) were skipped: ${[...new Set(skipped)].join('; ')}` }
        : { kind: 'ok', text: 'Saved. Your selected products join the sale automatically when it goes live.' });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Could not save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const off = campaign?.discountType && campaign.discountValue != null
    ? (campaign.discountType === 'percentage' ? `${campaign.discountValue}% off` : `${currencySymbol(campaign.currency ?? 'USD')}${campaign.discountValue} off`)
    : null;
  const started = campaign ? new Date(campaign.startDate).getTime() <= Date.now() : false;

  return (
    <>
      <StorePageHeader title="Apply to sale" subtitle={campaign?.name ?? 'Choose the products that join'} />
      <div className="px-4 lg:px-7 pt-5 pb-8 flex flex-col gap-5 max-w-[980px]">
        <Link to={`/store/${storeId}/marketing?tab=platform`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-royal no-underline w-fit">
          <ArrowLeft size={14} /> All Edudeen sales
        </Link>

        {campaignsLoading && !campaign ? (
          <SkeletonBox height={120} rounded="10px" />
        ) : !campaign ? (
          <EmptyState
            icon={<Megaphone size={28} className="text-brand-orange opacity-55" />}
            title={campaignsError || 'This sale is not available'}
            description="It may have ended or been removed. Go back to see the sales you can join."
          />
        ) : (
          <>
            <section className="rounded-2xl border border-bone bg-white p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[18px] font-bold text-carbon m-0">{campaign.name}</h2>
                {off && <span className="text-[12px] font-bold text-brand-orange bg-brand-pale-orange rounded-full px-2 py-[2px]">{off}</span>}
                <span className={`text-[12px] font-bold rounded-full px-2 py-[2px] ${started ? 'bg-success-bg text-success' : 'bg-brand-gold/15 text-[#8a7700]'}`}>
                  {started ? 'Live now' : 'Coming soon'}
                </span>
              </div>
              {campaign.description && <p className="text-[13px] text-slate m-0">{campaign.description}</p>}
              <p className="flex items-center gap-1.5 text-[12.5px] text-slate m-0"><Clock size={12} /> {day(campaign.startDate)} – {day(campaign.endDate)}</p>
              <p className="flex items-center gap-1.5 text-[12.5px] text-slate m-0">
                {campaign.sponsorType === 'platform'
                  ? <><Building2 size={13} className="text-success" /> Edudeen covers this discount — you still receive your full price.</>
                  : <><User size={13} /> The discount comes out of your payout for orders placed during the sale.</>}
              </p>
              <p className="text-[12.5px] text-graphite m-0 mt-1 leading-relaxed">
                While the sale is live, your own sale price / compare-at discount on a selected product is hidden and the Edudeen sale price is shown instead. When the sale ends, your own price comes back.
              </p>
            </section>

            {loadError ? (
              <div className="flex items-center gap-3">
                <p className="text-[13px] text-error m-0">{loadError}</p>
                <Button size="sm" variant="outline" onClick={load}>Retry</Button>
              </div>
            ) : products === null ? (
              <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonBox key={i} height={56} rounded="10px" />)}</div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={<Megaphone size={28} className="text-brand-orange opacity-55" />}
                title="You have no products yet"
                description="Add a product first. When you add one, you can pick this sale right on the Add product form."
              />
            ) : (
              <section className="rounded-2xl border border-bone bg-white overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-bone">
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-carbon cursor-pointer">
                    <input type="checkbox" checked={allVisibleOn} onChange={toggleVisible} className="size-4 accent-[#174771] cursor-pointer" />
                    Select {q.trim() ? 'shown' : 'all'} ({visible.length})
                  </label>
                  <div className="relative ms-auto w-full sm:w-[260px]">
                    <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate" />
                    <input
                      value={q}
                      onChange={e => setQ(e.target.value)}
                      placeholder="Search your products"
                      aria-label="Search your products"
                      className="w-full h-9 ps-9 pe-3 rounded-lg border border-bone text-[13px] outline-none focus:border-brand-royal"
                    />
                  </div>
                </div>
                <ul className="list-none m-0 p-0 divide-y divide-bone">
                  {visible.map(p => {
                    const on = selected.has(p.productId);
                    return (
                      <li key={p.productId}>
                        <label className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${on ? 'bg-brand-royal/5' : 'hover:bg-cream'}`}>
                          <input type="checkbox" checked={on} onChange={() => toggle(p.productId)} className="size-4 accent-[#174771] cursor-pointer shrink-0" />
                          {p.image
                            ? <img src={p.image} alt="" loading="lazy" className="size-10 rounded-md object-cover shrink-0" />
                            : <span className="size-10 rounded-md bg-cream shrink-0" />}
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13.5px] font-semibold text-carbon truncate">{p.name}</span>
                            <span className="block text-[12px] text-slate">{statusLabel(p.status)}</span>
                          </span>
                          <span className="text-[13px] font-semibold text-carbon shrink-0">{formatPrice(p.price, store?.baseCurrency ?? 'USD')}</span>
                        </label>
                      </li>
                    );
                  })}
                  {visible.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-slate">No product matches “{q}”.</li>}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      {campaign && products && products.length > 0 && (
        <div className="sticky bottom-0 z-20 border-t border-bone bg-white/95 backdrop-blur px-4 lg:px-7 py-3 flex items-center gap-3 [padding-bottom:max(12px,env(safe-area-inset-bottom))]">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-carbon m-0">{selected.size} of {products.length} products in this sale</p>
            {message
              ? <p className={`text-[12px] m-0 ${message.kind === 'ok' ? 'text-success' : 'text-error'}`}>{message.text}</p>
              : changed > 0 && <p className="text-[12px] text-slate m-0">{toAdd.length ? `+${toAdd.length} to add` : ''}{toAdd.length && toRemove.length ? ' · ' : ''}{toRemove.length ? `${toRemove.length} to remove` : ''}</p>}
          </div>
          <Button onClick={apply} disabled={saving || changed === 0}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : initial.size === 0 ? 'Apply now' : 'Save changes'}
          </Button>
        </div>
      )}
    </>
  );
}
