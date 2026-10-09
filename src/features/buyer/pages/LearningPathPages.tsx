import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Route as RouteIcon, BookmarkPlus, ArrowRight } from 'lucide-react';
import { BuyerNavbar, Breadcrumb, Footer, Button, EmptyState } from '@/components/comman/ui';
import { ResourceCard } from '@/components/comman/marketplace/ResourceCard';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useToast } from '@/contexts/ToastContext';
import { TokenStorage } from '@/api/services/auth';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { apiGetLearningPath, apiListLearningPaths, apiSaveLearningPathToList, type LearningPathDetail, type LearningPathSummary } from '@/api/services/retention';

const levelLabel = (v: string | null) => EDUCATION_LEVELS.find(l => l.value === v)?.label ?? null;

/** `/learning-paths` - admin-curated paths by grade. Empty until an admin creates one. */
export function LearningPathsIndexPage() {
  usePageTitle('Learning paths');
  usePageMeta('Step-by-step learning paths by grade on Edudeen - hand-picked resources, in the order to use them.');
  const [paths, setPaths] = useState<LearningPathSummary[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { apiListLearningPaths().then(r => setPaths(r.data ?? [])).catch(() => setError(true)); }, []);

  const byLevel = new Map<string, LearningPathSummary[]>();
  for (const p of paths ?? []) byLevel.set(levelLabel(p.educationLevel) ?? 'All grades', [...(byLevel.get(levelLabel(p.educationLevel) ?? 'All grades') ?? []), p]);

  return (
    <div className="bg-white min-h-full">
      <div className="sticky top-[var(--navbar-top,0px)] z-50"><BuyerNavbar /></div>
      <main className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] pt-4 md:pt-6 pb-12">
        <Breadcrumb className="mb-1" items={[{ label: 'Home', path: '/' }, { label: 'Learn', path: '/learn' }, { label: 'Learning paths' }]} />
        <header className="mb-6">
          <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-1">Learn by grade</p>
          <h1 className="font-serif font-normal text-[30px] md:text-[38px] leading-[1.15] text-carbon">Learning paths</h1>
          <p className="text-[14.5px] text-graphite mt-2 max-w-[70ch]">Picked by the Edudeen team: the subjects to cover for each grade, with the resources to use, in order.</p>
        </header>
        {error ? (
          <EmptyState icon={<RouteIcon size={22} />} title="Could not load learning paths" description="Please try again in a moment." />
        ) : paths === null ? (
          <p className="text-[13px] text-slate">Loading...</p>
        ) : paths.length === 0 ? (
          <EmptyState icon={<RouteIcon size={22} />} title="No learning paths yet" description="We are preparing grade-by-grade paths. In the meantime, browse resources by grade." action={{ label: 'Browse by grade', onClick: () => { window.location.assign('/learn'); } }} />
        ) : (
          [...byLevel.entries()].map(([label, list]) => (
            <section key={label} className="mb-8">
              <h2 className="text-[16px] font-bold text-carbon mb-3">{label}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {list.map(p => (
                  <Link key={p._id} to={`/learning-paths/${p.slug}`} className="no-underline rounded-2xl border border-bone p-5 flex flex-col gap-2 hover:border-brand-orange">
                    <p className="text-[15px] font-bold text-carbon m-0">{p.title}</p>
                    {p.subtitle && <p className="text-[13px] text-graphite m-0">{p.subtitle}</p>}
                    <p className="text-[12px] text-slate m-0">{p.ageLabel ? `${p.ageLabel} · ` : ''}{p.stepCount} step{p.stepCount === 1 ? '' : 's'}</p>
                    <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-semibold text-brand-orange">View path <ArrowRight size={13} /></span>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
      <Footer />
    </div>
  );
}

/** `/learning-paths/:slug` - the ordered steps with picks, and "Save as my reading list". */
export function LearningPathPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [path, setPath] = useState<LearningPathDetail | null>(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  usePageTitle(path?.title ?? 'Learning path');
  usePageMeta(path ? `${path.title} - a step-by-step learning path on Edudeen.` : null);
  useEffect(() => { setPath(null); setError(false); apiGetLearningPath(slug).then(r => setPath(r.data)).catch(() => setError(true)); }, [slug]);

  const save = async () => {
    if (!TokenStorage.isLoggedIn()) { try { sessionStorage.setItem('afterAuthPath', `/learning-paths/${slug}`); } catch { /* ignore */ } navigate('/login'); return; }
    setSaving(true);
    try {
      const r = await apiSaveLearningPathToList(slug);
      toast.success(`Saved ${r.data.added} resource${r.data.added === 1 ? '' : 's'} to your reading list`);
      navigate('/account/lists');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save this path.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white min-h-full">
      <div className="sticky top-[var(--navbar-top,0px)] z-50"><BuyerNavbar /></div>
      <main className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] pt-4 md:pt-6 pb-12">
        <Breadcrumb className="mb-1" items={[{ label: 'Home', path: '/' }, { label: 'Learning paths', path: '/learning-paths' }, { label: path?.title ?? 'Path' }]} />
        {error ? (
          <EmptyState icon={<RouteIcon size={22} />} title="This path isn't available" description="It may have been taken down." action={{ label: 'See all paths', onClick: () => navigate('/learning-paths') }} />
        ) : !path ? (
          <p className="text-[13px] text-slate">Loading...</p>
        ) : (
          <>
            <header className="mb-8 flex items-end gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-1">{[levelLabel(path.educationLevel), path.ageLabel].filter(Boolean).join(' · ') || 'Learning path'}</p>
                <h1 className="font-serif font-normal text-[28px] md:text-[36px] leading-[1.15] text-carbon">{path.title}</h1>
                {path.subtitle && <p className="text-[14.5px] text-graphite mt-2 max-w-[70ch]">{path.subtitle}</p>}
                {path.description && <p className="text-[13.5px] text-slate mt-1 max-w-[70ch]">{path.description}</p>}
              </div>
              <Button variant="primary" size="sm" icon={<BookmarkPlus size={14} />} loading={saving} onClick={save}>Save as my reading list</Button>
            </header>
            <ol className="list-none p-0 m-0 flex flex-col gap-10">
              {path.steps.map((s, i) => (
                <li key={s._id}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className="size-8 rounded-full bg-brand-pale-orange text-brand-orange font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div>
                      <h2 className="text-[17px] font-bold text-carbon m-0">{s.title}</h2>
                      {s.note && <p className="text-[13px] text-graphite m-0">{s.note}</p>}
                    </div>
                  </div>
                  {s.products.length === 0 ? (
                    <p className="text-[13px] text-slate ms-11">The picks for this step are not available right now.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
                      {s.products.map((p, j) => <ResourceCard key={p._id} product={p} index={j} onClick={slugOrId => navigate(`/product/${slugOrId}`)} />)}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
