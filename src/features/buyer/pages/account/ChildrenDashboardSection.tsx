import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Baby, ArrowRight } from 'lucide-react';
import { Card, SkeletonBox } from '@/components/comman/ui';
import { useT } from '@/contexts/languageCtx';
import { apiGetMyLibrary, type LibraryItem } from '@/api/services/orders';
import { apiListLearningPaths, type LearningPathSummary } from '@/api/services/retention';
import { useChildren, childLevelLabel } from '@/hooks/useChildren';

/**
 * Parent dashboard: per child, the My Library items that match their level and
 * the existing learning paths for that level. No second library — the same
 * `my-library` data, only filtered by educationLevel.
 */
export function ChildrenDashboardSection() {
  const t = useT();
  const { children } = useChildren();
  const [library, setLibrary] = useState<LibraryItem[] | null>(null);
  const [paths, setPaths] = useState<Record<string, LearningPathSummary[]>>({});
  const [failed, setFailed] = useState(false);

  const hasChildren = children.length > 0;
  const levelsKey = [...new Set(children.map(c => c.educationLevel))].sort().join('|');

  useEffect(() => {
    if (!hasChildren) return;
    let alive = true;
    setFailed(false);
    apiGetMyLibrary().then(r => { if (alive) setLibrary(r.data.items ?? []); }).catch(() => { if (alive) { setLibrary([]); setFailed(true); } });
    return () => { alive = false; };
  }, [hasChildren]);

  useEffect(() => {
    if (!levelsKey) return;
    let alive = true;
    levelsKey.split('|').forEach(level => {
      apiListLearningPaths(level)
        .then(r => { if (alive) setPaths(p => ({ ...p, [level]: r.data ?? [] })); })
        .catch(() => { if (alive) setPaths(p => ({ ...p, [level]: [] })); });
    });
    return () => { alive = false; };
  }, [levelsKey]);

  if (!hasChildren) return null;

  return (
    <Card padding="none" className="dash-section-enter">
      <div className="px-5 pt-5 pb-3 border-b border-bone flex items-center gap-2">
        <Baby size={16} className="text-brand-orange" aria-hidden />
        <h2 className="text-[15px] font-bold text-carbon m-0">{t('Your children')}</h2>
        <Link to="/account/children" className="ms-auto text-[12.5px] font-semibold text-brand-orange no-underline">{t('Manage')}</Link>
      </div>
      {library === null ? (
        <div className="p-4 flex flex-col gap-2"><SkeletonBox height={64} rounded="10px" /></div>
      ) : (
        <div className="divide-y divide-bone">
          {children.map(c => {
            const owned = library.filter(i => i.educationLevel === c.educationLevel);
            const next = paths[c.educationLevel];
            return (
              <div key={c._id} className="px-5 py-4 flex flex-col gap-2">
                <p className="text-[14px] font-bold text-carbon m-0">
                  {c.name} <span className="font-normal text-graphite">· {childLevelLabel(c)}</span>
                </p>
                <p className="text-[13px] text-graphite m-0">
                  {failed
                    ? t('Could not load your library.')
                    : owned.length === 0
                      ? t('Nothing in your library for this level yet.')
                      : `${owned.length} ${owned.length === 1 ? t('resource in My Library') : t('resources in My Library')}`}
                </p>
                {owned.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {owned.slice(0, 4).map(i => (
                      <Link key={i.itemId} to="/account/downloads" className="rounded-full bg-[#eaf2f8] text-brand-royal px-2.5 py-[3px] text-[12px] font-medium no-underline max-w-[220px] truncate">{i.name}</Link>
                    ))}
                    {owned.length > 4 && <Link to="/account/downloads" className="text-[12px] text-slate underline self-center">{t('View all')}</Link>}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate">{t('Next steps')}</span>
                  {next === undefined ? (
                    <span className="text-[12.5px] text-slate">…</span>
                  ) : next.length === 0 ? (
                    <Link to={`/?grade=${encodeURIComponent(c.educationLevel)}`} className="text-[13px] font-semibold text-brand-orange no-underline inline-flex items-center gap-1">{t('Browse resources for this level')} <ArrowRight size={13} /></Link>
                  ) : next.slice(0, 3).map(p => (
                    <Link key={p._id} to={`/learning-paths/${p.slug}`} className="text-[13px] font-semibold text-brand-orange no-underline inline-flex items-center gap-1">{p.title} <ArrowRight size={13} /></Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
