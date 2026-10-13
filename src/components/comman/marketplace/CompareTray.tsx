import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { Scale, X } from 'lucide-react';
import { useCompare } from '@/utils/compareStore';
import { useAdminEdit } from '@/contexts/adminEditCtx';
import { useT } from '@/contexts/languageCtx';

const HIDDEN_ON = /^\/(compare|checkout|cart|account|order-success|payment)(\/|$)/;

/** Floating tray of the products picked for comparison. Sits above the mobile bottom nav, centred (so it clears the
 *  quick-access rail on the end side) and lifts itself above the admin Edit-mode toolbar when that is showing. */
export function CompareTray() {
  const { items, remove, clear } = useCompare();
  const { pathname } = useLocation();
  const { editing } = useAdminEdit();
  const t = useT();
  if (!items.length || HIDDEN_ON.test(pathname)) return null;
  const ready = items.length >= 2;

  return (
    <div
      role="region"
      aria-label={t('Compare products')}
      className={clsx(
        'fixed inset-x-0 mx-auto z-[55] w-[calc(100%-1.5rem)] max-w-[620px] lg:w-[min(620px,calc(100%-9rem))] print:hidden',
        editing ? 'bottom-[132px] md:bottom-[68px]' : 'bottom-[76px] md:bottom-4',
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-white border border-bone shadow-[0_8px_30px_rgba(0,0,0,0.16)] ps-3 pe-2 py-2">
        <Scale size={16} className="text-brand-royal shrink-0 hidden sm:block" aria-hidden />
        <ul className="flex items-center gap-2 flex-1 min-w-0 list-none m-0 p-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map(it => (
            <li key={it.id} className="relative shrink-0">
              <div className="size-11 rounded-lg overflow-hidden bg-bone border border-bone flex items-center justify-center" title={it.name}>
                {it.image ? <img src={it.image} alt={it.name} className="w-full h-full object-cover" /> : <span className="text-[12px] font-bold text-slate">{it.name.slice(0, 2)}</span>}
              </div>
              <button
                type="button"
                onClick={() => remove(it.id)}
                aria-label={`${t('Remove')} ${it.name}`}
                className="absolute -top-1.5 -end-1.5 size-5 rounded-full bg-carbon text-white border-none flex items-center justify-center cursor-pointer"
              ><X size={11} aria-hidden /></button>
            </li>
          ))}
        </ul>
        <span className="text-[12px] text-slate tabular-nums shrink-0">{items.length}/4</span>
        <button type="button" onClick={clear} className="text-[12px] font-semibold text-slate underline bg-transparent border-none cursor-pointer shrink-0 hidden sm:block">{t('Clear')}</button>
        {ready ? (
          <Link to={`/compare?ids=${items.map(i => i.id).join(',')}`} className="shrink-0 rounded-full bg-brand-orange text-white no-underline px-4 py-2 text-[13px] font-bold hover:brightness-95">
            {t('Compare')}
          </Link>
        ) : (
          <span className="shrink-0 text-[12px] text-slate max-w-[96px] leading-tight">{t('Add 1 more to compare')}</span>
        )}
      </div>
    </div>
  );
}
