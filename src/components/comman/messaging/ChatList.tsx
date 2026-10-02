import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Search, SquarePen, X, MessagesSquare, Clock } from 'lucide-react';
import { EmptyState, SkeletonBox } from '@/components/comman/ui';
import type { MessageType } from '@/api/services/messaging';
import { ChatListItem } from './ChatListItem';

export interface ChatListEntry {
  id:           string;
  name:         string;
  image?:       string | null;
  preview:      string;
  previewType?: MessageType;
  own?:         boolean;
  seen?:        boolean;
  time:         string;
  unread:       number;
  pinned?:      boolean;
  muted?:       boolean;
  archived?:    boolean;
  online?:      boolean;
  verified?:    boolean;
}

export interface ChatListFilter { id: string; label: string; count?: number }

interface ChatListProps {
  title:          string;
  entries:        ChatListEntry[];
  activeId:       string | null;
  onSelect:       (id: string) => void;
  query:          string;
  onQueryChange:  (v: string) => void;
  loading:        boolean;
  error?:         string;
  onNew?:         () => void;

  filters?:        ChatListFilter[];
  activeFilter?:   string;
  onFilterChange?: (id: string) => void;

  recentSearches?:       string[];
  onSelectRecentSearch?: (q: string) => void;
  onClearRecentSearches?: () => void;
  onCommitSearch?:       (q: string) => void;

  /** Persist a user-resized width across sessions (desktop only). Omit to disable resizing. */
  resizeStorageKey?: string;
}

const MIN_W = 280;
const MAX_W = 480;
const DEFAULT_W = 340;

