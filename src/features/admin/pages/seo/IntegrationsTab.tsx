import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { IntegrationCard, type IntegrationProvider } from '@/components/comman/seo';
import { useSeoIntegrations, useSeoIntegrationMutations } from '@/hooks/admin/seo/useSeoIntegrations';
import {
  SEO_OAUTH_CALLBACK_PATHS, rememberSeoOAuthPending, seoOAuthRedirectUri,
} from '@/features/admin/components/seo/SeoIntegrationCallback';

const PROVIDERS: IntegrationProvider[] = ['gsc', 'ga4', 'merchant_center', 'bing'];
// Lands on the admin callback route (router/index.tsx), which finishes the
// connection via `connect` from useSeoIntegrationMutations.
const REDIRECT_URI = seoOAuthRedirectUri('admin');

export function IntegrationsTab() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useSeoIntegrations();
  const { getAuthUrl, disconnect, sync, submitting, error: actionError } = useSeoIntegrationMutations();
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  if (error) return <AnalyticsErrorState message={error} onRetry={refetch} />;

  const rowFor = (provider: IntegrationProvider) => data?.find(r => r.provider === provider);

  const handleConnect = async (provider: IntegrationProvider) => {
    setBusyProvider(provider);
    const url = await getAuthUrl(provider, REDIRECT_URI);
    setBusyProvider(null);
    if (!url) return;
    rememberSeoOAuthPending('admin', provider);
    window.open(url, '_blank', 'noopener,noreferrer');
    // Bing has no OAuth redirect — its link opens the API-key page, and the
    // key is pasted on the callback page instead.
    if (provider === 'bing') navigate(`${SEO_OAUTH_CALLBACK_PATHS.admin}?provider=bing`);
  };

  const handleDisconnect = async (provider: IntegrationProvider) => {
    setBusyProvider(provider);
    if (await disconnect(provider)) refetch();
    setBusyProvider(null);
  };

  const handleSync = async (provider: IntegrationProvider) => {
    setBusyProvider(provider);
    if (await sync(provider, 28)) refetch();
    setBusyProvider(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {actionError && (
        <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{actionError}</div>
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {PROVIDERS.map(provider => {
          const row = rowFor(provider);
          return (
            <IntegrationCard
              key={provider}
              provider={provider}
              status={row?.status ?? 'disconnected'}
              lastSyncedAt={row?.lastSyncedAt}
              lastError={row?.lastError}
              loading={loading}
              busy={submitting && busyProvider === provider}
              onConnect={() => handleConnect(provider)}
              onDisconnect={() => handleDisconnect(provider)}
              onSync={() => handleSync(provider)}
            />
          );
        })}
      </div>
    </div>
  );
}
