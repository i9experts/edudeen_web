import { useState, useId, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Search, ChevronDown, HelpCircle, LifeBuoy, MessageCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useFaqs, useFaqCategories } from '@/hooks/useFaqs';
import { Button, SkeletonBox } from '@/components/comman/ui';
import type { Faq } from '@/api/services/faq';
import { Reveal } from '@/components/comman/motion/Reveal';
import { SectionHeading } from '@/components/comman/motion/SectionHeading';
import { PremiumCard } from '@/components/comman/motion/PremiumCard';

function FaqAccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-b border-bone last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="w-full flex items-center justify-between gap-4 py-[18px] text-start bg-transparent border-none cursor-pointer group"
      >
        <span className={clsx('text-[14px] font-semibold transition-colors', open ? 'text-brand-orange' : 'text-carbon group-hover:text-brand-orange')}>
          {question}
        </span>
        <span className={clsx(
          'shrink-0 w-6 h-6 rounded-full flex items-center justify-center border transition-colors',
          open ? 'bg-brand-orange border-brand-orange text-white' : 'border-bone text-slate group-hover:border-brand-orange/40',
        )}>
          <ChevronDown size={13} className={clsx('transition-transform duration-200', open && 'rotate-180')} />
        </span>
      </button>
      {/* Pure-CSS grid-rows expand/collapse — smoother than an instant
          conditional mount, and the answer stays in the DOM either way. */}
      <div className={clsx('grid transition-[grid-template-rows] duration-300 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <p id={id} className="text-[13px] text-slate leading-[1.75] pb-5 pe-9">{answer}</p>
        </div>
      </div>
    </div>
  );
}

function FaqSkeleton() {
  return (
    <div className="flex flex-col">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center justify-between gap-4 py-[18px] border-b border-bone last:border-b-0">
          <SkeletonBox height={14} width={`${55 + (i % 3) * 12}%`} rounded="4px" />
          <SkeletonBox height={24} width={24} rounded="999px" />
        </div>
      ))}
    </div>
  );
}

export function FaqPage() {
  usePageTitle('FAQ');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const categories = useFaqCategories();
  const { faqs, loading, error, refetch } = useFaqs(category || undefined, query);

  // Grouped by category only in the unfiltered "All" view (with no active
  // search) — once a specific category is picked, or a search is running,
  // the result set is already homogeneous/relevant enough for one flat list.
  const grouped = useMemo(() => {
    if (category || query || faqs.length === 0) return null;
    const map = new Map<string, Faq[]>();
    for (const f of faqs) {
      if (!map.has(f.category)) map.set(f.category, []);
      map.get(f.category)!.push(f);
    }
    return map;
  }, [faqs, category, query]);

  return (
    <div className="bg-cream min-h-full">
      {/* ── Hero ── */}
      <div className="text-center px-4 md:px-8 lg:px-12 pt-14 md:pt-20 pb-10 max-w-[720px] mx-auto">
        <Reveal delay={0}>
          <div className="w-12 h-12 rounded-xl bg-brand-pale-orange flex items-center justify-center mx-auto mb-5">
            <HelpCircle size={22} className="text-brand-orange" />
          </div>
        </Reveal>
        <SectionHeading
          title="Frequently asked questions"
          subtitle="Find answers about your account, orders, payments and more."
          align="center"
          size="lg"
          className="mb-8"
        />

        <Reveal delay={0.2}>
          <div className="flex items-center gap-[6px] border border-bone rounded-lg px-4 bg-white max-w-[440px] mx-auto transition-colors focus-within:border-brand-orange/50 focus-within:ring-2 focus-within:ring-brand-orange/10">
            <Search size={15} className="text-slate shrink-0" />
            <input
              placeholder="Search for a question…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="border-none outline-none text-[13px] py-[10px] w-full text-charcoal bg-transparent"
            />
          </div>
        </Reveal>
      </div>

      {/* ── Category filter ── */}
      {!query && categories.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 px-4 pb-10">
          <button
            onClick={() => setCategory('')}
            className={clsx(
              'px-4 py-[7px] rounded-full text-[12px] font-semibold cursor-pointer border capitalize transition-colors',
              category === '' ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-charcoal border-bone hover:border-brand-orange/40',
            )}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={clsx(
                'px-4 py-[7px] rounded-full text-[12px] font-semibold cursor-pointer border capitalize transition-colors',
                category === c ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-charcoal border-bone hover:border-brand-orange/40',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* ── FAQ list ── */}
      <div className="bg-white px-4 md:px-8 lg:px-12 py-10 border-t border-bone">
        <div className="max-w-[720px] mx-auto">
          {loading ? (
            <FaqSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-14">
              <p className="text-[13px] text-error text-center">{error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>Try again</Button>
            </div>
          ) : faqs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14">
              <div className="w-12 h-12 rounded-full bg-cream flex items-center justify-center">
                <HelpCircle size={22} className="text-slate" />
              </div>
              <p className="text-[13px] text-slate">No FAQs found{query ? ` for "${query}"` : ''}.</p>
            </div>
          ) : grouped ? (
            <div className="flex flex-col gap-9">
              {[...grouped.entries()].map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-[11px] font-bold text-brand-orange uppercase tracking-[0.08em] mb-1">{cat}</p>
                  <div>
                    {items.map(faq => <FaqAccordionItem key={faq._id} question={faq.question} answer={faq.answer} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {faqs.map(faq => (
                <FaqAccordionItem key={faq._id} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Still need help? ── */}
      <div className="px-4 md:px-8 lg:px-12 py-12 max-w-[720px] mx-auto">
        <Reveal>
          <PremiumCard className="p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-pale-orange flex items-center justify-center shrink-0">
                <LifeBuoy size={16} className="text-brand-orange" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-carbon">Still need help?</p>
                <p className="text-[12.5px] text-slate mt-0.5">Can't find what you're looking for? Our support team is here for you.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" icon={<MessageCircle size={13} />} className="shrink-0" onClick={() => navigate('/contact-us')}>
              Contact Us
            </Button>
          </PremiumCard>
        </Reveal>
      </div>
    </div>
  );
}
