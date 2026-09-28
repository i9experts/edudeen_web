import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, Monitor, Smartphone } from 'lucide-react';
import { clsx } from 'clsx';
import { apiGetStoreTheme, apiUpdateStoreThemeColors, apiUpdateStoreHeader, apiUpdateStoreFooter, type StoreThemeData } from '@/api/services/storeTheme';
import { DeviceFrame } from './builder/DeviceFrame';
import { ThemeDemoStorefront } from './builder/ThemeDemoStorefront';
import { ConfirmDialog } from './builder/ConfirmDialog';
import { THEMES } from './builder/themes';

type Device = 'desktop' | 'mobile';
const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, mobile: 390 };

/**
 * A standalone page (opened in its own browser tab, no seller-dashboard
 * sidebar/chrome) that renders exactly ONE theme, resolved purely from the
 * `:themeId` route param against the static `THEMES` list — never from any
 * in-memory "currently active"/"currently being edited" state. This is the
 * deliberate fix for Preview showing the wrong theme: a brand-new page load
 * has no shared state with the Theme Library tab to possibly leak from, so
 * the previewed theme can never silently become the active/customized one.
 *
 * Renders a complete, rich DEMO storefront (`ThemeDemoStorefront`, full
 * size, every section down to testimonials/footer) — like a real
 * WordPress/Shopify theme preview — rather than the seller's own real
 * (possibly sparse/unfinished) page content, so every one of the 10 themes
 * always looks like a fully realized, distinct site regardless of how much
 * the seller has actually built out yet. "Use This Theme" still applies to
 * the seller's REAL store (colors/header-style/footer-style only — their
 * real nav links/footer columns/products are never touched or replaced by
 * the demo content shown here).
 */
export function ThemePreviewPage() {
  const { storeId = '', themeId = '' } = useParams<{ storeId: string; themeId: string }>();
  const theme = THEMES.find(t => t.id === themeId) ?? null;
  const [device, setDevice] = useState<Device>('desktop');

  // Only needed at Apply time, to preserve the seller's REAL footer content
  // (`apiUpdateStoreFooter` requires the full blocks array) — the preview
  // itself never waits on or depends on this.
  const [realTheme, setRealTheme] = useState<StoreThemeData | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiGetStoreTheme(storeId).then(res => { if (!cancelled) setRealTheme(res.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [storeId]);

  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const confirmApply = useCallback(async () => {
    if (!theme) return;
    setApplying(true);
    try {
      await Promise.all([
        apiUpdateStoreThemeColors(storeId, { ...theme.colors, baseThemeId: theme.id }),
        apiUpdateStoreHeader(storeId, { headerStyle: theme.headerStyle }),
        apiUpdateStoreFooter(storeId, realTheme?.footer.blocks ?? [], theme.footerStyle),
      ]);
      setConfirming(false);
      setApplied(true);
    } finally {
      setApplying(false);
    }
  }, [storeId, theme, realTheme]);

  if (!theme) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5] p-6">
        <p className="text-[14px] text-slate">Unknown theme "{themeId}". Close this tab and reopen Preview from the Theme Library.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EDEBE3] flex flex-col">
      {/* Deliberately lightweight — the storefront itself is the focus here,
          not a recreation of the seller dashboard's heavy chrome. */}
      <div className="sticky top-0 z-10 bg-white border-b border-bone px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/store/${storeId}/storebuilder`}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate hover:text-charcoal no-underline shrink-0"
          >
            <ArrowLeft size={14} /> Back to Theme Library
          </Link>
          <span className="w-px h-4 bg-bone shrink-0" />
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-charcoal truncate">{theme.name}</p>
            <p className="text-[10.5px] text-slate">{theme.characteristics.join(' · ')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-cream border border-bone rounded-lg p-[3px]">
            {(['desktop', 'mobile'] as Device[]).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                aria-label={d}
                title={d.charAt(0).toUpperCase() + d.slice(1)}
                className={clsx(
                  'w-8 h-7 rounded-md flex items-center justify-center border-none cursor-pointer transition-colors',
                  device === d ? 'bg-white text-brand-deep-orange shadow-sm' : 'bg-transparent text-slate hover:text-charcoal',
                )}
              >
                {d === 'desktop' ? <Monitor size={14} /> : <Smartphone size={14} />}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={applied}
            className="flex items-center gap-1.5 px-4 py-[9px] rounded-[10px] text-[13px] font-bold text-white border-none cursor-pointer disabled:opacity-60"
            style={{ background: applied ? '#2E9E5B' : '#174771' }}
          >
            {applied ? <><Check size={14} /> Applied</> : 'Use This Theme'}
          </button>
        </div>
      </div>

      {applied && (
        <p className="bg-success-bg text-success text-[12.5px] font-semibold text-center py-2 px-4">
          {theme.name} applied to your store. Switch back to (or refresh) your Theme Library tab to see it there.
        </p>
      )}

      <div className="flex-1 flex justify-center py-6 px-4 overflow-x-auto">
        <div
          className={clsx('bg-white shrink-0', device === 'mobile' && 'rounded-2xl overflow-hidden border border-bone shadow-lg')}
          style={{ width: DEVICE_WIDTH[device], height: 'calc(100vh - 130px)' }}
        >
          <DeviceFrame width={DEVICE_WIDTH[device]}>
            <ThemeDemoStorefront theme={theme} />
          </DeviceFrame>
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title={`Apply ${theme.name}?`}
          message="Your current theme customization will be replaced by this theme. You can customize it again afterward."
          confirmLabel="Apply Theme"
          loading={applying}
          onCancel={() => setConfirming(false)}
          onConfirm={confirmApply}
        />
      )}
    </div>
  );
}
