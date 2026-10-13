import { useState } from 'react';
import { clsx } from 'clsx';
import { Check, Scale } from 'lucide-react';
import { toCompareItem, useCompare, useCompareAvailable } from '@/utils/compareStore';
import { useT } from '@/contexts/languageCtx';

/** Small "Compare" toggle for product cards (pick 2-4 products, then open the Compare page from the tray). */
export function CompareToggle({ product, className }: { product: { _id: string; slug: string; name: string; images?: string[] }; className?: string }) {
  const { isSelected, toggle } = useCompare();
  const t = useT();
  const [full, setFull] = useState(false);
  const available = useCompareAvailable();
  const on = isSelected(product._id);
  if (!available) return null;
  const label = on ? t('Remove from compare') : full ? t('You can compare up to 4 products') : t('Compare');

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${label}: ${product.name}`}
      title={full ? t('You can compare up to 4 products') : t('Compare')}
      onClick={e => {
        e.preventDefault(); e.stopPropagation();
        const ok = toggle(toCompareItem(product));
        setFull(!ok);
        if (!ok) window.setTimeout(() => setFull(false), 2500);
      }}
      className={clsx(
        'size-8 rounded-full border flex items-center justify-center cursor-pointer transition-colors shrink-0',
        on ? 'bg-brand-royal border-brand-royal text-white' : 'bg-white border-[#dfe5e6] text-slate hover:text-brand-royal hover:border-brand-royal',
        full && 'border-error text-error',
        className,
      )}
    >
      {on ? <Check size={14} aria-hidden /> : <Scale size={14} aria-hidden />}
    </button>
  );
}
