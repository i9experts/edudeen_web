import { useEffect, useState } from 'react';
import type { PromotionPlacement } from '@/api/services/banner';
import { BANNERS_CHANGED_EVENT, cachedBanners, loadPlacementBanners } from '@/components/comman/marketplace/placementBannerCache';

/** Whether a banner placement has live banners (shares PlacementBanner's cache). `loaded` = first answer received. */
export function useHasPlacementBanners(placement: PromotionPlacement) {
  const [state, setState] = useState(() => { const n = cachedBanners(placement).length; return { loaded: n > 0, has: n > 0 }; });
  useEffect(() => {
    let alive = true;
    const run = () => loadPlacementBanners(placement).then(l => { if (alive) setState({ loaded: true, has: l.length > 0 }); });
    run();
    window.addEventListener(BANNERS_CHANGED_EVENT, run);
    return () => { alive = false; window.removeEventListener(BANNERS_CHANGED_EVENT, run); };
  }, [placement]);
  return state;
}