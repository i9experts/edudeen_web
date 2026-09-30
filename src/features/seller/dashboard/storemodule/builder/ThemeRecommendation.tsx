import { THEMES, type ThemeDefinition } from './themes';
import { ThemeCard } from './ThemeCard';

interface StoreHint {
  sellerType?:   string | null;
  productTypes?: string[];
}

/** A small, explainable heuristic — not a model call. Falls back to a
 *  sensible universal trio whenever the store doesn't give us anything more
 *  specific to go on (a brand-new store, or one with a product mix that
 *  doesn't point clearly at one theme personality). */
function getRecommendedThemeIds(store: StoreHint): string[] {
  const types = store.productTypes ?? [];
  if (types.includes('digital_downloads') || types.includes('educational_resources')) {
    return ['tech-commerce', 'minimal-boutique', 'clean-grid'];
  }
  if (store.sellerType === 'creator') {
    return ['soft-studio', 'minimal-boutique', 'clean-grid'];
  }
  if (types.includes('physical_products')) {
    return ['warm-craft', 'fresh-market', 'clean-grid'];
  }
  return ['warm-craft', 'clean-grid', 'minimal-boutique'];
}

export function ThemeRecommendation({ store, baseThemeId, onApply, onPreview }: {
  store: StoreHint;
  baseThemeId: string | null;
  onApply: (theme: ThemeDefinition) => void;
  onPreview: (theme: ThemeDefinition) => void;
}) {
  const ids = getRecommendedThemeIds(store);
  const recommended = ids.map(id => THEMES.find(t => t.id === id)).filter((t): t is ThemeDefinition => !!t);
  if (recommended.length === 0) return null;

  return (
    <div>
      <p className="text-[13px] font-bold text-charcoal">Recommended for your store</p>
      <p className="text-[11.5px] text-slate mb-3">Based on your products and store category.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {recommended.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            active={theme.id === baseThemeId}
            onApply={() => onApply(theme)}
            onPreview={() => onPreview(theme)}
            size="compact"
          />
        ))}
      </div>
    </div>
  );
}
