/**
 * Built-in starter learning paths, shown on /learning-paths ONLY while an admin has not created any (the admin-curated paths
 * always win). They are plain study guides: each step says what to learn and links to a search for matching resources.
 * No product is named here, so nothing can go out of date or point at something that was removed.
 */
export interface StarterStep { title: string; titleUr: string; text: string; textUr: string; query: string }
export interface StarterPath {
  id: string;
  title: string; titleUr: string;
  subtitle: string; subtitleUr: string;
  level: string; levelUr: string;
  steps: StarterStep[];
}

export const STARTER_LEARNING_PATHS: StarterPath[] = [
  {
    id: 'quran-reading',
    title: 'Learn to read the Quran', titleUr: 'قرآن پڑھنا سیکھیں',
    subtitle: 'From the first Arabic letter to confident, correct recitation.', subtitleUr: 'پہلے عربی حرف سے لے کر درست اور رواں تلاوت تک۔',
    level: 'Beginner · all ages', levelUr: 'ابتدائی · ہر عمر',
    steps: [
      { title: 'Arabic letters and sounds', titleUr: 'عربی حروف اور آوازیں', text: 'Learn each letter, its shape and where its sound comes from. Practise a few letters a day.', textUr: 'ہر حرف، اس کی شکل اور مخرج سیکھیں۔ روزانہ چند حروف کی مشق کریں۔', query: 'arabic alphabet' },
      { title: 'Noorani Qaida', titleUr: 'نورانی قاعدہ', text: 'Join letters, learn the short vowels, and read simple words slowly with a teacher or parent.', textUr: 'حروف ملانا، حرکات اور سادہ الفاظ آہستہ آہستہ استاد یا والدین کے ساتھ پڑھنا سیکھیں۔', query: 'noorani qaida' },
      { title: 'Tajweed basics', titleUr: 'تجوید کی بنیادی باتیں', text: 'Learn the main rules that make recitation correct, then apply them to short surahs.', textUr: 'تلاوت کو درست بنانے والے بنیادی قواعد سیکھیں اور چھوٹی سورتوں میں ان کی مشق کریں۔', query: 'tajweed' },
      { title: 'Memorise Juz Amma', titleUr: 'جزو عمّ کا حفظ', text: 'Start with the short surahs you already recite in prayer. Revise yesterday’s lesson before adding a new one.', textUr: 'ان چھوٹی سورتوں سے شروع کریں جو آپ نماز میں پڑھتے ہیں۔ نیا سبق شروع کرنے سے پہلے کل کا سبق دہرائیں۔', query: 'juz amma' },
    ],
  },
  {
    id: 'islamic-basics-kids',
    title: 'Islamic basics for children', titleUr: 'بچوں کے لیے اسلامی بنیادیں',
    subtitle: 'Daily practice, prayer and stories, step by step.', subtitleUr: 'روزمرہ عمل، نماز اور قصے، قدم بہ قدم۔',
    level: 'Ages 5–12', levelUr: '۵ سے ۱۲ سال',
    steps: [
      { title: 'Daily duas', titleUr: 'روزمرہ کی دعائیں', text: 'Learn the short duas for waking up, eating and sleeping. One dua a week is enough.', textUr: 'جاگنے، کھانے اور سونے کی مختصر دعائیں سیکھیں۔ ہفتے میں ایک دعا کافی ہے۔', query: 'daily duas' },
      { title: 'How to pray (Salah)', titleUr: 'نماز کا طریقہ', text: 'Learn wudu and each step of prayer, then pray together as a family.', textUr: 'وضو اور نماز کا ہر مرحلہ سیکھیں، پھر گھر والوں کے ساتھ مل کر نماز پڑھیں۔', query: 'salah guide' },
      { title: 'Stories of the Prophets', titleUr: 'انبیاء کے قصے', text: 'Read or listen to one story at a time and talk about the lesson in it.', textUr: 'ایک وقت میں ایک قصہ پڑھیں یا سنیں اور اس کے سبق پر بات کریں۔', query: 'stories of the prophets' },
      { title: 'Ramadan and Islamic months', titleUr: 'رمضان اور اسلامی مہینے', text: 'Learn why we fast and what each Islamic month teaches, with simple activities.', textUr: 'روزہ کیوں رکھتے ہیں اور ہر اسلامی مہینہ کیا سکھاتا ہے، سادہ سرگرمیوں کے ساتھ سیکھیں۔', query: 'ramadan activities' },
    ],
  },
  {
    id: 'primary-foundations',
    title: 'Primary school foundations', titleUr: 'پرائمری کی بنیادیں',
    subtitle: 'Reading, writing and numbers for the first years of school.', subtitleUr: 'اسکول کے ابتدائی سالوں کے لیے پڑھنا، لکھنا اور گنتی۔',
    level: 'Grades 1–3', levelUr: 'جماعت ۱ تا ۳',
    steps: [
      { title: 'Letters and handwriting', titleUr: 'حروف اور لکھائی', text: 'Trace letters and numbers every day until the strokes feel natural.', textUr: 'جب تک لکھنا آسان نہ ہو جائے، روزانہ حروف اور اعداد پر لکیر کھینچ کر مشق کریں۔', query: 'tracing worksheets' },
      { title: 'Urdu reading', titleUr: 'اردو پڑھنا', text: 'Move from letters to short words and sentences with picture-based practice.', textUr: 'تصویروں کی مدد سے حروف سے مختصر الفاظ اور جملوں تک آئیں۔', query: 'urdu qaida' },
      { title: 'English phonics', titleUr: 'انگریزی فونکس', text: 'Learn letter sounds first, then blend them to read simple words.', textUr: 'پہلے حروف کی آوازیں سیکھیں، پھر انہیں ملا کر سادہ الفاظ پڑھیں۔', query: 'english phonics' },
      { title: 'Numbers and simple maths', titleUr: 'گنتی اور سادہ حساب', text: 'Count, add and subtract with worksheets, ten minutes a day.', textUr: 'ورک شیٹس کے ساتھ روزانہ دس منٹ گنتی، جمع اور تفریق کریں۔', query: 'math worksheets' },
    ],
  },
];
