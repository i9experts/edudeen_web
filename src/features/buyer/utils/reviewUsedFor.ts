import type { ReviewUsedFor } from '@/api/services/rating';

export const REVIEW_USED_FOR: { value: ReviewUsedFor; label: string }[] = [
  { value: 'home',      label: 'At home' },
  { value: 'classroom', label: 'In my classroom' },
  { value: 'school',    label: 'School-wide' },
];

export const REVIEW_USED_FOR_LABEL: Record<ReviewUsedFor, string> = {
  home: 'At home', classroom: 'In my classroom', school: 'School-wide',
};
