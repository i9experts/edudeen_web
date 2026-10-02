import { useT } from '@/contexts/languageCtx';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useCategoryTree } from '@/hooks/marketplace/useCategoryTree';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { apiGetEducationFacets } from '@/api/services/marketplace';
import type { CategoryNode } from '@/api/services/categories';
import { BuyerNavbar, Breadcrumb, Footer } from '@/components/comman/ui';
import { BrowseResults } from './MarketplaceBrowse';

// Grade × subject landing pages: /learn, /learn/primary-school,
// /learn/primary-school/mathematics — each a real, linkable, indexable page
// rather than a filter state, so parents and teachers can land straight on
// "Class 5 Maths" from a search engine.

const LEVELS = EDUCATION_LEVELS.filter(l => l.value !== 'other');
export const levelSlug = (value: string) => value.replace(/_/g, '-');
const levelFromSlug = (slug?: string) => LEVELS.find(l => levelSlug(l.value) === slug) ?? null;
export const learnPath = (level: string, subject?: { slug?: string | null; _id: string } | null) =>
  `/learn/${levelSlug(level)}${subject ? `/${subject.slug || subject._id}` : ''}`;

const BLURB: Record<string, string> = {
  preschool: 'Play-based phonics, numbers, colours and first Islamic manners for ages 3–5.',
  primary_school: 'Worksheets, workbooks and activity packs for Class 1 to 5.',
  middle_school: 'Practice books, notes and projects for Class 6 to 8.',
  secondary_school: 'Matric and O Level notes, past papers and revision packs.',
  college: 'Intermediate and A Level study material and guides.',
  university: 'Course notes, references and study tools for university students.',
  professional_courses: 'Skills, certifications and teacher-training resources.',
  islamic_education: 'Quran, Tajweed, Seerah, Arabic and Tarbiyyah for every age.',
};

export function LearnHubPage() {
  usePageTitle('Learn by grade');
  usePageMeta('Find educational resources by grade and subject on Edudeen — worksheets, books, courses and more for every class.');
  const { tree } = useCategoryTree();
  const t = useT();
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    apiGetEducationFacets()
      .then(res => setCounts(Object.fromEntries((res.data?.levels ?? []).map(l => [l.level, l.count]))))
      .catch(() => {});
  }, []);
  const subjects = tree.slice(0, 6);

  return (
    <div className="bg-white min-h-full">
      <div className="sticky top-0 z-50"><BuyerNavbar /></div>
      <main className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] pt-4 md:pt-6 pb-12">
        <Breadcrumb className="mb-1" items={[{ label: 'Home', path: '/' }, { label: 'Learn by grade' }]} />
        <header className="mb-6">
          <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-1">{t('Learn by grade')}</p>
          <h1 className="font-serif font-normal text-[30px] md:text-[38px] leading-[1.15] text-carbon text-balance">{t('Resources for every class')}</h1>
          <p className="text-[14.5px] text-graphite mt-2 max-w-[70ch]">{t('Pick a grade, then a subject — everything is made by teachers and checked by Edudeen.')}</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {LEVELS.map(l => (
            <section key={l.value} className="rounded-2xl border border-bone p-5 flex flex-col gap-3 min-w-0">
              <div className="flex items-start gap-3">
                <span className="size-10 rounded-xl bg-brand-pale-orange text-brand-orange flex items-center justify-center shrink-0"><GraduationCap size={18} /></span>
                <div className="min-w-0">
                  <h2 className="text-[16px] font-bold text-carbon m-0">
                    <Link to={learnPath(l.value)} className="no-underline text-carbon hover:text-brand-orange">{l.label}</Link>
                  </h2>
                  {typeof counts[l.value] === 'number' && <p className="text-[12px] text-slate">{counts[l.value]} resources</p>}
                </div>
              </div>
              <p className="text-[13px] text-graphite">{BLURB[l.value]}</p>
              {subjects.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
                  {subjects.map(s => (
                    <li key={s._id}>
                      <Link to={learnPath(l.value, s)} className="inline-block rounded-full border border-bone px-3 py-[5px] text-[12px] text-carbon no-underline hover:border-brand-orange hover:text-brand-orange">{s.name}</Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link to={learnPath(l.value)} className="mt-auto inline-flex items-center gap-1 text-[13px] font-semibold text-brand-orange no-underline">All {l.label} <ArrowRight size={13} /></Link>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

/** `/learn/:level` and `/learn/:level/:subject`. */
export function LearnLevelPage() {
  const { level: levelParam, subject: subjectParam } = useParams();
  const level = levelFromSlug(levelParam);
  const { tree, bySlug, byId, loading } = useCategoryTree();
  const entry = subjectParam ? bySlug.get(subjectParam.toLowerCase()) ?? byId.get(subjectParam) ?? null : null;
  const subject: CategoryNode | null = entry?.node ?? null;

  const title = level ? (subject ? `${subject.name} for ${level.label}` : `${level.label} resources`) : 'Learn';
  usePageTitle(title);
  usePageMeta(level ? `${title} on Edudeen — worksheets, books, notes and courses for ${level.label.toLowerCase()} learners, made by teachers.` : null);

  if (!level) return <Navigate to="/learn" replace />;
  if (subjectParam && !loading && !subject) return <Navigate to={learnPath(level.value)} replace />;
  if (subjectParam && !subject) return <div className="min-h-screen bg-white" />;

  // A level page lists subjects; a subject page lists that subject's topics.
  const chips = subject ? (subject.children?.length ? subject.children : (entry?.parent?.children ?? []).filter(c => c._id !== subject._id)) : tree;
  return (
    <BrowseResults
      key={`${level.value}-${subject?._id ?? 'all'}`}
      title={title}
      eyebrow={subject ? level.label : 'Learn by grade'}
      intro={subject ? subject.description : BLURB[level.value]}
      breadcrumb={[
        { label: 'Home', path: '/' },
        { label: 'Learn', path: '/learn' },
        ...(subject ? [{ label: level.label, path: learnPath(level.value) }, { label: subject.name }] : [{ label: level.label }]),
      ]}
      categoryId={subject?._id}
      fixedGrade={level.value}
      subcategories={chips}
      subcategoryHref={node => learnPath(level.value, node)}
      subcategoriesLabel={subject ? 'Topics' : 'Subjects'}
      showCategoryFilter={false}
      emptyHint={`Nothing for ${level.label.toLowerCase()} here yet — check back soon, teachers add new resources every week.`}
    />
  );
}
