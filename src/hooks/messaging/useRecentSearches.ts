import { useCallback, useState } from 'react';

const MAX_RECENT = 6;

/** Per-scope (buyer inbox vs a specific seller store inbox) recent search memory. */
export function useRecentSearches(scopeKey: string) {
  const storageKey = `edudeen:recent-searches:${scopeKey}`;

  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const commit = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setRecent(prev => {
      const next = [trimmed, ...prev.filter(r => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore quota errors */ }
      return next;
    });
  }, [storageKey]);

  const clear = useCallback(() => {
    setRecent([]);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  }, [storageKey]);

  const remove = useCallback((q: string) => {
    setRecent(prev => {
      const next = prev.filter(r => r !== q);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [storageKey]);

  return { recent, commit, clear, remove };
}
