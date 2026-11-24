import { useState, type ReactNode } from 'react';
import { useT } from '@/contexts/languageCtx';

// Seller description on the product page. Plain text only: every line is rendered as a React
// text node (never as HTML), so a tag typed by a seller shows as text and cannot run.
// Lines starting with "- ", "* " or "• " become a bullet list; "# Heading" or a short line ending
// with ":" becomes a small heading. Long text is clamped behind "Read more".

const BULLET = /^\s*(?:[-*•–]|\d+[.)])\s+(.*\S)\s*$/;
const MD_HEAD = /^\s*#{1,6}\s+(.*\S)\s*$/;
const LONG_AT = 700; // characters before the text is clamped

type Block = { kind: 'p' | 'h' | 'ul'; lines: string[] };

export function parseDescription(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of String(text ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) { blocks.push({ kind: 'p', lines: [] }); continue; } // blank line = paragraph break
    const b = BULLET.exec(line);
    const h = MD_HEAD.exec(line);
    const last = blocks[blocks.length - 1];
    if (b) {
      if (last?.kind === 'ul') last.lines.push(b[1]); else blocks.push({ kind: 'ul', lines: [b[1]] });
    } else if (h || (line.trim().length <= 60 && /[:：]$/.test(line.trim()))) {
      blocks.push({ kind: 'h', lines: [(h ? h[1] : line.trim()).replace(/[:：]$/, '')] });
    } else if (last?.kind === 'p' && last.lines.length) last.lines.push(line.trim());
    else blocks.push({ kind: 'p', lines: [line.trim()] });
  }
  return blocks.filter(b => b.lines.length);
}

export function ProductDescription({ text, className = '' }: { text: string; className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const long = text.length > LONG_AT;
  const body: ReactNode[] = parseDescription(text).map((b, i) => {
    if (b.kind === 'ul') return <ul key={i} className="list-disc ps-5 mb-3 flex flex-col gap-1">{b.lines.map((l, j) => <li key={j}>{l}</li>)}</ul>;
    if (b.kind === 'h') return <h3 key={i} className="text-[14px] font-bold text-carbon mt-4 mb-1.5">{b.lines[0]}</h3>;
    return <p key={i} className="mb-3">{b.lines.map((l, j) => <span key={j}>{j > 0 && <br />}{l}</span>)}</p>;
  });
  return (
    <div className={className}>
      <div id="product-description-text" className={`text-[14px] text-charcoal/80 leading-[1.8] max-w-[72ch] break-words ${long && !open ? 'max-h-[220px] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_65%,transparent)]' : ''}`}>
        {body}
      </div>
      {long && (
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="product-description-text"
          className="mt-1 mb-4 text-[13px] font-semibold text-brand-orange bg-transparent border-none p-0 cursor-pointer hover:underline min-h-[32px]">
          {open ? t('Show less') : t('Read more')}
        </button>
      )}
    </div>
  );
}
