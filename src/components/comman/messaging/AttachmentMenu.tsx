import { useRef, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Paperclip, Image as ImageIcon, FileText, Camera, ShoppingBag } from 'lucide-react';

interface AttachmentMenuProps {
  onFileSelected: (file: File) => void;
  onShareProduct?: () => void;
  disabled?: boolean;
}

interface MenuAction {
  icon:  typeof ImageIcon;
  label: string;
  bg:    string;
  fg:    string;
  onClick: () => void;
}

// WhatsApp-style attach popover: distinct entry points for Photo/Video,
// Document, Camera, and (when the conversation has a store to browse)
// Share Product — instead of one paperclip that opens a single generic
// file picker.
export function AttachmentMenu({ onFileSelected, onShareProduct, disabled }: AttachmentMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);
  const docRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onFileSelected(file);
  };

  const actions: MenuAction[] = [
    { icon: ImageIcon,   label: 'Photo & Video', bg: '#EEF7FF', fg: '#1A65A8', onClick: () => mediaRef.current?.click() },
    { icon: FileText,    label: 'Document',      bg: '#F3F0FF', fg: '#6D28D9', onClick: () => docRef.current?.click() },
    { icon: Camera,      label: 'Camera',        bg: '#FFF4DC', fg: '#B36200', onClick: () => cameraRef.current?.click() },
    ...(onShareProduct ? [{ icon: ShoppingBag, label: 'Share Product', bg: '#EAF2F8', fg: '#0F3354', onClick: onShareProduct }] : []),
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        aria-label="Attach"
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx(
          'w-9 h-9 shrink-0 flex items-center justify-center rounded-full cursor-pointer border-none bg-transparent transition-colors disabled:opacity-50',
          open ? 'text-brand-orange bg-brand-pale-orange' : 'text-slate hover:bg-bone',
        )}
      >
        <Paperclip size={17} className={clsx('transition-transform', open && 'rotate-45')} />
      </button>

      {open && (
        <div role="menu" className="absolute bottom-[46px] end-0 z-50 w-[190px] bg-white border border-bone rounded-[14px] p-[6px] transition-all duration-150 ease-out starting:opacity-0 starting:translate-y-1">
          {actions.map(a => (
            <button
              key={a.label}
              role="menuitem"
              type="button"
              onClick={() => { a.onClick(); setOpen(false); }}
              className="w-full flex items-center gap-[10px] px-[10px] py-[9px] rounded-[9px] text-[13px] font-medium text-charcoal hover:bg-cream cursor-pointer bg-transparent border-none text-start"
            >
              <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: a.bg, color: a.fg }}>
                <a.icon size={15} />
              </span>
              {a.label}
            </button>
          ))}
        </div>
      )}

      <input ref={mediaRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFile} />
      <input ref={docRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.zip,.xls,.xlsx,.ppt,.pptx,.txt" onChange={handleFile} />
      <input ref={cameraRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFile} />
    </div>
  );
}
