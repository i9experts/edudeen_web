import { useState } from 'react';
import { X, Zap, PackageCheck, Tag } from 'lucide-react';
import { clsx } from 'clsx';
import { DialogShell } from './DialogShell';
import { Button } from './Button';
import { EdudeenIcon } from './EdudeenLogo';

// Internal test track — swap for the public Play Store listing once Edudeen
// graduates out of internal testing.
const PLAY_STORE_URL = 'https://play.google.com/apps/internaltest/4699462862361720775';

const PERKS = [
  { Icon: Zap,          label: 'One-tap checkout' },
  { Icon: PackageCheck, label: 'Live order tracking' },
  { Icon: Tag,          label: 'App-only deals' },
];

const DISMISS_KEY = 'edudeen_app_open_prompt_dismissed';

/**
 * Mobile-only "continue in app" interstitial — mounted from BuyerLayout,
 * which sits under RootLayout's `<ErrorBoundary key={pathname}>` and so
 * remounts on every navigation. Once dismissed (X or "Continue in Browser")
 * it stays hidden for the rest of the browser tab's session via
 * `sessionStorage` — opening the app instead doesn't set the flag, since
 * the tab is about to leave the site anyway.
 */
export function AppOpenPrompt() {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1');

  if (dismissed) return null;

  const close = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const openApp = () => {
    window.location.href = PLAY_STORE_URL;
  };

  return (
    <div className="md:hidden">
      <DialogShell onClose={close} ariaLabel="Continue in the Edudeen app" className="max-w-[360px] p-4">
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 end-3 w-7 h-7 flex items-center justify-center rounded-full bg-cream text-slate border-0 cursor-pointer hover:bg-bone"
        >
          <X size={14} />
        </button>

        <div className="flex items-center gap-3 pe-8">
          <EdudeenIcon size={40} />
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-carbon leading-tight">Continue in the Edudeen App</p>
            <p className="text-[11.5px] text-slate mt-[2px] leading-snug">A faster, smoother way to shop</p>
          </div>
        </div>

        <ul className="flex items-center gap-3 mt-3 mb-4">
          {PERKS.map(({ Icon, label }) => (
            <li key={label} className="flex-1 flex flex-col items-center gap-1 text-center">
              <span className="w-7 h-7 rounded-full bg-brand-pale-orange flex items-center justify-center">
                <Icon size={13} className="text-brand-orange" />
              </span>
              <span className="text-[9.5px] font-medium text-charcoal leading-tight">{label}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="md" onClick={close} className="flex-1">
            Continue in Browser
          </Button>
          <Button variant="primary" size="md" onClick={openApp} className="flex-1">
            Open
          </Button>
        </div>
      </DialogShell>
    </div>
  );
}

/**
 * Persistent floating "Open" edge-tab — right-edge counterpart of
 * Marketplace's "Filter Products" tab (same attached-tab shape: flush to
 * the edge, rounded only on the inward side), sitting on every buyer page
 * independent of whether the AppOpenPrompt interstitial above has been
 * dismissed. Always does the same single action: jump straight to the app.
 */
export function AppOpenFab() {
  return (
    <button
      onClick={() => { window.location.href = PLAY_STORE_URL; }}
      aria-label="Open the Edudeen app"
      className={clsx(
        'drawer-enter-right md:hidden fixed end-0 top-[34%] -translate-y-1/2 z-40',
        'flex items-center gap-[4px] rounded-s-xl border border-e-0 border-bone py-[7px] px-[8px]',
        'bg-white text-brand-orange cursor-pointer',
        'transition-all duration-500 ease-out hover:px-[10px]',
      )}
    >
      <EdudeenIcon size={15} />
      <span className="text-[10px] font-bold uppercase tracking-[0.04em]">
        Open
      </span>
    </button>
  );
}
