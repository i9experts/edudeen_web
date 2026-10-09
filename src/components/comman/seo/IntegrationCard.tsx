import { clsx } from 'clsx';
import { Search, BarChart3, ShoppingBag, Globe2 } from 'lucide-react';
import { Card } from '@/components/comman/ui/Card';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';

export type IntegrationProvider = 'gsc' | 'ga4' | 'merchant_center' | 'bing';
export type IntegrationStatus = 'connected' | 'syncing' | 'error' | 'needs_reauth' | 'disconnected';

const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  gsc: 'Google Search Console',
  ga4: 'Google Analytics 4',
  merchant_center: 'Google Merchant Center',
  bing: 'Bing Webmaster Tools',
};

const PROVIDER_ICONS: Record<IntegrationProvider, typeof Search> = {
  gsc: Search,
  ga4: BarChart3,
  merchant_center: ShoppingBag,
  bing: Globe2,
};

const STATUS_STYLE: Record<IntegrationStatus, { dot: string; text: string; label: string }> = {
  connected:    { dot: 'bg-success', text: 'text-success', label: 'Connected' },
  syncing:      { dot: 'bg-info',    text: 'text-info',    label: 'Syncing' },
  error:        { dot: 'bg-error',   text: 'text-error',   label: 'Error' },
  needs_reauth: { dot: 'bg-warning', text: 'text-warning', label: 'Needs reauthorization' },
  disconnected: { dot: 'bg-slate',   text: 'text-slate',   label: 'Not connected' },
};

interface IntegrationCardProps {
  provider:      IntegrationProvider | string;
  status:        IntegrationStatus | string;
  lastSyncedAt?: string | null;
  lastError?:    string | null;
  onConnect:     () => void;
  onDisconnect:  () => void;
  onSync?:       () => void;
  busy?:         boolean;
  loading?:      boolean;
  className?:    string;
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function IntegrationCard({
  provider, status, lastSyncedAt, lastError, onConnect, onDisconnect, onSync, busy, loading, className,
}: IntegrationCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <div className="flex items-center gap-3 mb-3">
          <SkeletonBox width={36} height={36} rounded="10px" />
          <SkeletonBox height={13} width="60%" rounded="4px" />
        </div>
        <SkeletonBox height={11} width="40%" rounded="4px" className="mb-3" />
        <SkeletonBox height={32} width="100%" rounded="8px" />
      </Card>
    );
  }

  const Icon = PROVIDER_ICONS[provider as IntegrationProvider] ?? Globe2;
  const label = PROVIDER_LABELS[provider as IntegrationProvider] ?? provider;
  const st = STATUS_STYLE[status as IntegrationStatus] ?? STATUS_STYLE.disconnected;
  const isConnected = status === 'connected' || status === 'syncing';

  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[10px] bg-brand-pale-orange flex items-center justify-center text-brand-orange shrink-0">
            <Icon size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-carbon truncate">{label}</p>
            <div className="flex items-center gap-[5px] mt-[2px]">
              <span className={clsx('w-[6px] h-[6px] rounded-full shrink-0', st.dot)} />
              <span className={clsx('text-[12px] font-medium', st.text)}>{st.label}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[12px] text-slate mb-3">
        Last synced: {relativeTime(lastSyncedAt)}
      </p>

      {status === 'error' && lastError && (
        <p className="text-[12px] text-error bg-error-bg rounded-md px-2 py-1.5 mb-3 leading-[1.5]">{lastError}</p>
      )}

      <div className="flex items-center gap-2">
        {!isConnected && status !== 'needs_reauth' && (
          <Button variant="primary" size="sm" fullWidth loading={busy} onClick={onConnect}>Connect</Button>
        )}
        {status === 'needs_reauth' && (
          <Button variant="primary" size="sm" fullWidth loading={busy} onClick={onConnect}>Reconnect</Button>
        )}
        {isConnected && (
          <>
            {onSync && <Button variant="outline" size="sm" loading={busy} onClick={onSync}>Sync now</Button>}
            <Button variant="ghost" size="sm" loading={busy} onClick={onDisconnect}>Disconnect</Button>
          </>
        )}
      </div>
    </Card>
  );
}
