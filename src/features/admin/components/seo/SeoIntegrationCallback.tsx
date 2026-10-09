import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Plug } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/comman/ui/Button';
import { Input } from '@/components/comman/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { useSeoIntegrationMutations as useAdminSeoIntegrationMutations } from '@/hooks/admin/seo/useSeoIntegrations';
import { useSeoIntegrationMutations as useSellerSeoIntegrationMutations } from '@/hooks/seller/seo/useSeoIntegrations';

// ── OAuth round-trip plumbing ────────────────────────────────────────────────
// Google only returns `code` + `state` to the redirect URI, and the backend
// sets `state` to 'platform' (admin) or the storeId (seller) — the provider
// isn't in it. So the Integrations tab records which provider (and store) it
// started the flow for before opening the consent screen; this page reads that
// record back. localStorage (not sessionStorage) because the consent screen
// opens in a new tab. Bing has no OAuth: its tab sends the admin straight here
// with `?provider=bing` to paste an API key.

export type SeoIntegrationSide = 'admin' | 'seller';
export type SeoCallbackProvider = 'gsc' | 'ga4' | 'merchant_center' | 'bing';

/** Must match the routes registered in router/index.tsx exactly. */
export const SEO_OAUTH_CALLBACK_PATHS: Record<SeoIntegrationSide, string> = {
  admin:  '/admin/seo/integrations/callback',
  seller: '/seo/integrations/callback',
};

export function seoOAuthRedirectUri(side: SeoIntegrationSide) {
  return typeof window !== 'undefined' ? `${window.location.origin}${SEO_OAUTH_CALLBACK_PATHS[side]}` : '';
}

interface PendingSeoOAuth { side: SeoIntegrationSide; provider: SeoCallbackProvider; storeId?: string; startedAt: number }

const PENDING_KEY = 'edudeen.seoOAuthPending';
const PENDING_TTL_MS = 30 * 60 * 1000;
const PROVIDERS: SeoCallbackProvider[] = ['gsc', 'ga4', 'merchant_center', 'bing'];

export function rememberSeoOAuthPending(side: SeoIntegrationSide, provider: SeoCallbackProvider, storeId?: string) {
  try {
    const rec: PendingSeoOAuth = { side, provider, storeId, startedAt: Date.now() };
    localStorage.setItem(PENDING_KEY, JSON.stringify(rec));
  } catch { /* storage blocked — the page falls back to ?provider= */ }
}

function readPending(side: SeoIntegrationSide): PendingSeoOAuth | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw) as PendingSeoOAuth;
    if (rec.side !== side || Date.now() - rec.startedAt > PENDING_TTL_MS) return null;
    return rec;
  } catch { return null; }
}

function clearPending() {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
}

const LABELS: Record<SeoCallbackProvider, string> = {
  gsc: 'Google Search Console',
  ga4: 'Google Analytics 4',
  merchant_center: 'Google Merchant Center',
  bing: 'Bing Webmaster Tools',
};

const SITE_FIELD: Record<SeoCallbackProvider, { label: string; placeholder: string; hint: string }> = {
  gsc:             { label: 'Site URL',              placeholder: 'https://edudeen.com/',  hint: 'The property exactly as it appears in Search Console (URL-prefix or sc-domain:example.com).' },
  ga4:             { label: 'GA4 property',          placeholder: 'properties/123456789',  hint: 'Admin → Property settings → Property ID, written as properties/<id>.' },
  merchant_center: { label: 'Merchant Center account ID', placeholder: '123456789',       hint: 'The numeric account ID shown at the top of Merchant Center.' },
  bing:            { label: 'Site URL',              placeholder: 'https://edudeen.com/',  hint: 'The site as it is verified in Bing Webmaster Tools.' },
};

