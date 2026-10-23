import { useEffect, useState } from 'react';
import { apiGetHomeCards, type HomeCard } from '@/api/services/homeCards';

// Cards change rarely: one shared fetch, revalidated every minute.
const TTL_MS = 60 * 1000;
let cache: { at: number; cards: HomeCard[] } | null = null;
let inflight: Promise<HomeCard[]> | null = null;

function load(): Promise<HomeCard[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.cards);
  if (!inflight) {
    inflight = apiGetHomeCards()
      .then(r => r.data ?? [])
      .catch(() => cache?.cards ?? [])
      .then(cards => { cache = { at: Date.now(), cards }; inflight = null; return cards; });
  }
  return inflight;
}

export function invalidateHomeCards() { cache = null; inflight = null; }

/** Active home cards in admin order. `loaded` stays false until the first answer (so the page can avoid flashing a fallback). */
export function useHomeCards() {
  const [cards, setCards] = useState<HomeCard[]>(cache?.cards ?? []);
  const [loaded, setLoaded] = useState(!!cache);
  useEffect(() => {
    let alive = true;
    load().then(c => { if (alive) { setCards(c); setLoaded(true); } });
    return () => { alive = false; };
  }, []);
  return { cards, loaded };
}