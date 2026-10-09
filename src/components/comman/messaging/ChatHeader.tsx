import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { ArrowLeft, Search } from 'lucide-react';
import { ActionMenu, type ActionMenuItem } from '@/components/comman/ui';
import { ChatAvatar } from './ChatAvatar';

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[2px] h-[10px]" aria-hidden>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-[4px] h-[4px] rounded-full bg-brand-orange animate-bounce"
          style={{ animationDelay: `${i * 120}ms`, animationDuration: '900ms' }}
        />
      ))}
    </span>
  );
}

export interface ChatHeaderShortcut { icon: ReactNode; label: string; onClick: () => void }

interface ChatHeaderProps {
  name:          string;
  image?:        string | null;
  online?:       boolean;
  typing?:       boolean;
  verified?:     boolean;
  /** Overrides the online/typing-derived subtitle (e.g. "Archived", "Muted"). */
  subtitleOverride?: string;
  menuItems:     ActionMenuItem[];
  onBack?:       () => void;
  onSearchClick?: () => void;
  searchActive?: boolean;
  shortcuts?:    ChatHeaderShortcut[];
}

// Thread header: a larger avatar + live status on the left, real quick
// actions (search, store/orders shortcuts) plus a single kebab menu for
// everything else — the same information hierarchy WhatsApp/Telegram use,
// without a fake call/video button since there's no calling backend here.
export function ChatHeader({
  name, image, online, typing, verified, subtitleOverride, menuItems, onBack, onSearchClick, searchActive, shortcuts,
}: ChatHeaderProps) {
  const subtitle = subtitleOverride ?? (typing ? 'typing' : online !== undefined ? (online ? 'Online' : 'Offline') : undefined);

  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-[#eeece4] px-3 md:px-4 py-[10px] flex items-center gap-[10px] shrink-0 sticky top-0 z-20">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back to conversations"
          className="md:hidden p-1 -ms-1 rounded-full hover:bg-cream cursor-pointer bg-transparent border-none text-charcoal outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
        >
          <ArrowLeft size={19} />
        </button>
      )}
      <ChatAvatar name={name} image={image} size={42} online={online} verified={verified} />
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-bold text-charcoal leading-[1.25] truncate">{name}</p>
        {subtitle && (
          <p className={clsx('text-[12px] truncate flex items-center gap-[5px]', typing ? 'text-brand-orange font-medium' : 'text-slate')}>
            {typing ? (<>Typing <TypingDots /></>) : subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-[2px] shrink-0">
        {shortcuts?.map((s, i) => (
          <button
            key={i}
            onClick={s.onClick}
            aria-label={s.label}
            title={s.label}
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full hover:bg-cream cursor-pointer bg-transparent border-none text-slate outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
          >
            {s.icon}
          </button>
        ))}
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            aria-label="Search in conversation"
            aria-pressed={searchActive}
            className={clsx(
              'w-9 h-9 flex items-center justify-center rounded-full cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40',
              searchActive ? 'bg-brand-pale-orange text-brand-orange' : 'hover:bg-cream bg-transparent text-slate',
            )}
          >
            <Search size={17} />
          </button>
        )}
        <ActionMenu items={menuItems} align="right" />
      </div>
    </div>
  );
}
