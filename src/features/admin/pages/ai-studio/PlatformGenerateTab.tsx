import { useState } from 'react';
import { Search, Mail, ImagePlus, type LucideIcon } from 'lucide-react';
import { PlatformSeoTool } from './tools/PlatformSeoTool';
import { PlatformEmailTool } from './tools/PlatformEmailTool';
import { PlatformImageTool } from './tools/PlatformImageTool';

type PlatformTool = 'seo_booster' | 'email_campaigns' | 'image_enhancer';

const TOOLS: { id: PlatformTool; Icon: LucideIcon; title: string; desc: string }[] = [
  { id: 'seo_booster',     Icon: Search,    title: 'SEO Booster',     desc: 'Optimize titles/tags for landing pages & category content' },
  { id: 'email_campaigns', Icon: Mail,      title: 'Email Campaigns', desc: 'Draft platform-wide announcements & newsletters'            },
  { id: 'image_enhancer',  Icon: ImagePlus, title: 'Image Enhancer',  desc: 'Improve banner and marketing asset quality'                  },
];

export function PlatformGenerateTab() {
  const [activeTool, setActiveTool] = useState<PlatformTool>('seo_booster');

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[12px] text-slate bg-cream border border-bone rounded-lg px-4 py-3">
        These tools generate content for Edudeen's own marketplace — landing pages, platform announcements, and banners.
        Generations here never charge a seller's AI credit wallet.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TOOLS.map(tool => {
          const active = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className="text-left px-5 py-[18px] rounded-[10px] cursor-pointer transition-[border-color,background] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
              style={{
                border: `2px solid ${active ? '#174771' : '#E1E7EA'}`,
                background: active ? '#EAF2F8' : '#fff',
              }}
            >
              <div className="mb-[10px]" style={{ color: active ? '#0F3354' : '#64727B' }}>
                <tool.Icon size={22} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: active ? '#0F3354' : '#152D43' }}>{tool.title}</p>
              <p className="text-xs" style={{ color: active ? '#0F3354' : '#64727B' }}>{tool.desc}</p>
            </button>
          );
        })}
      </div>

      {activeTool === 'seo_booster'     && <PlatformSeoTool />}
      {activeTool === 'email_campaigns' && <PlatformEmailTool />}
      {activeTool === 'image_enhancer'  && <PlatformImageTool />}
    </div>
  );
}
