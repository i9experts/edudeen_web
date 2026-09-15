import { useState } from 'react';
import {
  PenLine, TrendingUp, BookOpen, Search, Mail, ImagePlus, type LucideIcon,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { useAiStudioCredits } from '@/hooks/seller/useAiStudio';
import { CreditsHeader } from './components/CreditsHeader';
import { ListingWriterTool } from './tools/ListingWriterTool';
import { SeoBoosterTool } from './tools/SeoBoosterTool';
import { EmailCampaignsTool } from './tools/EmailCampaignsTool';
import { WorksheetBuilderTool } from './tools/WorksheetBuilderTool';
import { PriceOptimizerTool } from './tools/PriceOptimizerTool';
import { ImageEnhancerTool } from './tools/ImageEnhancerTool';
import type { AiToolType } from '@/api/services/aiStudio';

const TOOLS: { id: AiToolType; Icon: LucideIcon; title: string; desc: string }[] = [
  { id: 'listing_writer',    Icon: PenLine,    title: 'Listing Writer',    desc: 'AI-generated product titles and descriptions'  },
  { id: 'price_optimizer',   Icon: TrendingUp, title: 'Price Optimizer',   desc: 'Data-backed pricing from comparable listings'  },
  { id: 'worksheet_builder', Icon: BookOpen,   title: 'Worksheet Builder', desc: 'Generate educational worksheets instantly'     },
  { id: 'seo_booster',       Icon: Search,     title: 'SEO Booster',       desc: 'Optimize tags, titles & search ranking'        },
  { id: 'email_campaigns',   Icon: Mail,       title: 'Email Campaigns',   desc: 'Write buyer emails and newsletters'            },
  { id: 'image_enhancer',    Icon: ImagePlus,  title: 'Image Enhancer',    desc: 'Improve product photo quality with AI'         },
];

export function StoreAIStudio() {
  usePageTitle('AI Studio');
  const { storeId } = useStoreWorkspace();
  const [activeTool, setActiveTool] = useState<AiToolType>('listing_writer');
  const { data: credits, loading: creditsLoading, refetch: refetchCredits } = useAiStudioCredits(storeId);

  return (
    <>
      <StorePageHeader
        title="AI Studio"
        subtitle="AI-powered tools to grow your Edudeen business."
      />

      <div className="px-4 md:px-7 pt-5 pb-8 flex flex-col gap-5">
        <CreditsHeader storeId={storeId} credits={credits} loading={creditsLoading} onCreditsChanged={refetchCredits} />

        {/* ── Tool selector ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TOOLS.map(tool => {
            const active = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className="text-left px-5 py-[18px] rounded-[10px] cursor-pointer transition-[border-color,background] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
                style={{
                  border: `2px solid ${active ? '#D97757' : '#E8E6DC'}`,
                  background: active ? '#FBECE4' : '#fff',
                }}
              >
                <div className="mb-[10px]" style={{ color: active ? '#B95A3A' : '#8C8A82' }}>
                  <tool.Icon size={24} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: active ? '#B95A3A' : '#141413' }}>
                  {tool.title}
                </p>
                <p className="text-xs" style={{ color: active ? '#B95A3A' : '#8C8A82' }}>
                  {tool.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── Active tool workspace ── */}
        {activeTool === 'listing_writer'    && <ListingWriterTool storeId={storeId} onCreditsChanged={refetchCredits} />}
        {activeTool === 'seo_booster'       && <SeoBoosterTool storeId={storeId} onCreditsChanged={refetchCredits} />}
        {activeTool === 'email_campaigns'   && <EmailCampaignsTool storeId={storeId} onCreditsChanged={refetchCredits} />}
        {activeTool === 'worksheet_builder' && <WorksheetBuilderTool storeId={storeId} onCreditsChanged={refetchCredits} />}
        {activeTool === 'price_optimizer'   && <PriceOptimizerTool storeId={storeId} onCreditsChanged={refetchCredits} />}
        {activeTool === 'image_enhancer'    && <ImageEnhancerTool storeId={storeId} onCreditsChanged={refetchCredits} />}
      </div>
    </>
  );
}
