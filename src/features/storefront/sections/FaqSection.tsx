import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useStorefront } from '../StorefrontContext';

interface FaqBlock {
  question: string;
  answer:   string;
}

export function FaqSection({ settings, blocks }: { settings: { heading?: string }; blocks: FaqBlock[] }) {
  const { cfg } = useStorefront();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  if (blocks.length === 0) return null;

  const isList = cfg.faqStyle === 'list';

  return (
    <div className="px-4 sm:px-6 lg:px-10" style={{ paddingTop: 32 * cfg.sectionSpacingScale, paddingBottom: 32 * cfg.sectionSpacingScale }}>
      <div className="mx-auto" style={{ maxWidth: Math.round(720 * cfg.containerWidthScale) }}>
        {settings.heading && <h2 className="font-bold mb-5" style={{ color: cfg.textColor, fontSize: Math.round(20 * cfg.typeScaleFactor) }}>{settings.heading}</h2>}
        <div className="flex flex-col divide-y" style={{ borderColor: `${cfg.textColor}15` }}>
          {blocks.map((item, i) => {
            const open = isList || openIndex === i;
            return (
              <div key={i} className="py-3">
                {isList ? (
                  <span className="block text-[14px] font-semibold py-1" style={{ color: cfg.textColor }}>{item.question}</span>
                ) : (
                  <button
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="w-full flex items-center justify-between gap-3 text-start bg-transparent border-none cursor-pointer py-1"
                  >
                    <span className="text-[14px] font-semibold" style={{ color: cfg.textColor }}>{item.question}</span>
                    <ChevronDown size={16} className={clsx('shrink-0 transition-transform duration-200', open && 'rotate-180')} style={{ color: cfg.textColor }} />
                  </button>
                )}
                {open && <p className="text-[13px] leading-relaxed mt-2 opacity-80" style={{ color: cfg.textColor }}>{item.answer}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
