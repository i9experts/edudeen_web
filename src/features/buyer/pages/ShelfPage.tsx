import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { BuyerNavbar, Breadcrumb, Footer, EmptyState } from '@/components/comman/ui';
import { ResourceCard, ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePageMeta } from '@/hooks/usePageMeta';
import { apiGetShelf, type CuratedShelf } from '@/api/services/classroom';

/** `/picks/:slug` — an Edudeen-curated shelf such as "Exam ki tayyari". */
export function ShelfPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [shelf, setShelf] = useState<CuratedShelf | null>(null);
  const [error, setError] = useState(false);

  usePageTitle(shelf?.title ?? 'Edudeen picks');
  usePageMeta(shelf ? (shelf.subtitle || shelf.description || `${shelf.title} — hand-picked learning resources on Edudeen.`).slice(0, 160) : null);

  useEffect(() => {
    setShelf(null); setError(false);
    apiGetShelf(slug).then(res => setShelf(res.data)).catch(() => setError(true));
  }, [slug]);

  return (
    <div className="bg-white min-h-full">
      <div className="sticky top-0 z-50"><BuyerNavbar /></div>
      <main className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] pt-4 md:pt-6 pb-12">
        <Breadcrumb className="mb-1" items={[{ label: 'Home', path: '/' }, { label: shelf?.title ?? 'Edudeen picks' }]} />
        {error ? (
          <EmptyState icon={<Sparkles size={22} />} title="This collection has ended" description="Seasonal picks come and go — have a look at what's new." action={{ label: 'Browse resources', onClick: () => navigate('/search') }} />
        ) : (
          <>
            <header className="mb-6 rounded-2xl overflow-hidden border border-bone relative">
              {shelf?.image && <img src={shelf.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />}
              <div className="relative p-5 md:p-8">
                <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-1 inline-flex items-center gap-1"><Sparkles size={12} /> Edudeen picks</p>
                <h1 className="font-serif font-normal text-[28px] md:text-[38px] leading-[1.15] text-carbon">{shelf?.title ?? '…'}</h1>
                {shelf?.subtitle && <p className="text-[15px] text-graphite mt-1">{shelf.subtitle}</p>}
                {shelf?.description && <p className="text-[14px] text-graphite mt-2 max-w-[70ch] whitespace-pre-line">{shelf.description}</p>}
              </div>
            </header>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
              {!shelf
                ? Array.from({ length: 5 }, (_, i) => <ResourceCardSkeleton key={i} />)
                : shelf.products.map((p, i) => <ResourceCard key={p._id} product={p} index={i} onClick={s => navigate(`/product/${s}`)} />)}
            </div>
            {shelf && shelf.products.length === 0 && <p className="text-[13.5px] text-slate">Nothing on this shelf yet — check back soon.</p>}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
