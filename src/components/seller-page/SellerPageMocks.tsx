import { BadgeCheck, Bell, Star } from 'lucide-react';
import { CategoryArt, type ArtId } from '@/components/comman/art/CategoryArt';
import { formatMoney } from '@/utils/currency';
import type { MarketplaceProduct } from '@/api/services/marketplace';
import type { SellerPageMock } from '@/api/services/publicPlatformConfig';

/**
 * Static, decorative previews for the /become-a-seller feature rows. No animation, hidden from
 * assistive tech (the row's text carries the meaning) and always labelled "Example".
 */
const ExampleTag = () => (
  <span className="absolute top-3 end-3 rounded-full bg-carbon/85 text-white text-[12px] font-semibold px-2.5 py-[3px]">Example</span>
);

const SAMPLE_CARDS: { title: string; art: ArtId; tag: string }[] = [
  { title: 'Grade 3 Maths Worksheets', art: 'math', tag: 'Digital' },
  { title: 'Quran Tajweed Workbook', art: 'quran', tag: 'Printed' },
  { title: 'Urdu Handwriting Practice', art: 'urdu', tag: 'Digital' },
];

function productPrice(p: MarketplaceProduct): string | null {
  const v = (p.variants ?? []).filter(x => typeof x.price === 'number');
  if (!v.length) return null;
  const min = v.reduce((a, b) => (b.price < a.price ? b : a));
  return min.price <= 0 ? 'Free' : formatMoney(min.price, min.currency);
}

function MiniCard({ title, price, image, art, rating, tag }: { title: string; price: string; image?: string; art?: ArtId; rating?: number; tag?: string }) {
  return (
    <div className="rounded-xl bg-white border border-bone overflow-hidden flex flex-col min-w-0">
      <div className="aspect-[4/3] bg-cream relative">
        {image
          ? <img src={image} alt="" loading="lazy" className="w-full h-full object-cover" />
          : <CategoryArt art={art} className="w-full h-full" />}
        {tag && <span className="absolute top-1.5 start-1.5 rounded bg-white/90 text-[12px] font-semibold text-slate px-1.5 py-px">{tag}</span>}
      </div>
      <div className="p-2.5 flex flex-col gap-1">
        <p className="text-[12px] font-semibold text-carbon leading-snug line-clamp-2 min-h-[2.4em]">{title}</p>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[12px] font-bold text-carbon">{price}</span>
          {rating != null && rating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[12px] text-slate"><Star size={11} className="text-[#F5A623] fill-[#F5A623]" />{rating.toFixed(1)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/** A miniature storefront: header (logo, name, verified tick) + three product cards (real top resources when available). */
export function StoreMock({ products }: { products: MarketplaceProduct[] }) {
  const real = products.filter(p => p.images?.[0] && productPrice(p)).slice(0, 3);
  return (
    <div className="relative rounded-2xl bg-white border border-bone shadow-sm overflow-hidden" aria-hidden>
      <ExampleTag />
      <div className="h-14 bg-[#E3F4EA]" />
      <div className="px-4 -mt-6 flex items-end gap-3">
        <div className="w-14 h-14 rounded-xl bg-white border-2 border-white shadow overflow-hidden shrink-0"><CategoryArt art="books" className="w-full h-full" /></div>
        <div className="pb-1 min-w-0">
          <p className="text-[14px] font-bold text-carbon flex items-center gap-1 truncate">Your Store Name <BadgeCheck size={15} className="text-brand-royal shrink-0" /></p>
          <p className="text-[12px] text-slate">Educational resources</p>
        </div>
      </div>
      <div className="p-4 grid grid-cols-3 gap-2.5">
        {real.length === 3
          ? real.map(p => <MiniCard key={p._id} title={p.name} price={productPrice(p) ?? ''} image={p.images[0]} rating={p.averageRating} />)
          : SAMPLE_CARDS.map(c => <MiniCard key={c.title} title={c.title} price="Your price" art={c.art} tag={c.tag} />)}
      </div>
      {real.length === 3 && <p className="px-4 pb-3 -mt-1 text-[12px] text-slate">Resources currently popular on Edudeen.</p>}
    </div>
  );
}

const CHART = [14, 22, 18, 30, 27, 41, 38, 55, 49, 66];

/** A miniature seller dashboard: revenue line + 3 stat tiles. Numbers are an illustration, never a claim. */
export function SalesMock({ avgRating }: { avgRating?: number | null }) {
  const W = 300; const H = 90; const max = Math.max(...CHART);
  const pts = CHART.map((v, i) => [(i / (CHART.length - 1)) * W, H - 8 - (v / max) * (H - 18)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const tiles = [
    { l: 'Orders', v: '128' },
    { l: 'Revenue', v: '$1,240' },
    avgRating && avgRating > 0 ? { l: 'Avg. rating on Edudeen', v: avgRating.toFixed(1) } : { l: 'Rating', v: '4.8' },
  ];
  return (
    <div className="relative rounded-2xl bg-white border border-bone shadow-sm p-4" aria-hidden>
      <ExampleTag />
      <p className="text-[12px] font-bold text-carbon mb-0.5">My Sales &amp; Earnings</p>
      <p className="text-[12px] text-slate mb-3">Example dashboard - your numbers will differ</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[90px]" preserveAspectRatio="none" focusable="false">
        <path d={area} fill="#174771" opacity="0.1" />
        <path d={line} fill="none" stroke="#174771" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={pts[pts.length - 1][0] - 2} cy={pts[pts.length - 1][1]} r="3.5" fill="#F28C28" />
      </svg>
      <div className="grid grid-cols-3 gap-2.5 mt-3">
        {tiles.map(t => (
          <div key={t.l} className="rounded-xl bg-cream border border-bone px-3 py-2.5 min-w-0">
            <p className="text-[12px] text-slate leading-tight truncate">{t.l}</p>
            <p className="text-[16px] font-extrabold text-carbon mt-0.5">{t.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** What followers receive when a seller posts a new resource. */
export function FollowersMock() {
  return (
    <div className="relative rounded-2xl bg-white border border-bone shadow-sm p-4 flex flex-col gap-3" aria-hidden>
      <ExampleTag />
      <p className="text-[12px] font-bold text-carbon flex items-center gap-1.5"><Bell size={13} className="text-brand-orange" />Note to my followers</p>
      <div className="flex gap-3 items-center rounded-xl bg-cream border border-bone p-3">
        <div className="w-14 h-14 rounded-lg bg-white overflow-hidden shrink-0"><CategoryArt art="worksheet" className="w-full h-full" /></div>
        <div className="min-w-0">
          <p className="text-[12px] text-slate">New from Your Store Name</p>
          <p className="text-[13px] font-semibold text-carbon leading-snug">Grade 3 Maths Worksheet Bundle is here</p>
        </div>
      </div>
      <span className="self-start rounded-full bg-brand-orange text-white text-[12px] font-semibold px-3 py-1">View resource</span>
    </div>
  );
}

export function FeatureVisual({ kind, imageUrl, alt, products, avgRating }: { kind: SellerPageMock; imageUrl: string; alt: string; products: MarketplaceProduct[]; avgRating?: number | null }) {
  if (imageUrl) return <img src={imageUrl} alt={alt} loading="lazy" className="w-full rounded-2xl border border-bone object-cover" />;
  if (kind === 'store') return <StoreMock products={products} />;
  if (kind === 'sales') return <SalesMock avgRating={avgRating} />;
  if (kind === 'followers') return <FollowersMock />;
  return null;
}
