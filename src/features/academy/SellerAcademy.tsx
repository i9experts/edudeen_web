import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { EmptyState, InlineError, SearchInput, SkeletonBox, TabBar } from '@/components/comman/ui';
import { StorePageHeader } from '@/components/layouts/StoreLayout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlParam } from '@/hooks/useUrlParam';
import { useDebouncedValue } from '@/hooks/seller/useInventorySearch';
import { ACADEMY_CATEGORIES, apiAcademyCourses, type AcademyCourseCard, type AcademySort } from '@/api/services/academy';
import { CourseCard } from './academyShared';

const TABS: { id: AcademySort; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'most_viewed', label: 'Most viewed' },
  { id: 'latest',      label: 'Latest' },
];

export default function SellerAcademy() {
  usePageTitle('Edudeen Academy');
  const navigate = useNavigate();
  const [tab, setTab] = useUrlParam('tab');
  const [category, setCategory] = useUrlParam('category');
  const [search, setSearch] = useUrlParam('q');
  const sort = (TABS.some(t => t.id === tab) ? tab : 'recommended') as AcademySort;
  const [courses, setCourses] = useState<AcademyCourseCard[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const query = useDebouncedValue(search, 300);

  useEffect(() => {
    let cancelled = false;
    apiAcademyCourses({ sort, category: category || undefined, search: query || undefined })
      .then(res => { if (!cancelled) { setCourses(res.data ?? []); setError(''); } })
      .catch((err: unknown) => { if (!cancelled) { setCourses([]); setError(err instanceof Error ? err.message : 'Could not load courses.'); } });
    return () => { cancelled = true; };
  }, [sort, category, query, reload]);

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-medium cursor-pointer transition ${active ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-charcoal border-bone hover:border-border-hover'}`;

  return (
    <>
      <StorePageHeader title="Edudeen Academy" subtitle="Free training from the Edudeen team: set up, sell more and get paid." />
      <div className="px-4 md:px-8 pt-5 pb-10 max-w-[1200px] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <TabBar tabs={TABS} active={sort} onChange={id => setTab(id === 'recommended' ? '' : id)} />
          <SearchInput value={search} onChange={setSearch} placeholder="Search courses…" className="sm:max-w-[280px]" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button type="button" className={chip(!category)} onClick={() => setCategory('')}>All topics</button>
          {ACADEMY_CATEGORIES.map(c => (
            <button key={c.value} type="button" className={chip(category === c.value)} onClick={() => setCategory(c.value)}>{c.label}</button>
          ))}
        </div>

        {error && <InlineError message={error} onRetry={() => setReload(n => n + 1)} />}

        {courses === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => <SkeletonBox key={i} className="h-[300px] rounded-xl" />)}
          </div>
        ) : courses.length === 0 && !error ? (
          <EmptyState
            icon={<GraduationCap size={28} className="text-brand-orange" />}
            title={search || category ? 'No courses match' : 'Courses are on the way'}
            description={search || category ? 'Try another topic or search word.' : 'The Edudeen team is preparing training for sellers. Check back soon.'}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(c => <CourseCard key={c._id} course={c} onOpen={() => navigate(c.slug)} />)}
          </div>
        )}
      </div>
    </>
  );
}
