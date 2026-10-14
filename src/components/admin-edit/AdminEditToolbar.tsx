import { lazy, Suspense, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelRightOpen, Pencil } from 'lucide-react';
import { useAdminEdit } from '@/contexts/adminEditCtx';

// Admin-only panel: its own chunk, never downloaded for visitors or for admins who have not turned Edit mode on.
const AdminEditSidebar = lazy(() => import('./AdminEditSidebar'));

const PANEL_KEY = 'adminEditPanel';
function readOpen() {
  try { return localStorage.getItem(PANEL_KEY) !== 'closed'; } catch { return true; }
}

/**
 * The ONE admin-only control for inline editing. Renders nothing for non-admins.
 * Off: a small pill that turns Edit mode on. On: the Site editor side panel (right drawer; bottom sheet on phones);
 * when the panel is collapsed, the pill stays so it can be reopened.
 */
export function AdminEditToolbar() {
  const { isAdmin, editing, setEditing } = useAdminEdit();
  const [open, setOpenState] = useState(readOpen);
  const setOpen = useCallback((v: boolean) => {
    setOpenState(v);
    try { localStorage.setItem(PANEL_KEY, v ? 'open' : 'closed'); } catch { /* storage blocked */ }
  }, []);
  const collapse = useCallback(() => setOpen(false), [setOpen]);

  if (!isAdmin) return null;
  const panelShown = editing && open;
  return (
    <>
      {editing && open && (
        <Suspense fallback={null}><AdminEditSidebar onCollapse={collapse} /></Suspense>
      )}
      {!panelShown && (
        <div translate="no" className="fixed end-3 bottom-[76px] md:bottom-4 z-[900] flex items-center gap-2 rounded-full bg-carbon text-white shadow-lg ps-3 pe-2 py-1.5 text-[12px]">
          <button
            type="button"
            role="switch"
            aria-checked={editing}
            onClick={() => { if (!editing) setOpen(true); setEditing(!editing); }}
            className="inline-flex items-center gap-1.5 bg-transparent border-0 text-white font-semibold cursor-pointer"
          >
            <Pencil size={13} /> Edit mode: {editing ? 'ON' : 'OFF'}
          </button>
          {editing && (
            <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 text-white border-0 cursor-pointer px-2.5 py-1 font-medium">
              <PanelRightOpen size={13} /> Panel
            </button>
          )}
          <Link to="/admin" className="rounded-full bg-white/15 hover:bg-white/25 text-white no-underline px-2.5 py-1 font-medium">Back to admin</Link>
        </div>
      )}
    </>
  );
}
