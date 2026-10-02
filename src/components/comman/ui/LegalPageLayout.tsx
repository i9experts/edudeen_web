import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Info, ShieldAlert, ShieldCheck, Printer, Link2, Check, ArrowRight, LifeBuoy } from 'lucide-react';
import { Button } from './Button';
import { scrollRootRef } from '@/utils/scrollRoot';
import { Reveal } from '@/components/comman/motion/Reveal';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { PremiumCard } from '@/components/comman/motion/PremiumCard';

const SERIF = "Georgia, 'Times New Roman', serif";
const WORDS_PER_MINUTE = 200;

export interface LegalCallout {
  type: 'info' | 'warning' | 'security';
  // Verbatim text already present in this section's body — a callout is a
  // visual re-emphasis of an existing sentence, never new copy.
  text: string;
}

export interface LegalSection {
  id:       string;
  title:    string;
  body:     string[]; // one or more paragraphs
  callout?: LegalCallout;
}

export interface RelatedLegalPage {
  title:       string;
  description: string;
  path:        string;
}

interface LegalPageLayoutProps {
  title:         string;
  subtitle:      string;
  lastUpdated:   string;
  sections:      LegalSection[];
  relatedPages?: RelatedLegalPage[];
}

const CALLOUT_STYLES: Record<LegalCallout['type'], { icon: typeof Info; wrap: string; icon_: string }> = {
  info:     { icon: Info,        wrap: 'bg-info-bg border-info/20',       icon_: 'text-info' },
  warning:  { icon: ShieldAlert, wrap: 'bg-warning-bg border-warning/25', icon_: 'text-warning' },
  security: { icon: ShieldCheck, wrap: 'bg-success-bg border-success/20', icon_: 'text-success' },
};

function Callout({ callout }: { callout: LegalCallout }) {
  const cfg = CALLOUT_STYLES[callout.type];
  const Icon = cfg.icon;
  return (
    <div className={clsx('flex items-start gap-2.5 rounded-lg border px-4 py-3 mt-4', cfg.wrap)}>
      <Icon size={15} className={clsx('shrink-0 mt-[1px]', cfg.icon_)} />
      <p className="text-[12.5px] leading-[1.65] text-charcoal">{callout.text}</p>
    </div>
  );
}

/** Fades a section up into place the first time it scrolls into view — once
 *  only, never re-triggered scrolling back up, so it reads as a one-time
 *  reveal rather than a distracting repeated animation. */
function useRevealOnScroll<T extends HTMLElement>(id: string, revealed: Set<string>, setRevealed: (fn: (prev: Set<string>) => Set<string>) => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || revealed.has(id)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(prev => new Set(prev).add(id));
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return ref;
}

/** Shared shell for the Privacy Policy / Terms of Service pages (and any
 *  future legal/policy page) — styled after enterprise SaaS legal pages
 *  (Stripe/Shopify/Vercel/Notion/Linear): a plain reading column with no
 *  card chrome, a sticky scoll-spy table of contents, a top reading-progress
 *  bar, and print/copy-link actions. The two pages only ever differ in their
 *  content array. */
