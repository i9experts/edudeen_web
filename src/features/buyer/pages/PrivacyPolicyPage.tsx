import { usePageTitle } from '@/hooks/usePageTitle';
import { LegalPageLayout, type LegalSection } from '@/components/comman/ui';

// Placeholder content — not reviewed legal copy. Replace with the real
// policy (and keep "Last updated" accurate) before this page is treated as
// binding.
const SECTIONS: LegalSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    body: [
      'Edudeen ("we", "us", or "our") operates a marketplace connecting buyers with independent sellers, creators, and educators. This Privacy Policy explains what information we collect, how we use it, and the choices you have.',
      'By using Edudeen, you agree to the collection and use of information in accordance with this policy.',
    ],
  },
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    body: [
      'Account information: your name, email address, phone number, and shipping/billing address when you register or place an order.',
      'Transaction information: order history, payment method (processed by our payment providers — we never store full card numbers), and communications with sellers.',
      'Usage information: pages you visit, products you view or wishlist, device and browser type, and approximate location, collected automatically as you use the platform.',
    ],
  },
  {
    id: 'how-we-use',
    title: 'How We Use Your Information',
    body: [
      'To process orders, payments, refunds, and deliveries, and to communicate with you about them.',
      'To personalize your experience — recommended products, saved preferences, and marketplace search results.',
      'To detect fraud, enforce our Terms of Service, and keep the marketplace safe for buyers and sellers.',
      'To send you updates, offers, or newsletters you\'ve opted into — you can unsubscribe at any time.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies & Tracking Technologies',
    body: [
      'We use cookies and similar technologies to keep you signed in, remember your cart and preferences, and understand how the marketplace is used.',
      'You can control cookies through your browser settings; disabling them may limit some features, such as staying logged in.',
    ],
    callout: { type: 'info', text: 'You can control cookies through your browser settings; disabling them may limit some features, such as staying logged in.' },
  },
  {
    id: 'data-sharing',
    title: 'Data Sharing & Third Parties',
    body: [
      'We share order details (name, shipping address, order contents) with the seller fulfilling your order — this is necessary to deliver what you\'ve purchased.',
      'We share payment details with our payment processors solely to complete transactions; we do not sell your personal information to third parties.',
      'We may disclose information if required by law or to protect the rights, property, or safety of Edudeen, our users, or the public.',
    ],
  },
  {
    id: 'data-security',
    title: 'Data Security',
    body: [
      'We use industry-standard safeguards — encryption in transit, access controls, and regular security reviews — to protect your information.',
      'No online platform can guarantee absolute security; we encourage you to use a strong, unique password and enable any additional account security options we offer.',
    ],
    callout: { type: 'security', text: 'We use industry-standard safeguards — encryption in transit, access controls, and regular security reviews — to protect your information.' },
  },
  {
    id: 'your-rights',
    title: 'Your Rights & Choices',
    body: [
      'You can access, update, or delete most of your account information directly from your account settings at any time.',
      'You may request a copy of the personal data we hold about you, or ask us to delete your account, by contacting our support team.',
    ],
  },
  {
    id: 'childrens-privacy',
    title: 'Children\'s Privacy',
    body: [
      'Edudeen is not directed at children under 13, and we do not knowingly collect personal information from them. If you believe a child has provided us with personal information, please contact us so we can remove it.',
    ],
    callout: { type: 'warning', text: 'Edudeen is not directed at children under 13, and we do not knowingly collect personal information from them.' },
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. We\'ll post the updated version here with a new "Last updated" date, and notify you of significant changes where required.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact Us',
    body: [
      'If you have questions about this Privacy Policy or how your data is handled, reach out to our support team through the Help Center or Contact Us page.',
    ],
  },
];

export function PrivacyPolicyPage() {
  usePageTitle('Privacy Policy');
  return (
    <LegalPageLayout
      pageKey="privacy-policy"
      title="Privacy Policy"
      subtitle="How Edudeen collects, uses, and protects your information."
      lastUpdated="July 24, 2026"
      sections={SECTIONS}
      relatedPages={[
        { title: 'Terms of Service', description: 'The rules and guidelines for using Edudeen as a buyer or seller.', path: '/terms-of-service' },
      ]}
    />
  );
}
