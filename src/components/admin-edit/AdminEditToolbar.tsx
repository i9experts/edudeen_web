import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { useAdminEdit } from '@/contexts/adminEditCtx';

/** Floating admin-only control: toggles inline Edit mode. Renders nothing for non-admins. */
export function AdminEditToolbar() {
  const { isAdmin, editing, setEditing } = useAdminEdit();
  if (!isAdmin) return null;
  return (
    <div translate="no" className="fixed end-3 bottom-[76px] md:bottom-4 z-[900] flex items-center gap-2 rounded-full bg-carbon text-white shadow-lg ps-3 pe-2 py-1.5 text-[12px]">
      <button
        type="button"
        role="switch"
        aria-checked={editing}
        onClick={() => setEditing(!editing)}
        className="inline-flex items-center gap-1.5 bg-transparent border-0 text-white font-semibold cursor-pointer"
      >
        <Pencil size={13} /> Edit mode: {editing ? 'ON' : 'OFF'}
      </button>
      <Link to="/admin" className="rounded-full bg-white/15 hover:bg-white/25 text-white no-underline px-2.5 py-1 font-medium">Back to admin</Link>
    </div>
  );
}