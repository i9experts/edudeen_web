/** JSON-LD builders (schema.org). Only real data goes in: no rating block without reviews, no price without a price. */
export function productJsonLd(p: {
  name: string; description: string; images: string[]; url: string; sellerName?: string | null;
  price: number | null | undefined; currency: string; inStock: boolean; rating?: number; ratingCount?: number;
}): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, url: p.url,
    description: p.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000),
  };
  if (p.images.length) ld.image = p.images.slice(0, 6);
  if (p.sellerName) ld.brand = { '@type': 'Brand', name: p.sellerName };
  if (p.price != null) {
    ld.offers = {
      '@type': 'Offer', url: p.url, price: p.price, priceCurrency: p.currency || 'USD',
      availability: `https://schema.org/${p.inStock ? 'InStock' : 'OutOfStock'}`,
      ...(p.sellerName ? { seller: { '@type': 'Organization', name: p.sellerName } } : {}),
    };
  }
  if (p.ratingCount && p.ratingCount > 0 && p.rating && p.rating > 0) {
    ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: Number(p.rating.toFixed(1)), reviewCount: p.ratingCount };
  }
  return ld;
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}
