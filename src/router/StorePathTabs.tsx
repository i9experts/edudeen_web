import { type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { TabBar } from '@/components/comman/ui/TabBar';

export interface StorePathTab { id: string; label: string; element: ReactNode }

/** Several related store pages behind one sidebar entry. Each tab keeps its own
 *  URL (`/store/:id/<tab id>`), so old links and bookmarks still work. */
export function StorePathTabs({ tabs }: { tabs: StorePathTab[] }) {
  const { storeId = '' } = useParams<{ storeId: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = pathname.split('/').filter(Boolean).pop() ?? '';
  const active = tabs.find(t => t.id === current) ?? tabs[0];

  return (
    <div>
      <div className="px-4 lg:px-7 pt-4">
        <TabBar
          tabs={tabs.map(t => ({ id: t.id, label: t.label }))}
          active={active.id}
          onChange={id => navigate(`/store/${storeId}/${id}`)}
        />
      </div>
      {active.element}
    </div>
  );
}
