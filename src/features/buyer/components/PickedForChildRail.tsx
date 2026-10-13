import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionHead } from '@/components/comman/marketplace/SectionHead';
import { ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import { apiBrowseProducts, type MarketplaceProduct } from '@/api/services/marketplace';
import { useChildren, childLevelLabel } from '@/hooks/useChildren';
import { useT } from '@/contexts/languageCtx';

/** Subject-interest matches first (name/tags/description), the rest keep API order. */
function rankBySubjects(list: MarketplaceProduct[], subjects: string[]) {
  const subs = subjects.map(s => s.toLowerCase());
  if (!subs.length) return list;
  const score = (p: MarketplaceProduct) => {
    const text = `${p.name} ${p.description ?? ''} ${(p.tags ?? []).join(' ')}`.toLowerCase();
    return subs.some(s => text.includes(s)) ? 1 : 0;
  };
  return [...list].sort((a, b) => score(b) - score(a));
}

/**
 * "Picked for <child> (Class 3)" — the same product list API the browse filters use,
 * filtered by the active child's level (+ age when set). Hidden with no active child,
 * and when nothing matches.
 */
export function PickedForChildRail({ renderCard }: { renderCard: (p: MarketplaceProduct, i: number) => React.ReactNode }) {
  const t = useT();
  const navigate = useNavigate();
  const { selected } = useChildren();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const id = selected?._id;
  const level = selected?.educationLevel;
  const age = selected?.age ?? undefined;
  const subjectsKey = (selected?.subjects ?? []).join('|');

  useEffect(() => {
    if (!id || !level) { setProducts([]); return; }
    let cancelled = false;
    setLoading(true);
    const subjects = subjectsKey ? subjectsKey.split('|') : [];
    apiBrowseProducts({ educationLevel: level, age, limit: 20 })
      .then(res => (res.data?.products?.length || age == null ? res : apiBrowseProducts({ educationLevel: level, limit: 20 })))
      .then(res => { if (!cancelled) setProducts(rankBySubjects(res.data?.products ?? [], subjects).slice(0, 5)); })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, level, age, subjectsKey]);

  if (!selected) return null;
  if (!loading && products.length === 0) return null;

  const params = new URLSearchParams({ grade: selected.educationLevel });
  if (selected.age != null) params.set('age', String(selected.age));

  return (
    <section className="mb-12">
      <SectionHead
        eyebrow={t('For your child')}
        title={`${t('Picked for')} ${selected.name} (${childLevelLabel(selected)})`}
        action={{ label: t('View all'), onClick: () => navigate(`/search?${params.toString()}`) }}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-[14px] gap-y-[25px] md:gap-x-[22px] md:gap-y-[28px]">
        {loading ? Array.from({ length: 5 }, (_, i) => <ResourceCardSkeleton key={i} />) : products.map(renderCard)}
      </div>
    </section>
  );
}
