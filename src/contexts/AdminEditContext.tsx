import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { TokenStorage } from '@/api/services/auth';
import { AdminEditCtx } from './adminEditCtx';
import { EditRegistryCtx, type EditableEntry } from './editRegistryCtx';

/** Holds the editable regions currently on screen (see useRegisterEditable). */
function EditRegistryProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<Map<string, EditableEntry>>(() => new Map());
  const register = useCallback((entry: EditableEntry) => {
    setMap(m => { const n = new Map(m); n.set(entry.id, entry); return n; });
    return () => setMap(m => { if (m.get(entry.id) !== entry) return m; const n = new Map(m); n.delete(entry.id); return n; });
  }, []);
  const value = useMemo(() => ({ entries: [...map.values()], register }), [map, register]);
  return <EditRegistryCtx.Provider value={value}>{children}</EditRegistryCtx.Provider>;
}

const KEY = 'adminEditMode';
// Dashboards and auth pages have their own admin tools - inline editing is for the public site only.
const NON_PUBLIC = /^\/(admin|store|seller|onboarding|login|register|verify-otp|forgot-password|reset-password)(\/|$)/;

function readAdmin() {
  try { return TokenStorage.isLoggedIn() && TokenStorage.getRole() === 'admin'; } catch { return false; }
}
function readEditing() {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
}

/** Tracks "admin is browsing the public site" + whether Edit mode is on. Edit mode only ever turns on for a real admin session. */
export function AdminEditProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [admin, setAdmin] = useState(readAdmin);
  const [on, setOn] = useState(readEditing);

  useEffect(() => {
    const sync = () => setAdmin(readAdmin());
    window.addEventListener('edudeen:auth-login', sync);
    window.addEventListener('edudeen:auth-logout', sync);
    return () => { window.removeEventListener('edudeen:auth-login', sync); window.removeEventListener('edudeen:auth-logout', sync); };
  }, []);
  useEffect(() => { setAdmin(readAdmin()); }, [pathname]);

  const setEditing = useCallback((v: boolean) => {
    setOn(v);
    try { if (v) sessionStorage.setItem(KEY, '1'); else sessionStorage.removeItem(KEY); } catch { /* storage blocked */ }
  }, []);

  const isAdmin = admin && !NON_PUBLIC.test(pathname);
  const value = useMemo(() => ({ isAdmin, editing: isAdmin && on, setEditing }), [isAdmin, on, setEditing]);
  return <AdminEditCtx.Provider value={value}><EditRegistryProvider>{children}</EditRegistryProvider></AdminEditCtx.Provider>;
}