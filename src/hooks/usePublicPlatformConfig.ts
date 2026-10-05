import { apiGetPublicPlatformConfig, type PublicPlatformConfig } from '@/api/services/publicPlatformConfig';
import { createSharedResource } from '@/hooks/createSharedResource';

// One request per page load, shared by every consumer (footer, seller pages).
// Failure resolves to `null` — callers just hide whatever depended on it.
const resource = createSharedResource<PublicPlatformConfig | null>(() =>
  apiGetPublicPlatformConfig().then(res => res.data ?? null).catch(() => null),
);

export function usePublicPlatformConfig() {
  const { data, loading } = resource.useSharedResource();
  return { config: data, loading };
}
