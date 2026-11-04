import { usePageTitle } from '@/hooks/usePageTitle';
import { LegalPageLayout, type LegalSection } from '@/components/comman/ui';
import { REASONS } from '@/features/buyer/components/RefundRequestPanel';

// Built-in default. It states what the platform really enforces (refund requests
// in RefundRequestService); the admin can replace it in Platform Config / Edit mode.
const SECTIONS: LegalSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    body: [
      'Edudeen handles returns and refunds through a refund request on your order. Whether you can ask for one depends on what you bought.',
      'Each seller may also state their own return policy on their store and product page. It is shown there for your information.',
    ],
  },
  {
    id: 'digital',
    title: 'Digital downloads and courses',
    body: [
      'You can request a refund for a digital item only if you have not downloaded the file yet. Once a file has been downloaded, it can no longer be refunded.',
    ],
    callout: { type: 'info', text: 'You can request a refund for a digital item only if you have not downloaded the file yet.' },
  },
  {
    id: 'physical',
    title: 'Physical products',
    body: [
      'You can request a refund for a physical item after it has been delivered. Open the order in your account and choose the item you want a refund for.',
    ],
  },
  {
    id: 'reasons',
    title: 'Reasons you can choose',
    body: [
      'When you request a refund, you pick one of these reasons and can add a short note:',
      ...REASONS,
    ],
  },
  {
    id: 'how',
    title: 'How to request a refund',
    body: [
      'Go to Account > Orders, open the order, and choose "Request a refund" on the item. We will review it and update you in your notifications.',
    ],
  },
];

export function ReturnsPolicyPage() {
  usePageTitle('Returns policy');
  return (
    <LegalPageLayout
      pageKey="returns"
      title="Returns policy"
      subtitle="When you can ask for a refund on Edudeen."
      lastUpdated="November 4, 2026"
      sections={SECTIONS}
      relatedPages={[
        { title: 'Terms of Service', description: 'The rules and guidelines for using Edudeen as a buyer or seller.', path: '/terms-of-service' },
        { title: 'Privacy Policy', description: 'How Edudeen collects, uses, and protects your information.', path: '/privacy-policy' },
      ]}
    />
  );
}
