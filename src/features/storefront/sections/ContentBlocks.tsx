import { useStorefront } from '../StorefrontContext';

export interface ContentBlock {
  // Loose on purpose (matches the backend's `Block.type: string`) — the
  // switch below safely no-ops on anything outside the known content-block
  // vocabulary rather than needing every caller to narrow the type first.
  type:      string;
  settings:  Record<string, any>;
}

/** Shared renderer for the `paragraph|heading|image|quote|list|divider` block set — used by both `RichTextSection` and blog post bodies, which share the exact same content-block vocabulary. */
export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  const { cfg } = useStorefront();

  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return <p key={i} className="text-[18px] font-bold" style={{ color: cfg.textColor }}>{block.settings.text}</p>;
          case 'paragraph':
            return <p key={i} className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: cfg.textColor }}>{block.settings.text}</p>;
          case 'image':
            return <img key={i} src={block.settings.imageUrl} alt={block.settings.alt ?? ''} className="max-w-full rounded-lg" />;
          case 'quote':
            return (
              <blockquote key={i} className="border-s-4 ps-4 italic text-[15px]" style={{ borderColor: cfg.primaryColor, color: cfg.textColor }}>
                “{block.settings.text}”
                {block.settings.author && <footer className="not-italic text-[12px] mt-1 opacity-70">— {block.settings.author}</footer>}
              </blockquote>
            );
          case 'list':
            return block.settings.style === 'numbered' ? (
              <ol key={i} className="list-decimal ps-5 flex flex-col gap-1 text-[14px]" style={{ color: cfg.textColor }}>
                {(block.settings.items ?? []).map((item: string, j: number) => <li key={j}>{item}</li>)}
              </ol>
            ) : (
              <ul key={i} className="list-disc ps-5 flex flex-col gap-1 text-[14px]" style={{ color: cfg.textColor }}>
                {(block.settings.items ?? []).map((item: string, j: number) => <li key={j}>{item}</li>)}
              </ul>
            );
          case 'divider':
            return <hr key={i} className="border-t" style={{ borderColor: `${cfg.textColor}22` }} />;
          default:
            return null;
        }
      })}
    </>
  );
}
