import { useEffect, type ComponentType } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { useT } from '@/contexts/languageCtx';

export interface MoreSheetItem {
  id: string;
  label: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  active?: boolean;
  onSelect: () => void;
}
export interface MoreSheetGroup { label: string; items: MoreSheetItem[] }

/** Mobile "More" bottom sheet: every tool in a labelled icon grid, grouped. Used by the seller and admin bottom navs. */
export function MoreSheet({ open, onClose, groups, title = 'All tools' }: {
  open: boolean; onClose: () => void; groups: MoreSheetGroup[]; title?: string;
}) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t(title)}>
      <button type="button" aria-label={t('Close')} onClick={onClose} className="absolute inset-0 bg-carbon/40 border-0 cursor-default" />
      <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto bg-white rounded-t-2xl shadow-level-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-bone">
          <p className="text-[15px] font-semibold text-carbon">{t(title)}</p>
          <button type="button" onClick={onClose} aria-label={t('Close')} className="size-10 rounded-full flex items-center justify-center text-slate hover:bg-cream cursor-pointer bg-transparent border-0">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="px-4 pt-3 flex flex-col gap-4">
          {groups.map(g => (
            <section key={g.label}>
              <p className="text-[12px] font-bold text-brand-royal uppercase tracking-[0.12em] mb-2">{t(g.label)}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {g.items.map(it => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => { onClose(); it.onSelect(); }}
                    aria-current={it.active ? 'page' : undefined}
                    className={clsx(
                      'flex flex-col items-center justify-start gap-1.5 rounded-xl border px-1.5 py-3 min-h-[76px] cursor-pointer text-center transition-colors',
                      it.active ? 'bg-brand-pale-orange border-brand-orange/30' : 'bg-white border-bone hover:bg-cream',
                    )}
                  >
                    <it.Icon size={20} className={it.active ? 'text-brand-orange' : 'text-brand-royal'} />
                    <span className="text-[12px] leading-[1.25] font-medium text-charcoal">{t(it.label)}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
