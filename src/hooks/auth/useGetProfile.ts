import { apiGetProfile, TokenStorage, type ProfileData } from '@/api/services/auth';
import { createSharedResource } from '@/hooks/createSharedResource';

// Shared across every component that calls useGetProfile() — the profile is one
// global resource, so simultaneous mounts (layouts, headers, settings pages…)
// dedupe onto a single request/cache instead of each firing its own.
const profileResource = createSharedResource<ProfileData | null>(() =>
  TokenStorage.isLoggedIn() ? apiGetProfile().then(res => res.data) : Promise.resolve(null),
);

export const invalidateProfileCache = profileResource.invalidate;
/** Re-fetch the profile and update every mounted consumer (header, settings, ...). */
export const refreshProfile = profileResource.refresh;

export function useGetProfile() {
  const { data, loading, error, refetch } = profileResource.useSharedResource();
  return {
    profile: data,
    loading: TokenStorage.isLoggedIn() ? loading : false,
    error,
    refetch,
  };
}
