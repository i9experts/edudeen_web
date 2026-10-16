import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Baby, BookOpen, GraduationCap, Library, School, Users } from 'lucide-react';
import { SectionHead } from '@/components/comman/marketplace/SectionHead';
import { SkeletonBox } from '@/components/comman/ui';
import { useT } from '@/contexts/languageCtx';
import { categoryUrl } from '@/hooks/marketplace/useCategoryTree';
import { apiGetEducationFacets } from '@/api/services/marketplace';
import type { CategoryNode } from '@/api/services/categories';
import { CLASS_TILE_LEVEL, GRADE_TILES, learnLevelPath } from './homeRules';

const ICONS: Record<string, typeof Baby> = { nursery: Baby, kg: BookOpen, primary: School, middle: Library, secondary: GraduationCap, teachers: Users };
const TINTS = ['bg-[#eaf2f8]', 'bg-[#edf5e7]', 'bg-[#f7f3d9]'];

function flatten(nodes: CategoryNode[], out: CategoryNode[] = []) {
  for (const n of nodes) { out.push(n); flatten(n.children ?? [], out); }
  return out;
}

/**
 * Shop by grade. Nursery / KG open the home `?class=` filter; the class ranges open the existing /learn/<level> pages;
 * Teachers opens the admin's teacher category. A tile with nothing behind it is hidden (levels from the education
 * facet counts, Teachers from the category tree). If the counts cannot be loaded the class tiles stay visible.
 */
export function ShopByGrade({ categories }: { categories: CategoryNode[] }) {
  const t = useT();
  const [counts, setCounts] = useState<Record<string, number> | null | 'loading'>('loading');
  useEffect(() => {
    let cancelled = false;
    apiGetEducationFacets()
      .then(res => { if (!cancelled) setCounts(Object.fromEntries((res.data?.levels ?? []).map(l => [l.level, l.count]))); })
      .catch(() => { if (!cancelled) setCounts(null); });
    return () => { cancelled = true; };
  }, []);

  const teacherCategory = useMemo(() => flatten(categories).find(c => /teacher/i.test(c.name) && (c.productCount ?? 1) > 0) ?? null, [categories]);

  const tiles = GRADE_TILES.map(g => {
    if (g.kind === 'teacher') return teacherCategory ? { ...g, to: categoryUrl(teacherCategory.slug || teacherCategory._id) } : null;
    const level = g.kind === 'class' ? CLASS_TILE_LEVEL[g.value] ?? g.value : g.value;
    if (counts && counts !== 'loading' && !(counts[level] > 0)) return null;
    return { ...g, to: g.kind === 'class' ? `/?class=${g.value}` : learnLevelPath(g.value) };
  }).filter((x): x is NonNullable<typeof x> => !!x);

  if (counts === 'loading') {
    return (
      <section className="mb-12" aria-hidden>
        <SectionHead eyebrow="Find the right level" title="Shop by grade" />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {GRADE_TILES.map(g => <SkeletonBox key={g.id} height={92} className="rounded-[14px]" />)}
        </div>
      </section>
    );
  }
  if (tiles.length === 0) return null;
  return (
    <section className="mb-12" aria-label={t('Shop by grade')}>
      <SectionHead eyebrow="Find the right level" title="Shop by grade" />
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {tiles.map((g, i) => {
          const Icon = ICONS[g.id] ?? BookOpen;
          return (
            <Link key={g.id} to={g.to}
              className={`${TINTS[i % TINTS.length]} group flex flex-col items-center justify-center gap-2 rounded-[14px] border border-transparent hover:border-brand-royal/30 hover:shadow-[0_6px_20px_rgba(19,57,86,0.08)] transition-all min-h-[92px] px-2 py-4 no-underline`}>
              <Icon size={22} className="text-brand-royal" aria-hidden />
              <span className="text-[14px] md:text-[15px] font-bold text-carbon text-center leading-tight">{t(g.label)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
