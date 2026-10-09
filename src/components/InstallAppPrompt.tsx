import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'edudeen_install_dismissed';
const readDismissed = () => { try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } };

/** Small "Install the app" bar, shown only when the browser says the site is installable and the user has not dismissed it. */
export function InstallAppPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (readDismissed()) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BeforeInstallPromptEvent); };
    const onInstalled = () => setEvt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!evt) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* storage unavailable */ }
    setEvt(null);
  };
  const install = async () => {
    try { await evt.prompt(); await evt.userChoice; } catch { /* ignored */ }
    setEvt(null);
  };

  return (
    <div role="region" aria-label="Install Edudeen" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[420px] flex items-center gap-3 rounded-xl border border-bone bg-white px-4 py-3 shadow-lg" translate="no">
      <p className="flex-1 text-[13px] text-carbon leading-snug">Install Edudeen on your device for quicker access.</p>
      <button type="button" onClick={dismiss} className="text-[12.5px] text-slate bg-transparent border-0 cursor-pointer px-2 py-1">Not now</button>
      <button type="button" onClick={install} className="text-[12.5px] font-semibold text-white bg-brand-royal border-0 rounded-lg cursor-pointer px-3 py-1.5">Install</button>
    </div>
  );
}
