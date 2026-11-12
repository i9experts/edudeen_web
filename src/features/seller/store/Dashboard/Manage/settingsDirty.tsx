import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/comman/ui/Button';
import { useToast } from '@/contexts/ToastContext';

/**
 * Dirty registry for ONE Store Settings tab: every card on the tab registers
 * "am I changed / can I save / save / discard", and the tab shows ONE sticky
 * bar (Save + Discard) while anything is dirty. Cards keep their own API calls;
 * only the button is hoisted. A card used outside a registry gets no handle
 * (nothing registers), so it can still render its own button if it wants.
 */
export interface SectionHandle {
  label: string;
  dirty: boolean;
  /** Message when the current values can't be saved (the whole Save is refused). */
  blocked?: string | null;
  /** Throws on failure (message is shown to the seller). */
  save: () => Promise<void>;
  discard: () => void;
}

interface Registry {
  set: (id: string, h: SectionHandle) => void;
  remove: (id: string) => void;
}

const Ctx = createContext<Registry | null>(null);
export const SettingsRegistryProvider = Ctx.Provider;

/** Register a section with an explicit registry (used by the tab that owns it). */
export function useRegisterSection(reg: Registry | null, id: string, handle: SectionHandle) {
  useEffect(() => { reg?.set(id, handle); });
  useEffect(() => () => reg?.remove(id), [reg, id]);
}

/** Register a card with the registry provided by the surrounding tab. */
export function useSettingsSection(id: string, handle: SectionHandle) {
  useRegisterSection(useContext(Ctx), id, handle);
}

export function useSettingsRegistry() {
  const toast = useToast();
  const handles = useRef(new Map<string, SectionHandle>());
  const sig = useRef('');
  const [, bump] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signature = () => [...handles.current.entries()]
    .map(([id, h]) => `${id}:${h.dirty ? 1 : 0}:${h.blocked ?? ''}`).join('|');

  const registry = useMemo<Registry>(() => ({
    set: (id, h) => {
      handles.current.set(id, h);
      const s = signature();
      if (s !== sig.current) { sig.current = s; bump(n => n + 1); }
    },
    remove: id => {
      if (!handles.current.delete(id)) return;
      sig.current = signature();
      bump(n => n + 1);
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const dirtyList = [...handles.current.values()].filter(h => h.dirty);
  const blocked = dirtyList.find(h => h.blocked)?.blocked ?? null;
  const dirty = dirtyList.length > 0;

  async function saveAll() {
    if (saving) return;
    const list = [...handles.current.values()].filter(h => h.dirty);
    if (!list.length) return;
    const b = list.find(h => h.blocked);
    if (b) { setError(b.blocked ?? 'Fix the highlighted fields first.'); return; }
    setSaving(true); setError(null);
    const failed: string[] = [];
    for (const h of list) {
      try { await h.save(); } catch (err) { failed.push(`${h.label}: ${err instanceof Error ? err.message : 'could not save'}`); }
    }
    setSaving(false);
    if (failed.length) setError(failed.join(' '));
    else toast.success('Settings saved.');
  }

  function discardAll() {
    handles.current.forEach(h => { if (h.dirty) h.discard(); });
    setError(null);
  }

  return { registry, dirty, blocked, saving, error, saveAll, discardAll };
}

/** The single sticky bottom bar of a settings tab. Renders nothing while clean. */
export function SettingsSaveBar({ dirty, blocked, saving, error, onSave, onDiscard }: {
  dirty: boolean; blocked: string | null; saving: boolean; error: string | null;
  onSave: () => void; onDiscard: () => void;
}) {
  if (!dirty && !error) return null;
  const text = error ?? blocked ?? 'You have unsaved changes';
  return (
    <div
      role="region" aria-label="Unsaved settings" data-chat-avoid
      className={`sticky bottom-3 z-20 mt-5 rounded-xl border shadow-[0_6px_24px_rgba(0,0,0,0.12)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-wrap items-center gap-3 ${error ? 'bg-error-bg border-error-border' : 'bg-white border-bone'}`}
    >
      <span role={error ? 'alert' : 'status'} className={`text-[13px] flex-1 min-w-[160px] ${error ? 'text-error' : 'text-charcoal'}`}>{text}</span>
      <Button variant="outline" size="xs" onClick={onDiscard} disabled={saving}>Discard</Button>
      <Button size="xs" onClick={onSave} disabled={saving || !dirty || !!blocked} icon={saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  );
}
