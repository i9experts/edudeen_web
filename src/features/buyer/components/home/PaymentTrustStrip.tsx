import { Link } from 'react-router-dom';
import { Banknote, CreditCard, Landmark, LifeBuoy, MessageCircle, RotateCcw, Smartphone } from 'lucide-react';
import { useT } from '@/contexts/languageCtx';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { effectiveContact } from '@/components/admin-edit/homeDefaults';
import { paymentTrust, whatsappLink, type PaymentTrustId } from './homeRules';

// Read the build-time key directly: importing StripeCardPayment would pull the whole Stripe SDK into the home page.
const STRIPE_KEY_PRESENT = !!(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.trim();

const METHOD: Record<PaymentTrustId, { label: string; Icon: typeof Banknote }> = {
  cod: { label: 'Cash on Delivery', Icon: Banknote },
  jazzcash: { label: 'JazzCash', Icon: Smartphone },
  easypaisa: { label: 'Easypaisa', Icon: Smartphone },
  card: { label: 'Debit / credit card', Icon: CreditCard },
  bank: { label: 'Bank transfer', Icon: Landmark },
};

/**
 * "How you can pay" + help links. Payment methods come from the public platform config (what the platform can
 * really take right now), never a fixed list; with none enabled that row is hidden. Refund and support links are
 * always real pages; WhatsApp appears only once the admin has entered a number.
 */
export function PaymentTrustStrip() {
  const t = useT();
  const { config } = usePublicPlatformConfig();
  const methods = paymentTrust(config?.commerce?.paymentMethods, config?.commerce?.codAvailable, STRIPE_KEY_PRESENT);
  const wa = whatsappLink(effectiveContact(config?.homeContent?.contact).whatsapp);

  const linkCls = 'inline-flex items-center gap-1.5 min-h-11 md:min-h-0 text-[13px] font-semibold text-carbon no-underline hover:text-brand-orange';
  return (
    <div className="mt-4 rounded-[14px] border border-bone bg-white px-4 py-4 md:px-6 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
      {methods.length > 0 && (
        <div className="min-w-0">
          <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-slate mb-2">{t('Ways to pay')}</p>
          <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
            {methods.map(id => {
              const { label, Icon } = METHOD[id];
              return (
                <li key={id} className="inline-flex items-center gap-1.5 rounded-full border border-bone bg-[#f5f8fa] px-3 py-[6px] text-[13px] font-semibold text-carbon">
                  <Icon size={14} className="text-brand-royal" aria-hidden />{id === 'jazzcash' || id === 'easypaisa' ? label : t(label)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 lg:ms-auto">
        <Link to="/faq" className={linkCls}><RotateCcw size={14} className="text-brand-royal" aria-hidden />{t('Refunds & returns')}</Link>
        {wa && <a href={wa} target="_blank" rel="noreferrer" className={linkCls}><MessageCircle size={14} className="text-brand-royal" aria-hidden />{t('Chat on WhatsApp')}</a>}
        <Link to="/contact-us" className={linkCls}><LifeBuoy size={14} className="text-brand-royal" aria-hidden />{t('Contact support')}</Link>
      </div>
    </div>
  );
}
