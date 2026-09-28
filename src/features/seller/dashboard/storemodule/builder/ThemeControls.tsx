import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import type { ThemeBorderRadius } from '@/api/services/storeTheme';
import { RADIUS_PX_MAP } from '@/features/storefront/StorefrontContext';

const RADIUS_OPTIONS: { value: ThemeBorderRadius; label: string }[] = [
  { value: 'none',   label: 'None' },
  { value: 'small',  label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large' },
  { value: 'full',   label: 'Full' },
];

/** Real rendered squares at each radius value — reused for every independent
 *  radius field (button/product-card/testimonial-card/image), never a
 *  shared control, so picking one never touches the others. */
export function RadiusPicker({ label, value, onChange }: {
  label: string; value: ThemeBorderRadius; onChange: (v: ThemeBorderRadius) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate mb-2">{label}</p>
      <div className="flex gap-3 flex-wrap">
        {RADIUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              'flex flex-col items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors',
              value === opt.value ? 'border-brand-orange bg-brand-pale-orange/30' : 'border-bone bg-white hover:bg-cream',
            )}
          >
            <span className="block w-9 h-9 bg-bone border border-slate/30" style={{ borderRadius: RADIUS_PX_MAP[opt.value] }} />
            <span className="text-[11px] font-medium text-charcoal">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** A real rendered sample per option (a mini button, a mini card) instead of
 *  a plain text pill — `renderPreview` supplies the actual visual, the
 *  surrounding selection chrome is shared across every use. */
export function StylePreviewPicker<T extends string>({ label, options, value, onChange, renderPreview }: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  renderPreview: (opt: T) => ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate mb-2">{label}</p>
      <div className="flex gap-3 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              'flex flex-col items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors',
              value === opt.value ? 'border-brand-orange bg-brand-pale-orange/30' : 'border-bone bg-white hover:bg-cream',
            )}
          >
            <span className="pointer-events-none">{renderPreview(opt.value)}</span>
            <span className="text-[11px] font-medium text-charcoal">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** A small icon or 2-frame schematic diagram per option — `icon` is any
 *  ReactNode (a lucide icon, or a tiny inline-SVG composition diagram). */
export function IconOptionPicker<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string; icon: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={opt.label}
            className={clsx(
              'flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border cursor-pointer transition-colors min-w-[64px]',
              value === opt.value ? 'border-brand-orange bg-brand-pale-orange/30 text-brand-deep-orange' : 'border-bone bg-white text-slate hover:bg-cream',
            )}
          >
            {opt.icon}
            <span className="text-[10.5px] font-medium text-charcoal">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** A segmented control with an ascending visual size cue (bars growing left
 *  to right) instead of plain text — for 2-3 option "how much of this"
 *  fields (compact/comfortable/spacious, cozy/relaxed, sm/md/lg). */
export function ScaleSegmentPicker<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt, i) => {
          const barHeights = options.map((_, j) => 5 + j * 4);
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={clsx(
                'flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border cursor-pointer transition-colors',
                selected ? 'border-brand-orange bg-brand-pale-orange/30' : 'border-bone bg-white hover:bg-cream',
              )}
            >
              <span className="flex items-end gap-[3px] h-[17px]">
                {barHeights.map((h, j) => (
                  <span
                    key={j}
                    className="w-[5px] rounded-[1px]"
                    style={{ height: h, background: j <= i ? (selected ? '#174771' : '#B8B5AC') : '#E5E2D9' }}
                  />
                ))}
              </span>
              <span className="text-[11px] font-medium text-charcoal">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Small inline-SVG composition diagrams for the layout-shaped enum fields
// (header/hero/testimonial/faq/footer/image-ratio/hover/button-width) that
// don't have an obvious existing lucide icon — each is a literal miniature
// of the two layouts being chosen between, using currentColor so it inherits
// the picker's selected/unselected color automatically. ──

export function DiagramHeaderStandard() {
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
      <circle cx="5" cy="5" r="2.5" fill="currentColor" />
      <rect x="11" y="4" width="6" height="2" rx="1" fill="currentColor" opacity="0.55" />
      <rect x="19" y="4" width="6" height="2" rx="1" fill="currentColor" opacity="0.55" />
      <rect x="0" y="14" width="30" height="4" rx="1" fill="currentColor" opacity="0.18" />
    </svg>
  );
}
export function DiagramHeaderCentered() {
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
      <circle cx="15" cy="5" r="2.5" fill="currentColor" />
      <rect x="8" y="11" width="6" height="2" rx="1" fill="currentColor" opacity="0.55" />
      <rect x="16" y="11" width="6" height="2" rx="1" fill="currentColor" opacity="0.55" />
      <rect x="0" y="16" width="30" height="2" rx="1" fill="currentColor" opacity="0.18" />
    </svg>
  );
}
export function DiagramHeroOverlay() {
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
      <rect x="0" y="0" width="30" height="20" rx="2" fill="currentColor" opacity="0.18" />
      <rect x="4" y="12" width="14" height="2.5" rx="1" fill="currentColor" />
      <rect x="4" y="16" width="8" height="2" rx="1" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
export function DiagramHeroSplit() {
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
      <rect x="0" y="0" width="14" height="20" rx="2" fill="currentColor" opacity="0.18" />
      <rect x="17" y="6" width="13" height="2.5" rx="1" fill="currentColor" />
      <rect x="17" y="10.5" width="9" height="2" rx="1" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
export function DiagramTestimonialCards() {
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
      <rect x="0" y="2" width="8.5" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="10.75" y="2" width="8.5" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="21.5" y="2" width="8.5" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
export function DiagramTestimonialMinimal() {
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
      <rect x="7" y="3" width="16" height="2" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="4" y="7" width="22" height="1.5" rx="0.75" fill="currentColor" opacity="0.35" />
      <line x1="2" y1="12" x2="28" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <rect x="7" y="15" width="16" height="2" rx="1" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
export function DiagramAccordion() {
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
      <rect x="0" y="1" width="30" height="5" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="0" y="8" width="30" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <rect x="0" y="15" width="30" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}
export function DiagramListExpanded() {
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
      <rect x="0" y="0" width="30" height="5.5" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="0" y="6.5" width="24" height="2" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="0" y="10.5" width="30" height="5.5" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="0" y="17" width="20" height="2" rx="1" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
export function DiagramFooterColumns() {
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
      {[0, 1, 2].map(i => (
        <g key={i} transform={`translate(${i * 10.5}, 0)`}>
          <rect x="0" y="0" width="7" height="2" rx="1" fill="currentColor" opacity="0.7" />
          <rect x="0" y="4" width="7" height="1.4" rx="0.7" fill="currentColor" opacity="0.35" />
          <rect x="0" y="7" width="7" height="1.4" rx="0.7" fill="currentColor" opacity="0.35" />
          <rect x="0" y="10" width="7" height="1.4" rx="0.7" fill="currentColor" opacity="0.35" />
        </g>
      ))}
    </svg>
  );
}
export function DiagramFooterMinimal() {
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
      <rect x="9" y="8" width="12" height="2" rx="1" fill="currentColor" opacity="0.7" />
      <circle cx="11" cy="14" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="19" cy="14" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
export function DiagramImageSquare() {
  return <svg width="22" height="18" viewBox="0 0 22 18" fill="none"><rect x="2" y="1" width="16" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
export function DiagramImagePortrait() {
  return <svg width="22" height="18" viewBox="0 0 22 18" fill="none"><rect x="5" y="0" width="11" height="18" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
export function DiagramHoverNone() {
  return <svg width="22" height="18" viewBox="0 0 22 18" fill="none"><rect x="3" y="2" width="16" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
export function DiagramHoverZoom() {
  return (
    <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
      <rect x="1" y="0" width="16" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <rect x="4" y="3" width="16" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
export function DiagramButtonAuto() {
  return <svg width="30" height="14" viewBox="0 0 30 14" fill="none"><rect x="6" y="3" width="12" height="8" rx="2" fill="currentColor" /></svg>;
}
export function DiagramButtonFull() {
  return <svg width="30" height="14" viewBox="0 0 30 14" fill="none"><rect x="0" y="3" width="30" height="8" rx="2" fill="currentColor" /></svg>;
}
