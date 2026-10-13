import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Minus, Scale, ShoppingCart, X } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { BuyerNavbar, Breadcrumb, Footer, EmptyState } from '@/components/comman/ui';
import { RatingLine } from '@/components/comman/marketplace/ResourceCard';
import { apiCompareProducts, type MarketplaceProduct } from '@/api/services/marketplace';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { CURRICULUM_LABEL, ageLabel } from '@/constants/learning';
import { useCategoryTree } from '@/hooks/marketplace/useCategoryTree';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { useCartContext } from '@/contexts/CartContext';
import { formatMoney } from '@/utils/currency';
import { MAX_COMPARE, useCompare } from '@/utils/compareStore';
import { getStorePagePath } from '@/utils/storefrontUrl';
import { useT } from '@/contexts/languageCtx';

const LEVEL_LABEL = new Map<string, string>(EDUCATION_LEVELS.map(l => [l.value, l.label]));
const DELIVERY_FORMAT: Record<string, string> = { download: 'Instant download', course: 'Online course', live_class: 'Live class' };

const kindOf = (p: MarketplaceProduct) => p.productType ?? p.type ?? 'physical';
const defaultVariant = (p: MarketplaceProduct) => (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];

/** `/compare?ids=a,b,c` — side-by-side table of up to 4 products. Selection lives in localStorage (works logged out). */
export function ComparePage() {
  usePageTitle('Compare products');
  const t = useT();
  const [params, setParams] = useSearchParams();
  const { items, remove, clear } = useCompare();
  const { byId } = useCategoryTree();
  const { currency, convert } = useCurrencyPreference();
  const { addToCart } = useCartContext();

  // A shared link (?ids=) wins; otherwise the locally picked products.
  const urlIds = (params.get('ids') ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, MAX_COMPARE);
  const ids = useMemo(() => (urlIds.length ? urlIds : items.map(i => i.id)), [urlIds.join(','), items]); // eslint-disable-line react-hooks/exhaustive-deps
  const idsKey = ids.join(',');

  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [adding, setAdding] = useState('');
  const [added, setAdded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!idsKey) { setProducts([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError('');
    apiCompareProducts(idsKey.split(','))
      .then(res => { if (!cancelled) setProducts((res.data?.products ?? []) as MarketplaceProduct[]); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the products to compare.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [idsKey, reload]);

  const removeOne = (id: string) => {
    remove(id);
    if (urlIds.length) {
      const next = urlIds.filter(x => x !== id);
      setParams(next.length ? { ids: next.join(',') } : {}, { replace: true });
    }
  };

  const quickAdd = async (p: MarketplaceProduct) => {
    const v = defaultVariant(p);
    if (!v) return;
    setAdding(p._id);
    try { await addToCart(p._id, v._id, kindOf(p) === 'physical' ? 'physical' : 'digital'); setAdded(a => ({ ...a, [p._id]: true })); }
    catch { /* the cart context surfaces its own error */ }
    finally { setAdding(''); }
  };

  const yes = (on: boolean) => on
    ? <span className="inline-flex items-center gap-1 text-success"><Check size={14} aria-hidden /> {t('Yes')}</span>
    : <span className="inline-flex items-center gap-1 text-slate"><Minus size={14} aria-hidden /> {t('No')}</span>;

  type Row = { label: string; cell: (p: MarketplaceProduct) => ReactNode };
  const rows: Row[] = [
    { label: 'Price', cell: p => {
      const v = defaultVariant(p);
      const raw = v?.price ?? 0;
      const pct = p.activeCampaign?.discountType === 'percentage' && p.activeCampaign.discountValue ? p.activeCampaign.discountValue : 0;
      const eff = pct ? Math.round(raw * (1 - pct / 100)) : raw;
      return <strong className="text-[15px] text-carbon">{raw === 0 ? t('Free') : formatMoney(convert(eff, v?.currency), currency)}</strong>;
    } },
    { label: 'Rating', cell: p => p.totalRatings ? <RatingLine rating={p.averageRating} count={p.totalRatings} /> : <span className="text-slate">{t('No reviews yet')}</span> },
    { label: 'Grade / level', cell: p => (p.educationLevel ? (p.educationLevel === 'other' ? p.customLevel : LEVEL_LABEL.get(p.educationLevel)) : null) ?? '—' },
    { label: 'Age', cell: p => ageLabel(p.ageMin, p.ageMax) ?? '—' },
    { label: 'Subject / category', cell: p => byId.get(p.subCategoryId ?? '')?.node.name ?? byId.get(p.categoryId)?.node.name ?? '—' },
    { label: 'Exam board', cell: p => (p.curricula?.length ? p.curricula.map(c => CURRICULUM_LABEL[c] ?? c).join(', ') : '—') },
    { label: 'Type', cell: p => ({ physical: t('Physical'), digital: t('Digital'), educational: t('Educational') }[kindOf(p)] ?? kindOf(p)) },
    { label: 'Format', cell: p => {
      if (kindOf(p) === 'physical') return t('Printed / physical');
      const n = p.digital?.fileCount ?? p.digital?.files?.length;
      const fmt = DELIVERY_FORMAT[p.deliveryFormat ?? 'download'];
      const pg = p.digital?.pageCount;
      const pages = pg ? ` · ${pg} ${pg === 1 ? t('page') : t('pages')}` : '';
      return n ? `${t(fmt)} · ${n} ${n === 1 ? t('file') : t('files')}${pages}` : `${t(fmt)}${pages}`;
    } },
    { label: 'License', cell: p => (p.digital?.licenseType ? p.digital.licenseType.replace(/_/g, ' ') : '—') },
    { label: 'Delivery', cell: p => kindOf(p) === 'physical' ? t('Ships to you') : p.deliveryFormat === 'course' ? t('Online course') : p.deliveryFormat === 'live_class' ? t('Live class') : t('Instant download') },
    { label: 'Preview available', cell: p => (kindOf(p) === 'physical' ? <span className="text-slate">—</span> : yes(!!p.digital?.previewAvailable)) },
    { label: 'Seller', cell: p => {
      const name = p.storeName ?? p.sellerName;
      if (!name) return '—';
      return p.storeSlug ? <Link to={getStorePagePath(p.storeSlug)} className="font-semibold text-brand-orange no-underline hover:underline">{name}</Link> : name;
    } },
  ];

  const cols = products.length;
  const body = (() => {
    if (loading) return <div className="h-64 rounded-2xl bg-bone animate-pulse" aria-busy="true" />;
    if (error) return (
      <div role="alert" className="text-center py-16">
        <p className="text-[14px] text-error mb-3">{error}</p>
        <button type="button" onClick={() => setReload(r => r + 1)} className="rounded-full bg-carbon text-white px-5 py-2 text-[14px] font-semibold border-none cursor-pointer">{t('Try again')}</button>
      </div>
    );
    if (cols === 0) return (
      <EmptyState
        icon={<Scale size={28} className="text-slate" />}
        title={t('Nothing to compare yet')}
        description={t('Tap the compare icon on 2 to 4 products, then come back here.')}
        action={{ label: t('Browse resources'), onClick: () => { window.location.assign('/search'); } }}
      />
    );
    return (
      <>
        {cols < 2 && <p className="text-[14px] text-graphite mb-4">{t('Add at least one more product to see a comparison.')}</p>}
        <div className="overflow-x-auto rounded-2xl border border-bone">
          <table className="w-full border-collapse text-[14px] min-w-[560px]" style={{ minWidth: Math.max(560, 150 + cols * 190) }}>
            <thead>
              <tr>
                <th scope="col" className="sticky start-0 z-10 bg-white w-[120px] min-w-[120px] sm:w-[150px] p-3 text-start align-bottom border-b border-bone text-[12px] font-bold uppercase tracking-wide text-slate">{t('Product')}</th>
                {products.map(p => (
                  <th key={p._id} scope="col" className="p-3 align-top text-start border-b border-bone min-w-[170px] font-normal">
                    <div className="relative">
                      <button type="button" onClick={() => removeOne(p._id)} aria-label={`${t('Remove')} ${p.name}`} className="absolute -top-1 -end-1 size-6 rounded-full bg-carbon text-white border-none flex items-center justify-center cursor-pointer"><X size={12} aria-hidden /></button>
                      <Link to={`/product/${p.slug}`} className="block no-underline text-carbon">
                        <div className="aspect-square w-full max-w-[150px] rounded-xl overflow-hidden bg-bone flex items-center justify-center">
                          {p.images?.[0] ? <img src={p.images[0]} alt="" loading="lazy" className="w-full h-full object-cover" /> : <span className="text-[12px] font-bold text-slate px-2 text-center">{p.name}</span>}
                        </div>
                        <span className="block mt-2 font-bold leading-snug line-clamp-3">{p.name}</span>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.label} className="odd:bg-[#fafbfb]">
                  <th scope="row" className="sticky start-0 z-10 bg-inherit p-3 text-start align-top border-t border-bone text-[13px] font-semibold text-graphite bg-white">{t(r.label)}</th>
                  {products.map(p => <td key={p._id} className="p-3 align-top border-t border-bone text-carbon">{r.cell(p)}</td>)}
                </tr>
              ))}
              <tr>
                <th scope="row" className="sticky start-0 z-10 bg-white p-3 border-t border-bone" />
                {products.map(p => {
                  const v = defaultVariant(p);
                  const single = (p.variants ?? []).length === 1;
                  return (
                    <td key={p._id} className="p-3 align-top border-t border-bone">
                      <div className="flex flex-col gap-2">
                        {single && v ? (
                          <button
                            type="button"
                            onClick={() => quickAdd(p)}
                            disabled={adding === p._id || added[p._id]}
                            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-orange text-white border-none px-4 py-2 text-[13px] font-bold cursor-pointer disabled:opacity-70 disabled:cursor-default"
                          ><ShoppingCart size={14} aria-hidden /> {added[p._id] ? t('Added') : adding === p._id ? t('Adding…') : t('Add to cart')}</button>
                        ) : null}
                        <Link to={`/product/${p.slug}`} className="inline-flex items-center justify-center rounded-full border border-carbon text-carbon no-underline px-4 py-2 text-[13px] font-semibold hover:bg-[#f3f5f6]">{single ? t('View') : t('Choose options')}</Link>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={() => { clear(); setParams({}, { replace: true }); }} className="text-[13px] font-semibold text-carbon underline underline-offset-4 bg-transparent border-none cursor-pointer">{t('Clear comparison')}</button>
        </div>
      </>
    );
  })();

  return (
    <div className="bg-white min-h-full">
      <div className="sticky top-[var(--navbar-top,0px)] z-50"><BuyerNavbar /></div>
      <main className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] pt-4 md:pt-6 pb-12">
        <Breadcrumb className="mb-1" items={[{ label: 'Home', path: '/' }, { label: 'Compare' }]} />
        <h1 className="font-serif font-normal text-[28px] md:text-[36px] leading-[1.15] text-carbon mb-5">{t('Compare products')}</h1>
        {body}
      </main>
      <Footer />
    </div>
  );
}
