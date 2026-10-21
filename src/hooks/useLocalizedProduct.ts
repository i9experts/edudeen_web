import { useMemo } from 'react';
import { useLanguage } from '@/contexts/languageCtx';
import type { MarketplaceProduct } from '@/api/services/marketplace';

/** In Urdu mode, shows the seller's Urdu title/description when they provided one; otherwise the product as-is. */
export function useLocalizedProduct(product: MarketplaceProduct): MarketplaceProduct {
  const { lang } = useLanguage();
  return useMemo(() => {
    if (lang !== 'ur' || (!product.nameUr && !product.descriptionUr)) return product;
    return {
      ...product,
      name: product.nameUr || product.name,
      description: product.descriptionUr || product.description,
    };
  }, [lang, product]);
}
