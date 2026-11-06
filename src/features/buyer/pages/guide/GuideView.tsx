import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '@/contexts/languageCtx';
import type { GuideSection, GuideStep, Need } from './guideData';
import { QUICK_FAQ } from './guideData';

const NEED_STYLE: Record<Need, string> = {
  required: 'bg-red-50 text-red-700',
  recommended: 'bg-amber-50 text-amber-800',
  optional: 'bg-bone text-slate',
};
const NEED_LABEL: Record<Need, string> = { required: 'Required', recommended: 'Recommended', optional: 'Optional' };

function matches(step: GuideStep, q: string) {
  if (!q) return true;
  const hay = [step.title, step.summary, ...(step.points ?? []), ...(step.avoid ?? []), ...(step.fields ?? []).flatMap(f => [f.name, f.tip])].join(' ').toLowerCase();
  return q.split(/\s+/).every(w => hay.includes(w));
}

function StepImage({ step }: { step: GuideStep }) {
  const [ok, setOk] = useState(true);
  if (!step.img || !ok) return null;
  const src = `/guide/${step.img}`;
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block mt-4 rounded-xl overflow-hidden border border-bone bg-bone/40 no-underline">
      <img
        src={src}
        alt={step.imgAlt ?? step.title}
        loading="lazy"
        decoding="async"
        width={1280}
        height={800}
        onError={() => setOk(false)}
        className="w-full h-auto block"
      />
    </a>
  );
}

function StepCard({ step, n }: { step: GuideStep; n: number }) {
  const t = useT();
  return (
    <article id={step.id} className="scroll-mt-28 rounded-2xl border border-bone bg-white p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden className="shrink-0 w-8 h-8 rounded-full bg-brand-royal text-white text-[13px] font-bold flex items-center justify-center">{n}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="m-0 text-[16px] sm:text-[17px] font-bold text-carbon">{t(step.title)}</h3>
            {step.time ? <span className="text-[12px] text-slate bg-bone rounded-full px-2.5 py-0.5">{t(step.time)}</span> : null}
          </div>
          <p className="m-0 mt-1 text-[14px] text-slate">{t(step.summary)}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 mt-4">
        <div className="min-w-0 flex flex-col gap-4">
          {step.fields?.length ? (
            <ul className="m-0 p-0 list-none flex flex-col divide-y divide-bone rounded-xl border border-bone">
              {step.fields.map(f => (
                <li key={f.name} className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-carbon">{t(f.name)}</span>
                    <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${NEED_STYLE[f.need]}`}>{t(NEED_LABEL[f.need])}</span>
                  </div>
                  <p className="m-0 mt-1 text-[13px] text-slate">{t(f.tip)}</p>
                </li>
              ))}
            </ul>
          ) : null}

          {step.points?.length ? (
            <ul className="m-0 ps-5 text-[13.5px] text-carbon flex flex-col gap-1.5 list-disc marker:text-brand-royal">
              {step.points.map(p => <li key={p}>{t(p)}</li>)}
            </ul>
          ) : null}

          {step.avoid?.length ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="m-0 text-[12px] font-bold text-amber-900 uppercase tracking-wide">{t('Avoid')}</p>
              <ul className="m-0 mt-1 ps-5 text-[13px] text-amber-950 list-disc flex flex-col gap-1">
                {step.avoid.map(p => <li key={p}>{t(p)}</li>)}
              </ul>
            </div>
          ) : null}

          {step.link ? (
            <Link to={step.link.to} className="self-start text-[13.5px] font-semibold text-brand-royal hover:text-brand-orange no-underline inline-flex items-center min-h-9">
              {t(step.link.label)} <span aria-hidden className="ms-1 rtl:rotate-180">→</span>
            </Link>
          ) : null}
        </div>
        <div className="min-w-0"><StepImage step={step} /></div>
      </div>
    </article>
  );
}

export function GuideView({ sections, audience, cta }: { sections: GuideSection[]; audience: 'buyer' | 'seller'; cta?: { label: string; to: string } }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () => sections.map(s => ({ ...s, steps: s.steps.filter(st => matches(st, q)) })).filter(s => s.steps.length > 0),
    [sections, q],
  );
  const flow = useMemo(() => sections.flatMap(s => s.steps.map(st => ({ id: st.id, title: st.title }))), [sections]);
  const faqs = QUICK_FAQ.filter(f => f.audience === audience);
  let counter = 0;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t(audience === 'seller' ? 'Search the seller guide, e.g. price, payout, shipping' : 'Search the buyer guide, e.g. refund, download, COD')}
          aria-label={t('Search the guide')}
          className="w-full sm:max-w-[460px] h-11 rounded-xl border border-bone bg-white px-4 text-[14px] text-carbon placeholder:text-slate focus:outline-none focus:border-brand-royal"
        />
        {cta ? (
          <Link to={cta.to} className="h-11 inline-flex items-center justify-center rounded-xl bg-brand-royal text-white text-[14px] font-semibold px-5 no-underline hover:opacity-90">{t(cta.label)}</Link>
        ) : null}
      </div>

      {!q ? (
        <nav aria-label={t('Steps at a glance')} className="overflow-x-auto -mx-1 px-1 pb-1">
          <ol className="m-0 p-0 list-none flex gap-2 min-w-max">
            {flow.map((f, i) => (
              <li key={f.id} className="flex items-center gap-2">
                <a href={`#${f.id}`} className="inline-flex items-center gap-2 rounded-full border border-bone bg-white px-3 min-h-9 text-[12.5px] text-carbon no-underline hover:border-brand-royal">
                  <span aria-hidden className="w-5 h-5 rounded-full bg-brand-royal/10 text-brand-royal text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                  {t(f.title)}
                </a>
                {i < flow.length - 1 ? <span aria-hidden className="text-slate rtl:rotate-180">›</span> : null}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-[14px] text-slate m-0">{t('Nothing matches your search. Try another word.')}</p>
      ) : filtered.map(sec => (
        <section key={sec.id} aria-labelledby={`h-${sec.id}`} className="flex flex-col gap-4">
          <div>
            <h2 id={`h-${sec.id}`} className="m-0 font-serif text-[22px] sm:text-[26px] text-carbon">{t(sec.title)}</h2>
            <p className="m-0 mt-1 text-[14px] text-slate max-w-[720px]">{t(sec.intro)}</p>
          </div>
          {sec.steps.map(st => { counter += 1; return <StepCard key={st.id} step={st} n={counter} />; })}
        </section>
      ))}

      {!q && faqs.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="m-0 font-serif text-[22px] text-carbon">{t('Quick answers')}</h2>
          {faqs.map(f => (
            <details key={f.q} className="rounded-xl border border-bone bg-white px-4 py-3">
              <summary className="cursor-pointer text-[14px] font-semibold text-carbon min-h-8 flex items-center">{t(f.q)}</summary>
              <p className="m-0 mt-2 text-[13.5px] text-slate">{t(f.a)}</p>
            </details>
          ))}
          <p className="m-0 text-[13.5px] text-slate">
            {t('Still stuck?')} <Link to="/contact-us" className="text-brand-royal font-semibold no-underline hover:text-brand-orange">{t('Contact Us')}</Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
