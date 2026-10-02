import { useState, useRef, useEffect, useCallback, useId, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { clsx } from 'clsx';

export interface ActionMenuItem {
  label:     ReactNode;
  onClick:   () => void;
  icon?:     ReactNode;
  danger?:   boolean;
  disabled?: boolean;
  title?:    string;
}

interface ActionMenuProps {
  items:      ActionMenuItem[];
  align?:     'left' | 'right';
  className?: string;
  /** Replaces the default kebab-icon trigger button's content (e.g. a
   *  currency chip with a flag) — the button itself, its open/close
   *  state, positioning, and accessibility wiring are unchanged. */
  trigger?:        ReactNode;
  triggerClassName?: string;
  ariaLabel?:      string;
}

interface DropdownPos {
  top?:    number;
  bottom?: number;
  left?:   number;
  right?:  number;
}

// ── Portal dropdown ───────────────────────────────────────────────────────────
function DropdownPortal({
  items, pos, portalRef, onClose, menuId, triggerId,
}: {
  items:     ActionMenuItem[];
  pos:       DropdownPos;
  portalRef: React.RefObject<HTMLDivElement | null>;
  onClose:   () => void;
  menuId:    string;
  triggerId: string;
}) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => { itemRefs.current[0]?.focus(); }, []);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const count = items.length;
    const current = itemRefs.current.findIndex(el => el === document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      itemRefs.current[(current + 1 + count) % count]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      itemRefs.current[(current - 1 + count) % count]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return createPortal(
    <div
      ref={portalRef}
      id={menuId}
      role="menu"
      aria-labelledby={triggerId}
      onKeyDown={onKeyDown}
      className="fixed z-[9999] bg-white border border-bone rounded-[10px] py-1 min-w-[160px]"
      style={pos}
    >
      {items.map((item, i) => (
        <button
          key={i}
          ref={el => { itemRefs.current[i] = el; }}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          title={item.title}
          aria-disabled={item.disabled}
          onClick={e => { e.stopPropagation(); if (item.disabled) return; item.onClick(); onClose(); }}
          className={clsx(
            'w-full flex items-center gap-2 px-4 py-[9px] text-[13px] font-medium text-start border-none bg-transparent transition-colors',
            item.disabled
              ? 'text-slate/60 cursor-not-allowed'
              : item.danger
                ? 'text-error hover:bg-error-bg cursor-pointer'
                : 'text-carbon hover:bg-cream cursor-pointer',
          )}
        >
          {item.icon && <span className="shrink-0 opacity-70">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}

// ── Walk up the DOM to find the nearest clipping ancestor ────────────────────
function getContainerRect(el: HTMLElement): DOMRect {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.documentElement) {
    const { overflow, overflowX, overflowY } = getComputedStyle(node);
    if (/hidden|auto|scroll/.test(`${overflow}${overflowX}${overflowY}`)) {
      return node.getBoundingClientRect();
    }
    node = node.parentElement;
  }
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

// ── ActionMenu ────────────────────────────────────────────────────────────────
export function ActionMenu({ items, align = 'right', className, trigger, triggerClassName, ariaLabel }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState<DropdownPos>({});

  const btnRef    = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const menuId    = useId();

  const close = useCallback(() => { setOpen(false); btnRef.current?.focus(); }, []);

  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect          = btnRef.current.getBoundingClientRect();
    const container     = getContainerRect(btnRef.current);
    const ESTIMATED_H   = items.length * 42 + 8;
    const GAP           = 4;
    const spaceBelow    = container.bottom - rect.bottom;
    const spaceAbove    = rect.top - container.top;
    const openUpward    = spaceBelow < ESTIMATED_H + GAP && spaceAbove >= ESTIMATED_H;

    const next: DropdownPos = {};
    next[openUpward ? 'bottom' : 'top'] = openUpward
      ? window.innerHeight - rect.top + GAP
      : rect.bottom + GAP;

    next[align === 'right' ? 'right' : 'left'] = align === 'right'
      ? window.innerWidth - rect.right
      : rect.left;

    setPos(next);
  }, [items.length, align]);

  useEffect(() => {
    if (!open) return;

    calcPos();

    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      const insideBtn    = btnRef.current?.contains(t)    ?? false;
      const insidePortal = portalRef.current?.contains(t) ?? false;
      if (!insideBtn && !insidePortal) close();
    };

    const onScrollOrResize = () => close();

    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll',  onScrollOrResize, true);
    window.addEventListener('resize',  onScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll',  onScrollOrResize, true);
      window.removeEventListener('resize',  onScrollOrResize);
    };
  }, [open, calcPos, close]);

  return (
    <div className={clsx('relative inline-block', className)}>
      <button
        ref={btnRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel ?? 'Open actions menu'}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className={triggerClassName ?? clsx(
          'w-8 h-8 rounded-[7px] border flex items-center justify-center transition-colors cursor-pointer',
          open
            ? 'bg-brand-pale-orange border-brand-orange text-brand-orange'
            : 'bg-white border-bone text-slate hover:bg-cream hover:border-[#c5c4bc]',
        )}
      >
        {trigger ?? <MoreVertical size={15} />}
      </button>

      {open && (
        <DropdownPortal
          items={items}
          pos={pos}
          portalRef={portalRef}
          onClose={close}
          menuId={menuId}
          triggerId={triggerId}
        />
      )}
    </div>
  );
}
