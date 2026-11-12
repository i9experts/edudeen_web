// Mirror of the fixed lists in edudeen_api/src/store/store-page.util.ts (keep both in sync): the options behind the
// storefront "Grades / Subjects / Languages" chips. Grades are the CLASS_LEVELS (constants/classLevels.ts).

import { CLASS_LEVELS } from './classLevels';

export const STORE_GRADES = CLASS_LEVELS;

export const STORE_SUBJECTS = [
  { value: 'quran-tajweed', label: 'Quran & Tajweed' },
  { value: 'islamic-studies', label: 'Islamic Studies' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'urdu', label: 'Urdu' },
  { value: 'english', label: 'English' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'science', label: 'Science' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'biology', label: 'Biology' },
  { value: 'computer-science', label: 'Computer Science' },
  { value: 'social-studies', label: 'Social Studies' },
  { value: 'pakistan-studies', label: 'Pakistan Studies' },
  { value: 'general-knowledge', label: 'General Knowledge' },
  { value: 'early-learning', label: 'Early Learning' },
  { value: 'exam-prep', label: 'Exam Preparation' },
  { value: 'art-handwriting', label: 'Art & Handwriting' },
] as const;

export const TEACHING_LANGUAGES = [
  { value: 'urdu', label: 'Urdu' },
  { value: 'english', label: 'English' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'other', label: 'Other' },
] as const;

export const TEACHING_MAX = { gradesServed: 18, subjects: 12, teachingLanguages: 4 } as const;

const label = (list: readonly { value: string; label: string }[], v: string) => list.find(x => x.value === v)?.label ?? null;
export const gradeChipLabel = (v: string) => label(STORE_GRADES, v);
export const subjectChipLabel = (v: string) => label(STORE_SUBJECTS, v);
export const languageChipLabel = (v: string) => label(TEACHING_LANGUAGES, v);
