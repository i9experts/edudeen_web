import { DEFAULT_CHATBOT, type ChatbotConfig, type ChatQA } from './chatbotDefaults';
import type { PublicPlatformConfig } from '@/api/services/publicPlatformConfig';

// Same rule as isStripeConfigured() (card needs the web publishable key); read directly so the chat does not pull in the Stripe SDK.
const isStripeConfigured = () => !!(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined);

type Commerce = PublicPlatformConfig['commerce'];
const DEFAULT_PAY = DEFAULT_CHATBOT.buyerQuestions.find(q => q.id === 'buyer-pay');

/** "How can I pay?" answer built from the platform's LIVE payment settings (only the methods that are really on).
 *  An answer the admin has edited in Platform Config > Chatbot is left untouched. */
function livePayAnswers(c: NonNullable<Commerce>) {
  const pm = c.paymentMethods ?? {};
  const card = !!pm.card && isStripeConfigured();
  const wallet = !!pm.jazzcash || !!pm.easypaisa;
  const lines = {
    en: [
      'At checkout you will see the methods available for your order:',
      ...(pm.bankTransfer ? ["**Bank transfer / mobile wallet** - send the amount to Edudeen's account shown at checkout, then upload your receipt. Our team approves it and your order is confirmed."] : []),
      ...(wallet ? ['**JazzCash / Easypaisa** - on PKR checkouts, pay online and the order is confirmed right away.'] : []),
      ...(card ? ['**Card** - on USD checkouts.'] : []),
      ...(c.codAvailable ? ['**Cash on delivery** - on physical orders where the seller offers it.'] : []),
      'Start from [your cart](/cart).',
    ],
    ur: [
      'چیک آؤٹ پر آپ کو اپنے آرڈر کے لیے دستیاب طریقے نظر آئیں گے:',
      ...(pm.bankTransfer ? ['**بینک ٹرانسفر / موبائل والیٹ** - چیک آؤٹ پر دکھائے گئے ایڈودین کے اکاؤنٹ میں رقم بھیجیں اور رسید اپ لوڈ کریں۔ ہماری ٹیم منظور کرے تو آرڈر کنفرم ہو جاتا ہے۔'] : []),
      ...(wallet ? ['**جاز کیش / ایزی پیسہ** - PKR چیک آؤٹس پر آن لائن ادائیگی کریں، آرڈر فوراً کنفرم ہو جاتا ہے۔'] : []),
      ...(card ? ['**کارڈ** - USD چیک آؤٹس پر۔'] : []),
      ...(c.codAvailable ? ['**کیش آن ڈیلیوری** - فزیکل آرڈرز پر جہاں سیلر یہ دیتا ہو۔'] : []),
      'شروع کرنے کے لیے [اپنا کارٹ](/cart) کھولیں۔',
    ],
    ru: [
      'Checkout par aapko apne order ke liye mojood tareeqe nazar ayenge:',
      ...(pm.bankTransfer ? ['**Bank transfer / mobile wallet** - checkout par diye gaye Edudeen ke account mein raqam bhejein aur receipt upload karein. Hamari team approve kare to order confirm ho jata hai.'] : []),
      ...(wallet ? ['**JazzCash / Easypaisa** - PKR checkouts par online payment karein, order foran confirm ho jata hai.'] : []),
      ...(card ? ['**Card** - USD checkouts par.'] : []),
      ...(c.codAvailable ? ['**Cash on delivery** - physical orders par jahan seller deta ho.'] : []),
      'Shuru karne ke liye [apna cart](/cart) kholein.',
    ],
  };
  return { a: lines.en.join('\n'), aUr: lines.ur.join('\n'), aRu: lines.ru.join('\n') };
}

/** The chatbot config with the payment answer following the live platform settings. */
export function withLivePayments(cfg: ChatbotConfig, commerce: Commerce): ChatbotConfig {
  if (!commerce || !DEFAULT_PAY) return cfg;
  const live = livePayAnswers(commerce);
  const fix = (q: ChatQA): ChatQA => (q.id === 'buyer-pay' && q.a === DEFAULT_PAY.a ? { ...q, ...live } : q);
  return { ...cfg, buyerQuestions: (cfg.buyerQuestions ?? []).map(fix) };
}