function useResizableWidth(storageKey: string | undefined, rootRef: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(() => {
    if (!storageKey) return DEFAULT_W;
    const saved = Number(localStorage.getItem(storageKey));
    return saved >= MIN_W && saved <= MAX_W ? saved : DEFAULT_W;
  });
  const dragging = useRef(false);

  useEffect(() => {
    if (!storageKey) return;
    const key = storageKey;
    function onMove(e: PointerEvent) {
      if (!dragging.current || !rootRef.current) return;
      // Width relative to the panel's own left edge — the panel isn't
      // necessarily flush against the viewport (it may sit right of a
      // seller/account sidebar), so raw clientX would be wrong.
      const left = rootRef.current.getBoundingClientRect().left;
      setWidth(Math.min(MAX_W, Math.max(MIN_W, e.clientX - left)));
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setWidth(w => { localStorage.setItem(key, String(w)); return w; });
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [storageKey, rootRef]);

  const startDrag = () => {
    if (!storageKey) return;
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return { width, startDrag, resizable: !!storageKey };
}

// The left-hand thread list: filter chips, a search field (with a recent-
// searches dropdown when focused+empty, Instagram-style), then the list
// itself — plus an optional drag handle to resize the pane on desktop.
export function ChatList({
  title, entries, activeId, onSelect, query, onQueryChange, loading, error, onNew,
  filters, activeFilter, onFilterChange,
  recentSearches, onSelectRecentSearch, onClearRecentSearches, onCommitSearch,
  resizeStorageKey,
}: ChatListProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { width, startDrag, resizable } = useResizableWidth(resizeStorageKey, rootRef);
  const showRecent = searchFocused && query.trim().length === 0 && !!recentSearches?.length;

  return (
    <div
      ref={rootRef}
      className="w-full md:w-[var(--list-w)] md:shrink-0 border-e border-[#eeece4] flex flex-col bg-white h-full relative"
      style={{ '--list-w': `${width}px` } as React.CSSProperties}
    >
        <div className="px-4 pt-4 pb-[10px] flex items-center justify-between shrink-0">
          <h2 className="text-[18px] font-bold text-charcoal">{title}</h2>
          {onNew && (
            <button
              onClick={onNew}
              aria-label="New message"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cream cursor-pointer bg-transparent border-none text-charcoal outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
            >
              <SquarePen size={19} />
            </button>
          )}
        </div>

        <div className="px-4 pb-[10px] relative shrink-0">
          <div className={clsx(
            'flex items-center gap-[8px] bg-cream rounded-full px-[12px] py-[8px] border transition-colors',
            searchFocused ? 'border-brand-orange/50' : 'border-transparent',
          )}>
            <Search size={15} className="text-slate shrink-0" />
            <input
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => { setSearchFocused(false); if (query.trim()) onCommitSearch?.(query); }}
              onKeyDown={e => { if (e.key === 'Enter' && query.trim()) onCommitSearch?.(query); }}
              placeholder="Search"
              aria-label="Search conversations"
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-charcoal"
            />
            {query.length > 0 && (
              <button
                onClick={() => onQueryChange('')}
                aria-label="Clear search"
                className="p-0.5 rounded-full hover:bg-bone cursor-pointer bg-transparent border-none text-slate shrink-0"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {showRecent && (
            <div className="absolute start-4 end-4 top-full mt-1 z-20 bg-white border border-bone rounded-[12px] py-2 overflow-hidden">
              <div className="flex items-center justify-between px-3 pb-1.5">
                <span className="text-[10.5px] font-semibold text-slate uppercase tracking-[0.05em]">Recent</span>
                {onClearRecentSearches && (
                  <button
                    onMouseDown={e => e.preventDefault()}
                    onClick={onClearRecentSearches}
                    className="text-[11px] text-brand-orange font-medium bg-transparent border-none cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              {recentSearches!.map(r => (
                <button
                  key={r}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => onSelectRecentSearch?.(r)}
                  className="w-full flex items-center gap-2 px-3 py-[8px] text-[13px] text-charcoal hover:bg-cream cursor-pointer bg-transparent border-none text-start"
                >
                  <Clock size={13} className="text-slate shrink-0" />
                  <span className="truncate">{r}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {filters && filters.length > 0 && (
          <div role="tablist" aria-label="Conversation filters" className="flex items-center gap-[6px] px-4 pb-[10px] overflow-x-auto shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.map(f => {
              const active = f.id === activeFilter;
              return (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => onFilterChange?.(f.id)}
                  className={clsx(
                    'shrink-0 flex items-center gap-[5px] px-[12px] py-[6px] rounded-full text-[12px] font-semibold border cursor-pointer transition-colors',
                    active ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-slate border-bone hover:bg-cream',
                  )}
                >
                  {f.label}
                  {!!f.count && (
                    <span className={clsx('text-[10px] px-[5px] py-[1px] rounded-full font-bold', active ? 'bg-white/25 text-white' : 'bg-bone text-charcoal')}>
                      {f.count > 99 ? '99+' : f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">
          {loading ? (
            <div className="p-3 flex flex-col gap-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 px-1">
                  <SkeletonBox width={50} height={50} rounded="50%" />
                  <div className="flex-1 flex flex-col gap-[8px]">
                    <SkeletonBox width="60%" height={13} />
                    <SkeletonBox width="85%" height={11} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="p-4 text-[12px] text-error text-center">{error}</p>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={<MessagesSquare size={26} className="text-brand-orange opacity-55" />}
              title={query.trim() ? 'No matches' : 'No conversations yet'}
              description={query.trim() ? 'Try a different search term.' : 'Start a conversation to see it here.'}
              className="py-10"
            />
          ) : (
            entries.map(entry => (
              <ChatListItem
                key={entry.id}
                name={entry.name}
                image={entry.image}
                preview={entry.preview}
                previewType={entry.previewType}
                own={entry.own}
                seen={entry.seen}
                time={entry.time}
                unread={entry.unread}
                pinned={entry.pinned}
                muted={entry.muted}
                archived={entry.archived}
                online={entry.online}
                verified={entry.verified}
                active={entry.id === activeId}
                onClick={() => onSelect(entry.id)}
              />
            ))
          )}
        </div>

      {resizable && (
        <div
          onPointerDown={startDrag}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize conversation list"
          className="hidden md:block absolute top-0 bottom-0 end-0 z-10 w-[5px] cursor-col-resize hover:bg-brand-orange/20 active:bg-brand-orange/30 transition-colors"
        />
      )}
    </div>
  );
}
