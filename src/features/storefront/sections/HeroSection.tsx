import { useState } from 'react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cloudinaryUrl, cloudinarySrcSet } from '@/utils/cloudinaryImage';
import { useStorefront } from '../StorefrontContext';
import { ThemedButton } from '../ThemedButton';

export interface HeroSectionSettings {
  heightPreset?: 'small' | 'medium' | 'large';
}

interface HeroSlide {
  imageUrl:       string;
  mobileImageUrl?: string;
  heading?:       string;
  subheading?:    string;
  ctaText?:       string;
  ctaLink?:       { linkType: string; pageSlug?: string; url?: string };
}

const HEIGHT_CLASS: Record<string, string> = {
  small:  'min-h-[220px] sm:min-h-[280px]',
  medium: 'min-h-[300px] sm:min-h-[380px]',
  large:  'min-h-[400px] sm:min-h-[500px]',
};

function SlideNav({ blocks, index, setIndex }: { blocks: HeroSlide[]; index: number; setIndex: (fn: (i: number) => number) => void }) {
  if (blocks.length <= 1) return null;
  return (
    <>
      <button onClick={() => setIndex(i => (i - 1 + blocks.length) % blocks.length)} aria-label="Previous slide"
        className="absolute start-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center border-none cursor-pointer">
        <ChevronLeft size={18} />
      </button>
      <button onClick={() => setIndex(i => (i + 1) % blocks.length)} aria-label="Next slide"
        className="absolute end-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center border-none cursor-pointer">
        <ChevronRight size={18} />
      </button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {blocks.map((_, i) => (
          <button key={i} onClick={() => setIndex(() => i)} aria-label={`Slide ${i + 1}`}
            className="w-2 h-2 rounded-full border-none cursor-pointer p-0"
            style={{ background: i === index ? '#fff' : 'rgba(255,255,255,0.5)' }} />
        ))}
      </div>
    </>
  );
}

export function HeroSection({ settings, blocks }: { settings: HeroSectionSettings; blocks: HeroSlide[] }) {
  const { resolveLink, cfg } = useStorefront();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  if (blocks.length === 0) return null;
  const slide = blocks[index];
  const heightCls = HEIGHT_CLASS[settings.heightPreset ?? 'medium'];

  const goTo = (link?: HeroSlide['ctaLink']) => {
    if (!link) return;
    const { to, href } = resolveLink(link);
    if (to) navigate(to);
    else if (href) window.open(href, '_blank', 'noopener,noreferrer');
  };

  // 'split' — image on one side, text on the other, no dark overlay. A
  // genuinely different composition from 'overlay' (today's only look), not
  // just a recolor.
  if (cfg.heroStyle === 'split') {
    return (
      <div className={clsx('relative w-full flex flex-col md:flex-row overflow-hidden', heightCls)}>
        <div className="relative w-full md:w-1/2 min-h-[200px] md:min-h-0">
          <img
            key={slide.imageUrl}
            src={cloudinaryUrl(slide.imageUrl, 1024)}
            srcSet={cloudinarySrcSet(slide.imageUrl)}
            sizes="50vw"
            alt={slide.heading ?? ''}
            className="absolute inset-0 w-full h-full object-cover"
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        </div>
        <div
          className={clsx(
            'w-full md:w-1/2 flex flex-col justify-center gap-2 px-4 sm:px-6 lg:px-10 py-8 sm:py-12',
            cfg.heroAlignment === 'center' ? 'items-center text-center' : 'items-start text-start',
          )}
          style={{ background: cfg.bgColor }}
        >
          {slide.heading && <h1 className="text-[26px] sm:text-[34px] font-bold leading-tight" style={{ color: cfg.textColor }}>{slide.heading}</h1>}
          {slide.subheading && <p className="text-[13px] sm:text-[15px] mb-2" style={{ color: `${cfg.textColor}CC` }}>{slide.subheading}</p>}
          {slide.ctaText && <ThemedButton onClick={() => goTo(slide.ctaLink)}>{slide.ctaText}</ThemedButton>}
        </div>
        <SlideNav blocks={blocks} index={index} setIndex={setIndex} />
      </div>
    );
  }

  // 'overlay' — today's only look: full-bleed image + dark scrim + text
  // anchored to a corner (now alignment-aware instead of always bottom-left).
  return (
    <div className={clsx('relative w-full flex items-end overflow-hidden', heightCls)}>
      <img
        key={slide.imageUrl}
        src={cloudinaryUrl(slide.imageUrl, 1440)}
        srcSet={cloudinarySrcSet(slide.imageUrl)}
        sizes="100vw"
        alt={slide.heading ?? ''}
        className="absolute inset-0 w-full h-full object-cover"
        loading={index === 0 ? 'eager' : 'lazy'}
      />
      <div className="absolute inset-0 bg-black/35" />

      <div
        className={clsx(
          'relative px-4 sm:px-6 lg:px-10 py-8 sm:py-12 max-w-[640px]',
          cfg.heroAlignment === 'center' && 'mx-auto text-center',
        )}
      >
        {slide.heading && <h1 className="text-[26px] sm:text-[36px] font-bold text-white mb-2 leading-tight">{slide.heading}</h1>}
        {slide.subheading && <p className="text-[13px] sm:text-[15px] text-white/85 mb-4">{slide.subheading}</p>}
        {slide.ctaText && <ThemedButton onClick={() => goTo(slide.ctaLink)}>{slide.ctaText}</ThemedButton>}
      </div>

      <SlideNav blocks={blocks} index={index} setIndex={setIndex} />
    </div>
  );
}
