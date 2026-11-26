import { usePageTitle } from '@/hooks/usePageTitle';
import { LegalPageLayout, type LegalSection } from '@/components/comman/ui';

// Placeholder content — not reviewed legal copy. Replace with the real
// seller agreement (and keep "Last updated" accurate) before this page is
// treated as binding.
const SECTIONS: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Seller Agreement',
    body: [
      'These Seller Terms apply in addition to the general Terms of Service when you open a store, list products or sell on Edudeen. By creating a store or publishing a listing, you agree to them.',
      'If you do not agree, please do not open a store or list products.',
    ],
  },
  {
    id: 'eligibility',
    title: 'Who Can Sell',
    body: [
      'Edudeen is for educational products and services: books, worksheets, courses, Islamic and Quran-study resources, digital downloads and related tools. Listings outside this scope may be removed.',
      'You must provide accurate store, contact and payout details and keep them up to date. One seller account may operate up to 5 stores.',
    ],
  },
  {
    id: 'listings',
    title: 'Your Listings',
    body: [
      'You are responsible for the accuracy of your titles, descriptions, images, prices and delivery details. Products must match what you describe.',
      'You must own, or have the right to sell, everything you list. Do not upload content that copies or resells someone else\'s work without permission.',
    ],
  },
  {
    id: 'orders',
    title: 'Orders & Delivery',
    body: [
      'Fulfil physical orders promptly and update the order status in your seller dashboard. Digital products must be delivered through Edudeen\'s digital delivery so buyers can access their files.',
      'Respond to buyer messages and questions in a reasonable time.',
    ],
  },
  {
    id: 'fees',
    title: 'Plans, Fees & Payouts',
    body: [
      'Selling plans, platform fees and payout schedules are shown on the Pricing page and in your seller dashboard. Fees may change with notice; the fees shown when a sale is made apply to that sale.',
      'Earnings are credited to your seller wallet after the order conditions are met, and can be withdrawn to your payout method. Refunds, chargebacks and policy violations may be deducted from your balance.',
    ],
    callout: { type: 'info', text: 'Plan names, fees and payout timing are shown on the Pricing page and in your dashboard, which always reflect the current rates.' },
  },
  {
    id: 'returns',
    title: 'Returns & Refunds',
    body: [
      'Honour Edudeen\'s returns and refunds policy and any stricter store policy you publish. Where a buyer is entitled to a refund, it may be issued from your earnings.',
    ],
  },
  {
    id: 'prohibited',
    title: 'Prohibited Content & Conduct',
    body: [
      'You may not list counterfeit, illegal, harmful or infringing items, mislead buyers, manipulate reviews, or take buyers off Edudeen to avoid fees.',
      'Content that is disrespectful to Islam or to other faiths, or unsuitable for learners, is not allowed.',
    ],
    callout: { type: 'warning', text: 'Repeated or serious violations can lead to listings being removed, payouts being held, or the store being suspended.' },
  },
  {
    id: 'ip',
    title: 'Your Content & Licence',
    body: [
      'You keep ownership of your content. You give Edudeen a licence to display, promote and deliver it, including in search, previews and marketing, so that your products can be sold.',
    ],
  },
  {
    id: 'suspension',
    title: 'Suspension & Closing Your Store',
    body: [
      'You can close your store at any time, after fulfilling open orders. Edudeen may suspend or close a store that breaks these terms or the law.',
    ],
  },
  {
    id: 'contact',
    title: 'Questions',
    body: [
      'For help with these terms, reach our team through the Contact Us page, or see the Seller Guide.',
    ],
  },
];

export function SellerTermsPage() {
  usePageTitle('Seller Terms');
  return (
    <LegalPageLayout
      title="Seller Terms"
      subtitle="The rules for selling on Edudeen as a teacher, scholar, publisher or creator."
      lastUpdated="November 19, 2026"
      sections={SECTIONS}
      relatedPages={[
        { title: 'Terms of Service', description: 'The rules and guidelines for using Edudeen as a buyer or seller.', path: '/terms-of-service' },
        { title: 'Seller Guide', description: 'Step-by-step help for opening and running your store.', path: '/sitemap?tab=seller' },
      ]}
    />
  );
}