// ── Page ─────────────────────────────────────────────────────────────────────
export function SeoIntegrationCallback({ side }: { side: SeoIntegrationSide }) {
  usePageTitle('Connect integration');
  const [params] = useSearchParams();
  const toast = useToast();
  const adminMut = useAdminSeoIntegrationMutations();
  const sellerMut = useSellerSeoIntegrationMutations();

  const pending = useMemo(() => readPending(side), [side]);
  const code = params.get('code') ?? '';
  const state = params.get('state') ?? '';
  const oauthError = params.get('error');
  const providerParam = params.get('provider');
  const provider: SeoCallbackProvider | null =
    providerParam && (PROVIDERS as string[]).includes(providerParam) ? providerParam as SeoCallbackProvider
      : pending?.provider ?? null;
  const storeId = side === 'seller' ? (pending?.storeId ?? (state && state !== 'platform' ? state : '')) : undefined;
  const isBing = provider === 'bing';

  // `state` is what the backend put in the consent URL; a mismatch means this
  // code wasn't issued for the flow this browser started.
  const expectedState = side === 'admin' ? 'platform' : storeId;
  const stateMismatch = !isBing && !!code && !!state && !!expectedState && state !== expectedState;

  const [siteIdentifier, setSiteIdentifier] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [done, setDone] = useState(false);

  const submitting = side === 'admin' ? adminMut.submitting : sellerMut.submitting;
  const error = side === 'admin' ? adminMut.error : sellerMut.error;
  const backTo = side === 'admin' ? '/admin/seo?tab=integrations' : storeId ? `/store/${storeId}/seo` : '/seller';

  const problem =
    oauthError ? `The provider returned "${oauthError}" — the connection was not authorised.`
      : !provider ? 'We could not tell which integration this is for. Start again from the Integrations tab.'
        : side === 'seller' && !storeId ? 'We could not tell which store this is for. Start again from your store\'s SEO page.'
          : !isBing && !code ? 'No authorisation code was returned. Start again from the Integrations tab.'
            : stateMismatch ? 'This authorisation does not match the connection you started. Start again from the Integrations tab.'
              : '';

  async function submit() {
    if (!provider) return;
    const authCode = isBing ? apiKey.trim() : code;
    if (!authCode || !siteIdentifier.trim()) return;
    const payload = { code: authCode, redirectUri: seoOAuthRedirectUri(side), siteIdentifier: siteIdentifier.trim() };
    const ok = side === 'admin'
      ? await adminMut.connect(provider, payload)
      : await sellerMut.connect(storeId as string, provider, payload);
    if (ok) {
      clearPending();
      setDone(true);
      toast.success(`${LABELS[provider]} connected`);
    }
  }

  return (
    <div className="px-4 sm:px-7 pt-10 pb-12 flex justify-center">
      <div className="w-full max-w-[520px] bg-white border border-bone rounded-xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Plug size={18} className="text-brand-orange" />
          <h1 className="text-[16px] font-semibold text-charcoal">
            {provider ? `Connect ${LABELS[provider]}` : 'Connect integration'}
          </h1>
        </div>

        {done ? (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-[13px] text-success">
              <CheckCircle2 size={16} /> Connected. Data will appear after the next sync.
            </p>
            <Link to={backTo} className="text-[13px] font-semibold text-brand-orange">Back to integrations</Link>
          </div>
        ) : problem ? (
          <div className="flex flex-col gap-3">
            <p className="flex items-start gap-2 text-[13px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">
              <AlertTriangle size={15} className="shrink-0 mt-[2px]" /> {problem}
            </p>
            <Link to={backTo} className="text-[13px] font-semibold text-brand-orange">Back to integrations</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-[12.5px] text-slate leading-[1.6]">
              {isBing
                ? 'Paste the API key from Bing Webmaster Tools (Settings → API access) and the site it belongs to.'
                : 'Authorisation received. Tell us which property to read data from — we check that the account you signed in with has access to it.'}
            </p>
            {isBing && (
              <Input label="Bing API key" type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)} />
            )}
            {provider && (
              <div>
                <Input
                  label={SITE_FIELD[provider].label}
                  placeholder={SITE_FIELD[provider].placeholder}
                  value={siteIdentifier}
                  onChange={e => setSiteIdentifier(e.target.value)}
                />
                <p className="text-[12px] text-slate mt-1">{SITE_FIELD[provider].hint}</p>
              </div>
            )}
            {error && (
              <p className="text-[12px] text-error">
                {error}{!isBing && ' If the property was right, the sign-in code may have been used up — start again from the Integrations tab.'}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <Link to={backTo} className="text-[12.5px] text-slate hover:text-charcoal">Cancel</Link>
              <Button onClick={submit} loading={submitting} disabled={!siteIdentifier.trim() || (isBing && !apiKey.trim())}>
                Connect
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
