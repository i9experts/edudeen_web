import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { TabBar } from '@/components/comman/ui/TabBar';
import { PageTabsCtx } from '@/components/layouts/PageTabsContext';

export interface StorePathTab { id: string; label: string; element: ReactNode }

/** Several related store pages behind one sidebar entry. Each tab keeps its own
 *  URL (`/store/:id/<tab id>`), so old links and bookmarks still work.
 *  The tab bar renders under the page's StorePageHeader; a page without one gets it on top. */
export function StorePathTabs({ tabs }: { tabs: StorePathTab[] }) {
  const { storeId = '' } = useParams<{ storeId: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = pathname.split('/').filter(Boolean).pop() ?? '';
  const active = tabs.find(t => t.id === current) ?? tabs[0];
  const [claimed, setClaimed] = useState(false);
  const claim = useCallback(() => { setClaimed(true); return () => setClaimed(false); }, []);

  const tabBar = (
    <TabBar
      tabs={tabs.map(t => ({ id: t.id, label: t.label }))}
      active={active.id}
      onChange={id => navigate(`/store/${storeId}/${id}`)}
    />
  );
  const ctx = useMemo(() => ({ tabBar, claim }), [tabBar, claim]);

  return (
    <PageTabsCtx.Provider value={ctx}>
      <div>
        {!claimed && <div className="px-4 lg:px-7 pt-4">{tabBar}</div>}
        {active.element}
      </div>
    </PageTabsCtx.Provider>
  );
}
