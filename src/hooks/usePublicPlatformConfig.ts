import { apiGetPublicPlatformConfig, type PublicPlatformConfig } from '@/api/services/publicPlatformConfig';
import { createSharedResource } from '@/hooks/createSharedResource';

// One request per page load, shared by every consumer (footer, seller pages).
// Failure resolves to `null` — callers just hide whatever depended on it.
const resource = createSharedResource<PublicPlatformConfig | null>(() =>
  apiGetPublicPlatformConfig().then(res => res.data ?? null).catch(() => null),
);

export function usePublicPlatformConfig() {
  const { data, loading, refetch } = resource.useSharedResource();
  /** Re-fetches the shared config so every consumer updates without a reload (used after an inline admin edit). */
  return { config: data, loading, refresh: refetch };
}