export function LegalPageLayout({ title, subtitle, lastUpdated, sections, relatedPages = [] }: LegalPageLayoutProps) {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Reading-progress bar — how far through the article the reader is.
  useEffect(() => {
    const el = scrollRootRef.current;
    if (!el) return;
    const onScroll = () => {
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? Math.min(100, Math.max(0, (el.scrollTop / total) * 100)) : 0);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy — highlights the TOC entry for whichever section is in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const scrollTo = useCallback((id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — silently ignore */ }
  }, []);

  const wordCount = sections.reduce((sum, s) => sum + s.body.join(' ').split(/\s+/).length, 0);
  const readingMinutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));

  return (
    <div className="bg-white min-h-full scroll-smooth">
      {/* ── Reading progress bar ── */}
      <div className="print:hidden fixed top-0 start-0 end-0 h-[2px] bg-transparent z-[60]">
        <div className="h-full bg-brand-orange transition-[width] duration-100 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Hero ── */}
      <div className="max-w-[800px] mx-auto px-4 md:px-6 pt-14 md:pt-20 pb-10 border-b border-bone">
        <Reveal delay={0}>
          <h1 className="text-[28px] md:text-[38px] font-bold text-carbon leading-[1.15] tracking-[-0.01em] mb-3" style={{ fontFamily: SERIF }}>
            {title}
          </h1>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="text-[14px] md:text-[15.5px] text-slate leading-[1.6] mb-6 max-w-[560px]">
            {subtitle}
          </p>
        </Reveal>
        <Reveal delay={0.14}>
          <div className="flex items-center gap-3 flex-wrap text-[12.5px] text-slate">
            <span>Last updated {lastUpdated}</span>
            <span className="text-bone">•</span>
            <span>{readingMinutes} min read</span>
            <div className="print:hidden flex items-center gap-2 sm:ms-auto">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-[6px] rounded-md border border-bone text-[12px] font-medium text-charcoal bg-white hover:bg-cream transition-colors cursor-pointer"
              >
                <Printer size={13} /> Print
              </button>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-[6px] rounded-md border border-bone text-[12px] font-medium text-charcoal bg-white hover:bg-cream transition-colors cursor-pointer"
              >
                {copied ? <><Check size={13} className="text-success" /> Copied</> : <><Link2 size={13} /> Copy Link</>}
              </button>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ── Body: TOC + reading column ── */}
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-12 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-12 items-start">

        {/* Table of contents — desktop only, sticky */}
        <nav aria-label="Table of contents" className="print:hidden hidden lg:block sticky top-16">
          <p className="text-[11px] font-bold text-slate uppercase tracking-[0.08em] mb-3">On this page</p>
          <ul className="flex flex-col gap-[2px] border-s border-bone">
            {sections.map((s, i) => (
              <li key={s.id}>
                <button
                  onClick={() => scrollTo(s.id)}
                  className={clsx(
                    'w-full text-start ps-4 pe-2 py-[7px] -ms-px border-s-2 text-[12.5px] transition-colors cursor-pointer bg-transparent',
                    activeId === s.id
                      ? 'border-brand-orange text-brand-orange font-semibold'
                      : 'border-transparent text-slate hover:text-carbon',
                  )}
                >
                  {i + 1}. {s.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Reading column — no card chrome, plain flow with dividers */}
        <div className="max-w-[760px] min-w-0">
          {sections.map((s, i) => (
            <SectionBlock
              key={s.id}
              index={i}
              section={s}
              isLast={i === sections.length - 1}
              setRef={el => { sectionRefs.current[s.id] = el; }}
              revealed={revealed}
              setRevealed={setRevealed}
            />
          ))}

          {/* ── Contact support outro ── */}
          <Reveal className="print:hidden mt-4">
            <PremiumCard className="p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-pale-orange flex items-center justify-center shrink-0">
                  <LifeBuoy size={16} className="text-brand-orange" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-carbon">Still have questions?</p>
                  <p className="text-[12.5px] text-slate mt-0.5">Our support team can help clarify anything in this document.</p>
                </div>
              </div>
              <MagneticButton className="shrink-0">
                <Button variant="outline" size="sm" onClick={() => navigate('/faq')}>
                  Contact Support
                </Button>
              </MagneticButton>
            </PremiumCard>
          </Reveal>

          {/* ── Related legal pages ── */}
          {relatedPages.length > 0 && (
            <div className="print:hidden mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedPages.map(p => (
                <PremiumCard
                  key={p.path}
                  onClick={() => navigate(p.path)}
                  className="p-5"
                >
                  <p className="text-[13px] font-semibold text-carbon flex items-center justify-between gap-2">
                    {p.title}
                    <ArrowRight size={14} className="text-slate shrink-0" />
                  </p>
                  <p className="text-[12px] text-slate mt-1 leading-[1.5]">{p.description}</p>
                </PremiumCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionBlock({
  index, section, isLast, setRef, revealed, setRevealed,
}: {
  index:       number;
  section:     LegalSection;
  isLast:      boolean;
  setRef:      (el: HTMLElement | null) => void;
  revealed:    Set<string>;
  setRevealed: (fn: (prev: Set<string>) => Set<string>) => void;
}) {
  const revealRef = useRevealOnScroll<HTMLElement>(section.id, revealed, setRevealed);
  const isRevealed = revealed.has(section.id);

  return (
    <>
      <section
        id={section.id}
        ref={el => { setRef(el); revealRef.current = el; }}
        className={clsx(
          'scroll-mt-24 py-9 transition-all duration-700 ease-out',
          isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        )}
      >
        <h2 className="text-[19px] md:text-[21px] font-bold text-carbon mb-4 flex items-baseline gap-2 tracking-[-0.01em]">
          <span className="text-brand-orange/70 font-semibold text-[15px]">{index + 1}.</span> {section.title}
        </h2>
        <div className="flex flex-col gap-4">
          {section.body.map((p, pi) => (
            <p key={pi} className="text-[14.5px] text-slate leading-[1.85]">{p}</p>
          ))}
        </div>
        {section.callout && <Callout callout={section.callout} />}
      </section>
      {!isLast && <hr className="border-t border-bone" />}
    </>
  );
}
