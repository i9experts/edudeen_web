import { useT } from '@/contexts/languageCtx';
import { EmailCapture } from './EmailCapture';

/** Full-width newsletter band at the end of the home page (the footer's own newsletter block is switched off here so there is only one). */
export function HomeNewsletter() {
  const t = useT();
  return (
    <section className="bg-[#f5f8fa] border-t border-b border-bone" aria-label={t('Newsletter')}>
      <div className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] py-9 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-[560px]">
          <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-2">{t('Stay in the loop')}</p>
          <h2 className="font-serif font-normal text-[24px] md:text-[28px] text-carbon leading-tight m-0">{t('Get new resources & deals before anyone else')}</h2>
          <p className="text-[14px] text-slate mt-2 mb-0">{t('New arrivals, sale alerts and price-drop updates in your inbox. Unsubscribe any time.')}</p>
        </div>
        <div className="w-full lg:max-w-[440px]">
          <EmailCapture source="home" submitLabel="Subscribe" successText="You're subscribed — welcome aboard!" />
        </div>
      </div>
    </section>
  );
}
