import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowBigUp, Delete, Keyboard } from 'lucide-react';
import { clsx } from 'clsx';
import { Textarea } from './Input';
import { KEYBOARD_ROWS, URDU_PHONETIC, phoneticChar } from '@/utils/urduKeyboard';

/**
 * A textarea for writing Urdu the InPage way: with phonetic typing ON, English keys type Urdu letters by sound
 * (k = ک, Shift+K = خ, s = س, Shift+S = ش …). Switch it OFF to type English words, or use a real Urdu
 * keyboard (those letters pass through untouched). The on-screen keyboard lets phone users tap the letters.
 */
export function UrduTextarea({ value, onChange, label, rows = 5, maxLength, placeholder, className }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<number | null>(null);
  const [phonetic, setPhonetic] = useState(true);
  const [panel, setPanel] = useState(false);
  const [shift, setShift] = useState(false);

  // After a programmatic edit, put the cursor right after the inserted text.
  useLayoutEffect(() => {
    if (caret.current !== null && ref.current) { ref.current.setSelectionRange(caret.current, caret.current); caret.current = null; }
  });

  const insert = (text: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    // execCommand keeps the browser's own undo history (Ctrl+Z) and fires a normal input event.
    if (document.execCommand('insertText', false, text)) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const next = value.slice(0, s) + text + value.slice(e);
    if (maxLength && next.length > maxLength) return;
    caret.current = s + text.length;
    onChange(next);
  };

  const backspace = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (document.execCommand('delete')) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const from = s === e ? Math.max(0, s - 1) : s;
    caret.current = from;
    onChange(value.slice(0, from) + value.slice(e));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!phonetic || e.nativeEvent.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.currentTarget;
    const ch = phoneticChar(e.key, el.value[el.selectionStart - 1] ?? '');
    if (!ch) return;
    e.preventDefault();
    insert(ch);
  };

  // Keys on the panel must not steal focus from the textarea.
  const keep = (e: React.MouseEvent) => e.preventDefault();
  const keyCls = 'min-w-9 h-10 px-1 rounded-lg border border-bone bg-white text-carbon cursor-pointer hover:bg-cream active:bg-brand-pale-orange flex flex-col items-center justify-center leading-none';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="inline-flex items-center gap-2 text-[12.5px] text-charcoal cursor-pointer">
          <input type="checkbox" checked={phonetic} onChange={e => setPhonetic(e.target.checked)} className="accent-brand-orange" />
          <span>Type Urdu with English keys <span className="text-slate">(like InPage: k = <span className="font-urdu">ک</span>, Shift+K = <span className="font-urdu">خ</span>)</span></span>
        </label>
        <button type="button" aria-expanded={panel} onClick={() => setPanel(p => !p)}
          className="ms-auto inline-flex items-center gap-1 bg-transparent border-none cursor-pointer text-[12.5px] font-semibold text-brand-orange">
          <Keyboard size={14} aria-hidden /> {panel ? 'Hide keyboard' : 'Show keyboard'}
        </button>
      </div>

      <Textarea
        ref={ref} aria-label={label} rows={rows} dir="rtl" lang="ur" maxLength={maxLength} placeholder={placeholder}
        className={clsx('font-urdu', className)} value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown}
      />

      {panel && (
        <div role="group" aria-label="Urdu keyboard" dir="ltr" className="rounded-lg border border-bone bg-cream/60 p-2 flex flex-col gap-1.5 select-none">
          {KEYBOARD_ROWS.map(row => (
            <div key={row} className="flex justify-center gap-1">
              {[...row].map(k => {
                const key = shift ? k.toUpperCase() : k;
                return (
                  <button key={k} type="button" onMouseDown={keep} onClick={() => insert(URDU_PHONETIC[key])} className={keyCls} aria-label={`${key} types ${URDU_PHONETIC[key]}`}>
                    <span className="font-urdu text-[17px] leading-[1.4]">{URDU_PHONETIC[key]}</span>
                    <span className="text-[9.5px] text-slate uppercase">{k}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <div className="flex justify-center gap-1 flex-wrap">
            <button type="button" onMouseDown={keep} onClick={() => setShift(s => !s)} aria-pressed={shift} aria-label="Shift: heavier letters"
              className={clsx(keyCls, 'px-3', shift && 'bg-carbon text-white hover:bg-carbon')}><ArrowBigUp size={16} /></button>
            {['،', '۔', '؟', '؛'].map(p => (
              <button key={p} type="button" onMouseDown={keep} onClick={() => insert(p)} className={keyCls}><span className="font-urdu text-[17px]">{p}</span></button>
            ))}
            <button type="button" onMouseDown={keep} onClick={() => insert(' ')} aria-label="Space" className={clsx(keyCls, 'px-10')}><span className="text-[11px] text-slate">space</span></button>
            <button type="button" onMouseDown={keep} onClick={() => insert('\n')} aria-label="New line" className={clsx(keyCls, 'px-3')}><span className="text-[11px] text-slate">enter</span></button>
            <button type="button" onMouseDown={keep} onClick={backspace} aria-label="Backspace" className={clsx(keyCls, 'px-3')}><Delete size={16} /></button>
          </div>
          <p className="m-0 text-center text-[11.5px] text-slate">Tap a letter to type it. Use Shift for the heavier letter (ٹ ڈ ڑ ش خ غ ں ھ …).</p>
        </div>
      )}
    </div>
  );
}
