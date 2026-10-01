import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { isSocialProviderConfigured, preloadSocialSdks, visibleSocialProviders } from '@/hooks/auth/useSocialLogin';

export function GoogleIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }} aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

export function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }} aria-hidden>
      <path fill="#1877F2" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07"/>
    </svg>
  );
}

export function AppleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }} aria-hidden>
      <path fill="currentColor" d="M16.37 12.73c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.38.81 1.4-.02 2.29-1.27 3.14-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.12ZM13.79 5.1c.72-.87 1.2-2.07 1.07-3.27-1.03.04-2.28.69-3.02 1.55-.66.76-1.24 1.99-1.09 3.16 1.15.09 2.32-.58 3.04-1.44Z"/>
    </svg>
  );
}

export type SocialProvider = 'google' | 'facebook' | 'apple';

export const SOCIAL_PROVIDERS: { provider: SocialProvider }[] = [
  { provider: 'google' },
  { provider: 'facebook' },
  { provider: 'apple' },
];

// Google's own rendered button (Identity Services `renderButton`) is a pill of
// a fixed pixel width clamped to [200,400]px — its colors/fonts/avatar chip
// aren't ours to restyle (Google's brand rules). Facebook and Apple use our
// own button, sized and shaped to sit evenly under it.
const PILL = 'w-full max-w-[400px] h-10 mx-auto flex items-center justify-center gap-2.5 rounded-full border text-[14px] font-medium transition-colors cursor-pointer';
const CONTINUE_LABEL: Record<SocialProvider, string> = {
  google: 'Continue with Google',
  facebook: 'Continue with Facebook',
  apple: 'Continue with Apple',
};

function GoogleSlot({ mount, disabled }: {
  mount: (provider: SocialProvider, container: HTMLElement, availableWidth: number) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // The ref div itself is unsized (Google fills it to whatever fixed pixel
    // width it's told to render at) — measure the real, already-laid-out
    // parent instead so the button fills as much of the form as it can.
    const availableWidth = ref.current.parentElement?.clientWidth || 300;
    mount('google', ref.current, availableWidth);
  }, [mount]);

  return (
    <div className={clsx('w-full min-h-10 flex justify-center items-center', disabled && 'opacity-50 pointer-events-none')}>
      <div ref={ref} />
    </div>
  );
}

function ProviderButton({ provider, onClick, disabled }: { provider: SocialProvider; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        PILL,
        provider === 'apple'
          ? 'bg-black border-black text-white hover:bg-[#222]'
          : 'bg-white border-[#dadce0] text-[#3c4043] hover:bg-[#f8f9fa]',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {provider === 'google' ? <GoogleIcon /> : provider === 'facebook' ? <FacebookIcon /> : <AppleIcon />}
      {CONTINUE_LABEL[provider]}
    </button>
  );
}

/**
 * Etsy-style "Continue with Google / Facebook / Apple" stack. Google renders
 * its own real widget (via `mount`); Facebook and Apple call `onProvider`.
 * Only providers with keys configured are shown in production builds.
 */
export function SocialLoginRow({
  mount,
  onProvider,
  disabled = false,
  className,
}: {
  mount: (provider: SocialProvider, container: HTMLElement, availableWidth: number) => void;
  onProvider?: (provider: SocialProvider) => void;
  disabled?: boolean;
  className?: string;
  /** Kept for existing call sites — the buttons always stack now. */
  layout?: 'row' | 'stacked';
}) {
  const providers = visibleSocialProviders().filter(p => p === 'google' || onProvider);
  const key = providers.join(',');
  useEffect(() => { preloadSocialSdks(providers); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);

  if (providers.length === 0) return null;
  return (
    <div className={clsx('flex flex-col gap-2.5', className)}>
      {providers.map(provider =>
        provider === 'google' && isSocialProviderConfigured('google')
          ? <GoogleSlot key={provider} mount={mount} disabled={disabled} />
          : <ProviderButton key={provider} provider={provider} disabled={disabled} onClick={() => onProvider?.(provider)} />,
      )}
    </div>
  );
}
