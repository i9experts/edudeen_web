import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Reveal } from './Reveal';

const SERIF = "Georgia, 'Times New Roman', serif";

interface SectionHeadingProps {
  kicker?:    string;
  title:      ReactNode;
  subtitle?:  ReactNode;
  align?:     'left' | 'center';
  /** 'dark' for headings sitting on a dark section background (carbon/mesh). */
  tone?:      'light' | 'dark';
  size?:      'md' | 'lg';
  className?: string;
}

// The one heading treatment every redesigned public section now shares — a
// small accent-dot kicker instead of a bare uppercase label, and a serif
// title, so "Add-ons", "Whatever you sell", "Frequently asked questions" etc.
// all read as the same design system instead of each page inventing its own
// heading style. Wraps its own `Reveal` so callers never hand-stagger a
// heading + subtitle pair.
export function SectionHeading({ kicker, title, subtitle, align = 'left', tone = 'light', size = 'md', className }: SectionHeadingProps) {
  const isDark = tone === 'dark';
  return (
    <Reveal className={clsx(align === 'center' && 'text-center', className)}>
      {kicker && (
        <div className={clsx('inline-flex items-center gap-2 mb-3', align === 'center' && 'justify-center')}>
          <span className={clsx('w-[6px] h-[6px] rounded-full', isDark ? 'bg-brand-orange' : 'bg-brand-orange')} />
          <span className={clsx('text-[11px] font-semibold uppercase tracking-[0.12em]', isDark ? 'text-brand-orange' : 'text-brand-deep-orange')}>
            {kicker}
          </span>
        </div>
      )}
      <h2
        className={clsx(
          'font-bold leading-[1.18] tracking-[-0.01em]',
          size === 'lg' ? 'text-[28px] sm:text-[36px] lg:text-[44px]' : 'text-[24px] sm:text-[30px]',
          isDark ? 'text-white' : 'text-carbon',
        )}
        style={{ fontFamily: SERIF }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={clsx('text-[14px] sm:text-[15px] leading-[1.6] mt-3', align === 'center' && 'mx-auto max-w-[560px]', isDark ? 'text-[#b0aea8]' : 'text-slate')}>
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
