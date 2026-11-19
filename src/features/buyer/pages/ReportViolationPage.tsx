import { usePageTitle } from '@/hooks/usePageTitle';
import { LegalPageLayout, type LegalSection } from '@/components/comman/ui';

// Placeholder content — not reviewed legal copy (no registered DMCA agent is
// named here). Have this reviewed before relying on it for copyright claims.
const SECTIONS: LegalSection[] = [
  {
    id: 'overview',
    title: 'Report a Violation',
    body: [
      'Edudeen respects the rights of authors, publishers and educators. If you believe a listing copies your work, or breaks our Content Policy, tell us and we will review it.',
    ],
  },
  {
    id: 'how',
    title: 'How to Report',
    body: [
      'Email support@edudeen.com with the subject "Report a violation" and include:',
      '1. The link to the listing or store.',
      '2. What the problem is (copyright, counterfeit, unsuitable content, other).',
      '3. For copyright claims: who owns the work, and proof or a link to the original.',
      '4. Your name and contact details, so we can follow up.',
    ],
  },
  {
    id: 'copyright',
    title: 'Copyright Claims',
    body: [
      'State that you are the owner or authorised to act for the owner, and that the information you give is accurate. False claims can have legal consequences.',
    ],
  },
  {
    id: 'after',
    title: 'What Happens Next',
    body: [
      'We review the report, may remove or disable the listing, and may contact the seller. Sellers can reply with their side. Repeat infringers can lose their store.',
    ],
    callout: { type: 'info', text: 'We cannot share your contact details with the seller unless you agree.' },
  },
];

export function ReportViolationPage() {
  usePageTitle('Report a violation');
  return (
    <LegalPageLayout
      title="Report a violation"
      subtitle="Report copyright infringement or content that breaks our rules."
      lastUpdated="November 19, 2026"
      sections={SECTIONS}
      relatedPages={[
        { title: 'Content Policy', description: 'What can and cannot be listed on Edudeen.', path: '/content-policy' },
        { title: 'Terms of Service', description: 'The rules and guidelines for using Edudeen.', path: '/terms-of-service' },
      ]}
    />
  );
}
