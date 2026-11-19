import { usePageTitle } from '@/hooks/usePageTitle';
import { LegalPageLayout, type LegalSection } from '@/components/comman/ui';

// Placeholder content — not reviewed legal copy. Replace with the real
// policy (and keep "Last updated" accurate) before this page is treated as binding.
const SECTIONS: LegalSection[] = [
  {
    id: 'purpose',
    title: 'Purpose',
    body: [
      'Edudeen is a marketplace for educational and Islamic-studies resources. This Content Policy explains what may and may not be listed, so learners, parents and teachers can trust what they find here.',
    ],
  },
  {
    id: 'allowed',
    title: 'What You Can List',
    body: [
      'Books, worksheets, lesson plans, courses, tutoring, Quran and Islamic-studies material, stationery and learning aids, and digital educational downloads that you own or have the right to sell.',
    ],
  },
  {
    id: 'not-allowed',
    title: 'What Is Not Allowed',
    body: [
      'Counterfeit, pirated or copied material; illegal or dangerous items; adult, violent or hateful content; products unrelated to education.',
      'Content that mocks, misrepresents or disrespects Islam or any other faith, or that is misleading about religious teachings.',
      'Fake reviews, misleading claims, spam, or listings that send buyers away from Edudeen to avoid fees.',
    ],
  },
  {
    id: 'accuracy',
    title: 'Accuracy & Suitability',
    body: [
      'Describe grade level, subject, language and format honestly. Material for children must be suitable for the age you state.',
    ],
  },
  {
    id: 'enforcement',
    title: 'How We Enforce This',
    body: [
      'We may review listings, remove content, hold payouts, or suspend stores that break this policy. Serious or repeated violations can lead to permanent removal.',
    ],
    callout: { type: 'warning', text: 'If you see a listing that breaks this policy, use the Report a violation page so our team can review it.' },
  },
  {
    id: 'contact',
    title: 'Questions',
    body: ['Questions about this policy can be sent through the Contact Us page.'],
  },
];

export function ContentPolicyPage() {
  usePageTitle('Content Policy');
  return (
    <LegalPageLayout
      title="Content Policy"
      subtitle="What can and cannot be listed on Edudeen."
      lastUpdated="November 19, 2026"
      sections={SECTIONS}
      relatedPages={[
        { title: 'Report a violation', description: 'Report copyright infringement or content that breaks our rules.', path: '/report-violation' },
        { title: 'Seller Terms', description: 'The rules for selling on Edudeen.', path: '/seller-terms' },
      ]}
    />
  );
}
