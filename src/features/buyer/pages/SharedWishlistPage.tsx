import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { BuyerNavbar, Breadcrumb, Footer, EmptyState } from '@/components/comman/ui';
import { ResourceCard, ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import { usePageTitle } from '@/hooks/usePageTitle';
import { apiGetSharedWishlist } from '@/api/services/retention';
import type { MarketplaceProduct } from '@/api/services/marketplace';

/** `/wishlist/shared/:token` - someone's saved items, read-only. Shows product cards only (no name, no personal data). */
export function SharedWishlistPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<MarketplaceProduct[] | null>(null);
  const [error, setError] = useState(false);
  usePageTitle('Saved resources');

  useEffect(() => {
    setItems(null); setError(false);
    apiGetSharedWishlist(token).then(res => setItems(res.data.items ?? [])).catch(() => setError(true));
  }, [token]);

  return (
    <div className="bg-white min-h-full">
      <div className="sticky top-[var(--navbar-top,0px)] z-50"><BuyerNavbar /></div>
      <main className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] pt-4 md:pt-6 pb-12">
        <Breadcrumb className="mb-1" items={[{ label: 'Home', path: '/' }, { label: 'Saved resources' }]} />
        {error ? (
          <EmptyState icon={<Heart size={22} />} title="This link isn't available" description="The owner may have turned sharing off. Ask them for a new link." action={{ label: 'Browse resources', onClick: () => navigate('/search') }} />
        ) : (
          <>
            <header className="mb-6">
              <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-1">Shared with you</p>
              <h1 className="font-serif font-normal text-[28px] md:text-[36px] leading-[1.15] text-carbon">Saved resources</h1>
              {items && <p className="text-[12.5px] text-slate mt-1">{items.length} {items.length === 1 ? 'resource' : 'resources'}</p>}
            </header>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
              {items === null
                ? Array.from({ length: 5 }, (_, i) => <ResourceCardSkeleton key={i} />)
                : items.map((product, i) => <ResourceCard key={product._id} product={product} index={i} onClick={s => navigate(`/product/${s}`)} />)}
            </div>
            {items && items.length === 0 && <p className="text-[13.5px] text-slate">Nothing is saved here right now.</p>}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
