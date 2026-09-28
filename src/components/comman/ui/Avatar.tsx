import { clsx } from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

type AvatarVariant = 'auto' | 'orange' | 'green' | 'blue' | 'purple' | 'pos';

interface AvatarProps {
  name:       string;
  size?:      number;
  className?: string;
  variant?:   AvatarVariant;
}

// ─── Color Palette ────────────────────────────────────────────────────────────

const PALETTE = [
  { bg: '#EAF2F8', text: '#0F3354' }, // orange
  { bg: '#EBF7EF', text: '#1E7A3C' }, // green
  { bg: '#E6F1FB', text: '#1A72C2' }, // blue
  { bg: '#EDE9FE', text: '#6D28D9' }, // purple
  { bg: '#FEF7E5', text: '#C08B1E' }, // yellow
  { bg: '#F3F4F6', text: '#374151' }, // gray
];

const FIXED: Record<string, { bg: string; text: string }> = {
  orange: { bg: '#EAF2F8', text: '#0F3354' },
  green:  { bg: '#EBF7EF', text: '#1E7A3C' },
  blue:   { bg: '#E6F1FB', text: '#1A72C2' },
  purple: { bg: '#EDE9FE', text: '#6D28D9' },
  pos:    { bg: '#2C2A28', text: '#174771' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function pickColor(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return PALETTE[code % PALETTE.length];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Avatar({ name, size = 32, className, variant = 'auto' }: AvatarProps) {
  const { bg, text } = variant === 'auto' ? pickColor(name) : FIXED[variant];
  const fontSize = Math.round(size * 0.35);

  return (
    <div
      className={clsx(
        'flex-shrink-0 flex items-center justify-center rounded-full font-bold',
        className,
      )}
      style={{ width: size, height: size, fontSize, background: bg, color: text }}
    >
      {getInitials(name)}
    </div>
  );
}