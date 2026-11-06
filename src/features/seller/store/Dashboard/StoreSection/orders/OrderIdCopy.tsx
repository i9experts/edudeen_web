import { Copy } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

/** Last 8 characters of an order id (shown in lists; the full id is in the tooltip and is what gets copied). */
export const shortOrderId = (id: string) => (id.length > 8 ? id.slice(-8) : id);

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/** Short monospace order id + copy icon. `full` shows the whole id (modal). */
export function OrderIdCopy({ orderNumber, full = false }: { orderNumber: string; full?: boolean }) {
  const toast = useToast();
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (await copyText(orderNumber)) toast.success('Copied');
    else toast.error('Could not copy');
  };
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" translate="no" onClick={e => e.stopPropagation()}>
      <span
        dir="ltr"
        className="text-[12px] font-bold text-brand-deep-orange font-mono"
        title={orderNumber}
      >
        {full ? orderNumber : shortOrderId(orderNumber)}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy order ID ${orderNumber}`}
        title="Copy order ID"
        className="inline-flex items-center justify-center size-6 rounded text-slate hover:text-charcoal hover:bg-cream bg-transparent border-0 cursor-pointer shrink-0"
      >
        <Copy size={13} />
      </button>
    </span>
  );
}
