import { Smartphone } from 'lucide-react';
import { useT } from '@/contexts/languageCtx';
import { useAppStoreUrl, useGooglePlayUrl } from '@/components/comman/ui/AppPromoParts';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { EmailCapture } from './EmailCapture';

/**
 * Small app strip (replaces the old fake phone mockup). While no public store link exists it says the app is coming
 * soon and collects an email through the newsletter endpoint (source "app-notify"); once the admin adds a Google Play /
 * App Store link it becomes plain download links. Hidden until the public config is known so it never flips.
 */
export function AppNotifyStrip() {
  const t = useT();
  const { config } = usePublicPlatformConfig();
  const play = useGooglePlayUrl();
  const ios = useAppStoreUrl();
  if (!config) return null;

  return (
    <section className="mb-12 rounded-[14px] border border-bone bg-[#eaf2f8] px-5 py-5 md:px-7 flex flex-col md:flex-row md:items-center gap-4 md:gap-8" aria-label={t('Edudeen app')}>
      <div className="flex items-start gap-3 min-w-0">
        <span className="size-10 rounded-full bg-white flex items-center justify-center shrink-0"><Smartphone size={18} className="text-brand-royal" aria-hidden /></span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold text-carbon m-0">{play || ios ? t('Get the Edudeen app') : t('The Edudeen app is coming soon')}</h2>
          <p className="text-[13.5px] text-graphite mt-1 mb-0">{play || ios ? t('Learn on your phone, wherever you are.') : t('Learn anywhere. Leave your email and we will tell you the day it launches.')}</p>
        </div>
      </div>
      <div className="w-full md:w-auto md:ms-auto md:min-w-[360px]">
        {play || ios ? (
          <div className="flex flex-wrap gap-2.5">
            {play && <a href={play} target="_blank" rel="noreferrer" className="inline-flex items-center h-11 px-4 rounded-[9px] bg-carbon text-white text-[13px] font-bold no-underline hover:bg-black">Google Play</a>}
            {ios && <a href={ios} target="_blank" rel="noreferrer" className="inline-flex items-center h-11 px-4 rounded-[9px] bg-carbon text-white text-[13px] font-bold no-underline hover:bg-black">App Store</a>}
          </div>
        ) : (
          <EmailCapture source="app-notify" submitLabel="Notify me" successText="Thanks! We will email you when the app launches." />
        )}
      </div>
    </section>
  );
}
