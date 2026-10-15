import { Link } from 'react-router-dom';
import { Baby } from 'lucide-react';
import { useT } from '@/contexts/languageCtx';
import { useChildren, childLevelLabel } from '@/hooks/useChildren';

/**
 * Slim "Shopping for: <child>" switcher shown on Home / Search / Category pages.
 * Renders nothing for guests, sellers, or buyers who have not saved a child.
 */
export function ShoppingForBar({ className = '' }: { className?: string }) {
  const t = useT();
  const { children, selected, select } = useChildren();
  if (children.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 text-[13.5px] text-carbon ${className}`}>
      <Baby size={16} className="text-brand-royal shrink-0" aria-hidden />
      <label htmlFor="shopping-for" className="font-semibold">{t('Shopping for:')}</label>
      <select
        id="shopping-for"
        value={selected?._id ?? ''}
        onChange={e => select(e.target.value)}
        className="rounded-full border border-bone bg-white ps-3 pe-8 py-[6px] min-h-10 text-[13.5px] text-carbon cursor-pointer max-w-[60vw]"
      >
        <option value="">{t('Everyone')}</option>
        {children.map(c => <option key={c._id} value={c._id}>{c.name} ({childLevelLabel(c)})</option>)}
      </select>
      <Link to="/account/children" className="text-[12.5px] text-slate underline underline-offset-4 hover:text-brand-orange">{t('Manage')}</Link>
    </div>
  );
}
