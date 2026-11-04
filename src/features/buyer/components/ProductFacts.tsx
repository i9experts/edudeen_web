import { useT } from '@/contexts/languageCtx';
import { PRODUCT_LANGUAGES } from '@/constants/learning';
import { classRangeLabel } from '@/constants/classLevels';
import type { MarketplaceProduct } from '@/api/services/marketplace';

// "At a glance" row on the product page: Class, Subject, Format, Pages, Language
// (courses: Lessons + Duration). Empty items are hidden; nothing renders when all are empty.
// Physical products only show Class / Subject / Language.

type Fact = { label: string; value: string };

function durationText(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
}

export function ProductFacts({ product, subject }: { product: Pick<MarketplaceProduct, 'classFrom' | 'classTo' | 'language' | 'digital' | 'courseSummary' | 'deliveryFormat' | 'type'>; subject?: string | null }) {
  const t = useT();
  const isDigital = product.type === 'digital';
  const isCourse = isDigital && product.deliveryFormat === 'course';
  const facts: Fact[] = [];

  const cls = classRangeLabel(product.classFrom, product.classTo);
  if (cls) facts.push({ label: t('Class'), value: cls });
  if (subject) facts.push({ label: t('Subject'), value: subject });

  if (isCourse) {
    const s = product.courseSummary;
    if (s && s.lessonCount > 0) {
      facts.push({ label: t('Lessons'), value: String(s.lessonCount) });
      if (s.totalMinutes > 0) facts.push({ label: t('Duration'), value: durationText(s.totalMinutes) });
    }
  } else if (isDigital) {
    const formats = product.digital?.fileFormats ?? [];
    if (formats.length) facts.push({ label: t('Format'), value: formats.join(' · ') });
    const pages = product.digital?.pageCount;
    if (pages && pages > 0) facts.push({ label: t('Pages'), value: String(pages) });
  }

  const lang = PRODUCT_LANGUAGES.find(l => l.value === product.language);
  if (lang) facts.push({ label: t('Language'), value: t(lang.label) });

  if (!facts.length) return null;
  return (
    <dl
      aria-label={t('Product facts')}
      className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-px overflow-hidden rounded-2xl border border-bone bg-bone mb-6 min-w-0"
    >
      {facts.map(f => (
        <div key={f.label} className="bg-white px-4 py-3 min-w-0">
          <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate">{f.label}</dt>
          <dd className="m-0 mt-[2px] text-[13.5px] font-semibold text-carbon break-words">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
