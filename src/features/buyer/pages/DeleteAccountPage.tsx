import { usePageTitle } from '@/hooks/usePageTitle';
import { LegalPageLayout, type LegalSection } from '@/components/comman/ui';

// Public account-deletion page (edudeen.com/delete-account) — the URL listed
// on the Google Play "Data deletion" form. The app/developer name below must
// match the Play Store listing exactly.
const SECTIONS: LegalSection[] = [
  {
    id: 'app',
    title: 'App & Developer',
    body: [
      'App: Edudeen',
      'Developer: Edudeen',
      'This page explains how to request deletion of your Edudeen account and the data associated with it.',
    ],
  },
  {
    id: 'in-app',
    title: 'Option 1 — In-App Deletion (Recommended)',
    body: [
      '1. Open the Edudeen app.',
      '2. Go to Profile → Settings.',
      '3. Tap "Delete Account".',
      '4. Confirm the deletion.',
    ],
  },
  {
    id: 'email',
    title: 'Option 2 — Email Request',
    body: [
      'If you no longer have access to the app, send an email to support@edudeen.com with the subject "Account Deletion Request" and include the email address or phone number associated with your account.',
      'We will process your request within 7 business days.',
    ],
    callout: { type: 'info', text: 'Email support@edudeen.com with the subject "Account Deletion Request" — we process requests within 7 business days.' },
  },
  {
    id: 'deleted',
    title: 'What Data Is Deleted',
    body: [
      'Your profile information (name, email, phone number).',
      'Your order history and saved addresses.',
      'Your product listings (if you are a seller).',
      'Your saved payment methods.',
    ],
  },
  {
    id: 'retained',
    title: 'What Data Is Retained',
    body: [
      'Transaction records required for legal/tax compliance purposes may be retained for up to 1 year, as required by applicable law.',
      'Anonymized analytics data that cannot be linked back to you.',
    ],
    callout: { type: 'warning', text: 'Transaction records needed for legal/tax compliance may be kept for up to 1 year. Everything else listed above is deleted.' },
  },
  {
    id: 'contact',
    title: 'Contact Us',
    body: [
      'For any questions, contact us at support@edudeen.com.',
    ],
  },
];

export function DeleteAccountPage() {
  usePageTitle('Delete Your Account');
  return (
    <LegalPageLayout
      title="Delete Your Edudeen Account"
      subtitle="To request deletion of your Edudeen account and associated data, please follow these steps."
      lastUpdated="September 30, 2026"
      sections={SECTIONS}
      relatedPages={[
        { title: 'Privacy Policy', description: 'How Edudeen collects, uses, and protects your information.', path: '/privacy-policy' },
      ]}
    />
  );
}
