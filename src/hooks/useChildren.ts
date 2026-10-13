import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { apiGetChildren, type ChildProfile } from '@/api/services/children';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { childClassLabel } from '@/constants/classLevels';
import { isBuyerSession } from '@/hooks/auth/useIsBuyer';
import { TokenStorage } from '@/api/services/auth';

// One shared store for "My children" + the "Shopping for" selection, so the
// switcher, Home rail, Browse and Account pages all agree without a provider.
// The selection lives in localStorage (and follows other tabs via `storage`).

const SEL_KEY = 'edudeen.activeChild';

interface State { children: ChildProfile[]; loading: boolean; error: string; loaded: boolean }
let state: State = { children: [], loading: false, error: '', loaded: false };
let selectedId = '';
try { selectedId = localStorage.getItem(SEL_KEY) ?? ''; } catch { /* storage unavailable */ }
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const setState = (patch: Partial<State>) => { state = { ...state, ...patch }; emit(); };

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key !== SEL_KEY) return;
    selectedId = e.newValue ?? '';
    emit();
  });
}

// Who the cached children belong to — a different login must not see the previous buyer's children.
let owner = '';
const currentOwner = () => { const u = TokenStorage.getUser<{ id?: string; _id?: string; email?: string }>(); return u?.id ?? u?._id ?? u?.email ?? ''; };

let inflight: Promise<void> | null = null;
export function refreshChildren(): Promise<void> {
  if (!isBuyerSession()) { setState({ children: [], loaded: false, loading: false, error: '' }); return Promise.resolve(); }
  if (inflight) return inflight;
  owner = currentOwner();
  setState({ loading: true, error: '' });
  inflight = apiGetChildren()
    .then(res => setState({ children: res.data ?? [], loaded: true, loading: false }))
    .catch(err => setState({ error: err instanceof Error ? err.message : 'Could not load your children.', loaded: true, loading: false }))
    .finally(() => { inflight = null; });
  return inflight;
}

export function selectChild(id: string) {
  selectedId = id;
  try { if (id) localStorage.setItem(SEL_KEY, id); else localStorage.removeItem(SEL_KEY); } catch { /* storage unavailable */ }
  emit();
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getState = () => state;
const getSel = () => selectedId;

const LEVEL_LABEL = new Map<string, string>(EDUCATION_LEVELS.map(l => [l.value, l.label]));
/** "Class 3" (a known class value, or old free text kept as typed), else the level name ("Primary School"). */
export const childLevelLabel = (c: Pick<ChildProfile, 'gradeLabel' | 'educationLevel'>) =>
  childClassLabel(c.gradeLabel) || LEVEL_LABEL.get(c.educationLevel) || c.educationLevel;

/** Children of the signed-in buyer (empty for guests/sellers) + the active "Shopping for" child. */
export function useChildren() {
  const s = useSyncExternalStore(subscribe, getState);
  const sel = useSyncExternalStore(subscribe, getSel);
  const buyer = isBuyerSession();

  useEffect(() => {
    if (!buyer) { if (state.loaded) { owner = ''; selectedId = ''; setState({ children: [], loaded: false, error: '' }); } return; }
    if (state.loaded && owner !== currentOwner()) setState({ children: [], loaded: false });
    if (!state.loaded && !state.loading) void refreshChildren();
  }, [buyer, s.loaded]);

  const children = buyer ? s.children : [];
  // A deleted child must not stay selected.
  const selected = children.find(c => c._id === sel) ?? null;
  const select = useCallback((id: string) => selectChild(id), []);
  return { children, selected, select, loading: buyer && s.loading, error: s.error, reload: refreshChildren };
}
