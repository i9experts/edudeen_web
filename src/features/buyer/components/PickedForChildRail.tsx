import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionHead } from '@/components/comman/marketplace/SectionHead';
import { ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import { apiBrowseProducts, type MarketplaceProduct } from '@/api/services/marketplace';
import { useChildren, childLevelLabel } from '@/hooks/useChildren';
import { canonicalClass } from '@/constants/classLevels';
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
  // Exact class beats the coarse level when the child has one.
  const classValue = canonicalClass(selected?.gradeLabel) ?? undefined;
  const subjectsKey = (selected?.subjects ?? []).join('|');

  useEffect(() => {
    if (!id || !level) { setProducts([]); return; }
    let cancelled = false;
    setLoading(true);
    const subjects = subjectsKey ? subjectsKey.split('|') : [];
    const levelFilter = classValue ? { classValue } : { educationLevel: level, age };
    const generic = () => (classValue ? apiBrowseProducts({ classValue, limit: 20 }) : apiBrowseProducts({ educationLevel: level, age, limit: 20 }))
      .then(res => (res.data?.products?.length || classValue ? res : age == null ? res : apiBrowseProducts({ educationLevel: level, limit: 20 })))
      .then(res => rankBySubjects(res.data?.products ?? [], subjects));
    // Every subject the parent picked gets a turn: A1 B1 C1 A2 B2 ... (class filter kept, whole platform).
    const bySubject = () => Promise.all(subjects.map(s => apiBrowseProducts({ ...levelFilter, q: s, limit: 6 }).catch(() => null)))
      .then(list => {
        const seen = new Set<string>();
        const merged: MarketplaceProduct[] = [];
        const longest = Math.max(0, ...list.map(r => r?.data?.products?.length ?? 0));
        for (let i = 0; i < longest; i++) {
          for (const r of list) {
            const p = r?.data?.products?.[i];
            if (p && !seen.has(p._id)) { seen.add(p._id); merged.push(p); }
          }
        }
        return merged.length ? merged : generic();
      });
    (subjects.length ? bySubject() : generic())
      .then(list => { if (!cancelled) setProducts(list.slice(0, subjects.length > 5 ? subjects.length : 5)); })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, level, age, classValue, subjectsKey]);

  if (!selected) return null;
  if (!loading && products.length === 0) return null;

  const params = classValue ? new URLSearchParams({ class: classValue }) : new URLSearchParams({ grade: selected.educationLevel });
  if (!classValue && selected.age != null) params.set('age', String(selected.age));
  // All the subjects the parent picked: the shop shows results for each of them together.
  const subjectList = (selected.subjects ?? []).map(s => s.trim()).filter(Boolean);
  if (subjectList.length) params.set('subjects', subjectList.join(','));

  return (
    <section className="mb-12">
      <SectionHead
        eyebrow={t('For your child')}
        title={`${t('Picked for')} ${selected.name} (${childLevelLabel(selected)})`}
        action={{ label: t('View all'), onClick: () => navigate(`/?${params.toString()}`) }}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-[14px] gap-y-[25px] md:gap-x-[22px] md:gap-y-[28px]">
        {loading ? Array.from({ length: 5 }, (_, i) => <ResourceCardSkeleton key={i} />) : products.map(renderCard)}
      </div>
    </section>
  );
}
