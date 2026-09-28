import { clsx } from 'clsx';

interface LogoProps {
  size?:          number;
  showWordmark?:  boolean;
  className?:     string;
  variant?:       'dark' | 'light';
}

// Brand artwork lives in /public: `edudeen-mark.png` is the hexagon/minaret
// mark on its own (≈0.8:1), `edudeen-logo.png` is the full lockup with the
// "Your partner in Tarbiyyah" tagline (≈2.62:1, navy wordmark — only legible
// on a light surface).
const MARK_RATIO = 800 / 1000;
const LOCKUP_RATIO = 2048 / 782;

export function EdudeenIcon({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/edudeen-mark.png"
      alt="Edudeen"
      width={Math.round(size * MARK_RATIO)}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: Math.round(size * MARK_RATIO), height: size }}
      draggable={false}
    />
  );
}

export function EdudeenLogo({ size = 32, showWordmark = true, className, variant = 'dark' }: LogoProps) {
  if (!showWordmark) {
    return <div className={clsx('flex items-center', className)}><EdudeenIcon size={size} /></div>;
  }

  // The full lockup's navy wordmark disappears on dark surfaces, so the light
  // variant pairs the mark with a white text wordmark instead.
  if (variant === 'light') {
    const textSize = Math.round(size * 0.53);
    return (
      <div className={clsx('flex items-center gap-2', className)}>
        <EdudeenIcon size={size} />
        <div className="flex items-center tracking-wide" style={{ fontSize: textSize }}>
          <span className="font-normal text-white">EDU</span>
          <span className="font-extrabold text-white">DEEN</span>
        </div>
      </div>
    );
  }

  // Lockup is drawn taller than `size` since the tagline eats the bottom third.
  const height = Math.round(size * 1.5);
  return (
    <div className={clsx('flex items-center', className)}>
      <img
        src="/edudeen-logo.png"
        alt="Edudeen — Your partner in Tarbiyyah"
        width={Math.round(height * LOCKUP_RATIO)}
        height={height}
        className="shrink-0 object-contain"
        style={{ width: Math.round(height * LOCKUP_RATIO), height }}
        draggable={false}
      />
    </div>
  );
}
