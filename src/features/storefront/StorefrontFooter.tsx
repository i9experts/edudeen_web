import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Music2 } from 'lucide-react';
import { useStorefront } from './StorefrontContext';
import { ThemedButton } from './ThemedButton';
import type { Block } from '@/api/services/storefrontTypes';

// `lucide-react` dropped brand/social icons in this version, so every
// platform mark here is a small hand-rolled glyph — intentionally simple,
// not a pixel-exact trademark logo (same spirit as the platform `Footer`'s
// own local glyph components).
function FacebookGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.25-1.5 1.55-1.5H16.7V3.7C16.4 3.66 15.4 3.57 14.24 3.57c-2.4 0-4.05 1.47-4.05 4.16V9.9H7.5V13h2.69v8h3.31Z" />
    </svg>
  );
}
function InstagramGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function YoutubeGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 9.2v5.6L15 12l-5-2.8Z" />
    </svg>
  );
}
function LinkedinGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="7.5" cy="8" r="1.3" />
      <path d="M6.7 10.7h1.6V17H6.7v-6.3Zm3.7 0h1.53v.86h.02c.21-.4.74-.86 1.52-.86 1.63 0 1.93 1.07 1.93 2.47V17h-1.6v-2.83c0-.68-.01-1.55-.94-1.55-.95 0-1.1.74-1.1 1.5V17h-1.6v-6.3Z" />
    </svg>
  );
}
function XGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.9 2H22l-7.6 8.7L23 22h-6.8l-5.3-6.9L4.8 22H1.7l8.1-9.3L1 2h7l4.8 6.3L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z" />
    </svg>
  );
}

const SOCIAL_ICON: Record<string, (size: number) => React.ReactNode> = {
  facebook:  s => <FacebookGlyph size={s} />,
  instagram: s => <InstagramGlyph size={s} />,
  x:         s => <XGlyph size={s} />,
  tiktok:    s => <Music2 size={s} />,
  youtube:   s => <YoutubeGlyph size={s} />,
  linkedin:  s => <LinkedinGlyph size={s} />,
  whatsapp:  s => <MessageCircle size={s} />,
};

function FooterLinkItem({ link, resolveLink }: { link: { label: string; linkType: string; pageSlug?: string; url?: string; highlight?: boolean }; resolveLink: ReturnType<typeof useStorefront>['resolveLink'] }) {
  const navigate = useNavigate();
  const { to, href } = resolveLink(link);

  if (link.highlight) {
    return (
      <ThemedButton size="sm" onClick={() => { if (to) navigate(to); else if (href) window.open(href, '_blank', 'noopener,noreferrer'); }}>
        {link.label}
      </ThemedButton>
    );
  }
  const cls = 'text-[12.5px] text-[#b0aea8] hover:text-white no-underline transition-colors';
  return to
    ? <Link to={to} className={cls}>{link.label}</Link>
    : <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{link.label}</a>;
}

// The seller's own footer — zero Edudeen branding. Driven entirely by
// `StoreTheme.footer.blocks` (footer_column / social_link / copyright_text).
// A store with no footer configured yet renders a minimal fallback (store
// name + a neutral copyright line) rather than any Edudeen content.
function SocialIcons({ socials }: { socials: Block[] }) {
  if (socials.length === 0) return null;
  return (
    <div className="flex items-center gap-3">
      {socials.map(b => (
        <a
          key={b._id ?? b.settings.platform}
          href={b.settings.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={b.settings.platform}
          className="w-8 h-8 rounded-full flex items-center justify-center border border-white/15 text-[#b0aea8] hover:text-white hover:border-white/30 transition-colors"
        >
          {(SOCIAL_ICON[b.settings.platform] ?? (() => null))(14)}
        </a>
      ))}
    </div>
  );
}

export function StorefrontFooter() {
  const { store, theme, cfg, resolveLink } = useStorefront();
  const blocks = theme?.footer?.blocks ?? [];

  const columns = blocks.filter(b => b.type === 'footer_column');
  const socials = blocks.filter(b => b.type === 'social_link');
  const copyright = blocks.find(b => b.type === 'copyright_text') as Block | undefined;
  const copyrightText = copyright?.settings.text ?? `© ${new Date().getFullYear()} ${store.name}. All rights reserved.`;

  // 'minimal' — one centered row (name + socials + copyright), no columns —
  // deliberately a different layout, not just the columns view with empty
  // columns.
  if (cfg.footerStyle === 'minimal') {
    return (
      <footer className="bg-carbon text-[#b0aea8]" style={{ fontFamily: `${cfg.font}, sans-serif` }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center text-center gap-3">
          <p className="text-white font-bold text-[16px]">{store.name}</p>
          <SocialIcons socials={socials} />
          <p className="text-[11.5px] text-[#8c8a86]">{copyrightText}</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-carbon text-[#b0aea8]" style={{ fontFamily: `${cfg.font}, sans-serif` }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(auto-fit,minmax(120px,1fr))] gap-8">
        <div>
          <p className="text-white font-bold text-[16px] mb-2">{store.name}</p>
          {store.description && <p className="text-[12.5px] leading-relaxed max-w-[320px] mb-4">{store.description}</p>}
          <SocialIcons socials={socials} />
        </div>

        {columns.map(col => (
          <div key={col._id ?? col.settings.heading}>
            <p className="text-white text-[12px] font-bold uppercase tracking-wide mb-3">{col.settings.heading}</p>
            <ul className="flex flex-col gap-2 list-none p-0 m-0">
              {(col.settings.links ?? []).map((link: any, i: number) => (
                <li key={i}><FooterLinkItem link={link} resolveLink={resolveLink} /></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4 text-[11.5px] text-[#8c8a86]">
          {copyrightText}
        </div>
      </div>
    </footer>
  );
}
