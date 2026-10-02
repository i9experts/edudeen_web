import { useStorefront } from '../StorefrontContext';
import { ContentBlocks, type ContentBlock } from './ContentBlocks';

export interface RichTextSectionSettings {
  heading?:    string;
  alignment?:  'left' | 'center' | 'right';
}

// Content blocks are structured (not raw HTML) — a seller composes a
// paragraph/heading/image/quote/list per block, rendered safely here, rather
// than a WYSIWYG field that would need HTML sanitization on a page with zero
// platform chrome protecting it.
export function RichTextSection({ settings, blocks }: { settings: RichTextSectionSettings; blocks: ContentBlock[] }) {
  const { cfg } = useStorefront();
  const alignCls = { left: 'text-start items-start', center: 'text-center items-center', right: 'text-end items-end' }[settings.alignment ?? 'left'];

  return (
    <div className="px-4 sm:px-6 lg:px-10" style={{ paddingTop: 32 * cfg.sectionSpacingScale, paddingBottom: 32 * cfg.sectionSpacingScale }}>
      <div className={`mx-auto flex flex-col gap-4 ${alignCls}`} style={{ maxWidth: Math.round(720 * cfg.containerWidthScale) }}>
        {settings.heading && <h2 className="font-bold" style={{ color: cfg.textColor, fontSize: Math.round(22 * cfg.typeScaleFactor) }}>{settings.heading}</h2>}
        <ContentBlocks blocks={blocks} />
      </div>
    </div>
  );
}
