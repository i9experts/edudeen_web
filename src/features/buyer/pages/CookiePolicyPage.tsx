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
      'This Cookie Policy explains how Edudeen uses cookies and similar tracking technologies when you visit or use our marketplace, and the choices available to you.',
      'It should be read alongside our Privacy Policy, which explains more broadly how we handle your personal information.',
    ],
  },
  {
    id: 'what-are-cookies',
    title: 'What Are Cookies',
    body: [
      'Cookies are small text files placed on your device when you visit a website. They\'re widely used to make sites work, work more efficiently, and to provide information to the site owner.',
    ],
  },
  {
    id: 'types-of-cookies',
    title: 'Types of Cookies We Use',
    body: [
      'Essential cookies: required for core functionality like staying signed in, keeping items in your cart, and completing checkout. The marketplace cannot function properly without these.',
      'Performance & analytics cookies: help us understand how the marketplace is used, so we can find and fix issues and improve the experience.',
      'Functional cookies: remember your preferences, such as language, currency, or recently viewed items.',
      'Advertising cookies: used to show you more relevant offers on Edudeen and, where applicable, on other sites.',
    ],
    callout: { type: 'info', text: 'Essential cookies: required for core functionality like staying signed in, keeping items in your cart, and completing checkout. The marketplace cannot function properly without these.' },
  },
  {
    id: 'how-we-use',
    title: 'How We Use Cookies',
    body: [
      'We use the cookie categories above to keep the marketplace secure, remember your session and preferences, measure performance, and personalize product recommendations.',
    ],
  },
  {
    id: 'third-party',
    title: 'Third-Party Cookies',
    body: [
      'Some cookies are set by third-party services we use, such as payment processors and analytics providers, so they can perform their function on our behalf. We don\'t control these cookies directly — refer to each provider\'s own policy for details.',
    ],
  },
  {
    id: 'managing-preferences',
    title: 'Managing Your Cookie Preferences',
    body: [
      'Most browsers let you view, delete, and block cookies through their settings. Because essential cookies are required for sign-in and checkout, blocking them may prevent parts of Edudeen from working correctly.',
    ],
    callout: { type: 'warning', text: 'Because essential cookies are required for sign-in and checkout, blocking them may prevent parts of Edudeen from working correctly.' },
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    body: [
      'We may update this Cookie Policy from time to time to reflect changes in the cookies we use or for legal reasons. We\'ll post the updated version here with a new "Last updated" date.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact Us',
    body: [
      'If you have questions about this Cookie Policy, reach out to our support team through the Help Center or Contact Us page.',
    ],
  },
];

export function CookiePolicyPage() {
  usePageTitle('Cookie Policy');
  return (
    <LegalPageLayout
      title="Cookie Policy"
      subtitle="How Edudeen uses cookies and similar technologies."
      lastUpdated="July 24, 2026"
      sections={SECTIONS}
      relatedPages={[
        { title: 'Privacy Policy', description: 'How Edudeen collects, uses, and protects your information.', path: '/privacy-policy' },
        { title: 'Terms of Service', description: 'The rules and guidelines for using Edudeen as a buyer or seller.', path: '/terms-of-service' },
      ]}
    />
  );
}
