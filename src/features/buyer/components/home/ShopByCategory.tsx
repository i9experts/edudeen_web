import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SectionHead } from '@/components/comman/marketplace/SectionHead';
import { CategoryArt } from '@/components/comman/art/CategoryArt';
import { SkeletonBox } from '@/components/comman/ui';
import { useT } from '@/contexts/languageCtx';
import { categoryUrl } from '@/hooks/marketplace/useCategoryTree';
import { cloudinaryUrl } from '@/utils/cloudinaryImage';
import type { CategoryNode } from '@/api/services/categories';

const MAX_TILES = 8;

function Tile({ node }: { node: CategoryNode }) {
  const t = useT();
  const [broken, setBroken] = useState(false);
  const n = node.productCount;
  // Real product photo first, then the admin's category image, then the illustration.
  const photo = node.coverImage || node.image;
  return (
    <Link to={categoryUrl(node.slug || node._id)} className="group block no-underline">
      <div className="aspect-[4/3] rounded-[14px] overflow-hidden bg-[#eaf2f8] border border-transparent group-hover:border-brand-royal/30 transition-colors">
        {photo && !broken
          ? <img src={cloudinaryUrl(photo, 480)} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} className="w-full h-full object-cover" />
          : <CategoryArt name={node.name} className="w-full h-full" />}
      </div>
      <p className="text-[14px] md:text-[15px] font-bold text-carbon mt-2 mb-0 line-clamp-1 group-hover:text-brand-orange">{node.name}</p>
      {typeof n === 'number' && n > 0 && (
        <p className="text-[12px] text-slate m-0">{n} {t(n === 1 ? 'resource' : 'resources')}</p>
      )}
    </Link>
  );
}

/** Top categories from the admin's category tree, biggest first (an empty category is skipped). Uploaded image, else the brand illustration. */
export function ShopByCategory({ categories, loading }: { categories: CategoryNode[]; loading: boolean }) {
  const t = useT();
  const top = useMemo(
    () => categories
      .filter(c => (c.productCount ?? 0) > 0)
      .map((c, i) => ({ c, i }))
      .sort((a, b) => (b.c.productCount ?? 0) - (a.c.productCount ?? 0) || a.i - b.i)
      .slice(0, MAX_TILES)
      .map(x => x.c),
    [categories],
  );
  if (loading && top.length === 0) {
    return (
      <section className="mb-12" aria-hidden>
        <SectionHead eyebrow="Browse by subject" title="Shop by category" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i}><SkeletonBox height={120} className="rounded-[14px] mb-2" /><SkeletonBox width="60%" height={14} /></div>)}
        </div>
      </section>
    );
  }
  if (top.length === 0) return null;
  return (
    <section className="mb-12" aria-label={t('Shop by category')}>
      <SectionHead eyebrow="Browse by subject" title="Shop by category" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
        {top.map(c => <Tile key={c._id} node={c} />)}
      </div>
    </section>
  );
}
