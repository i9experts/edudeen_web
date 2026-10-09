import { useState } from 'react';
import {
  PenLine, TrendingUp, BookOpen, Search, Mail, ImagePlus, Languages, LineChart, LifeBuoy, ImageIcon, ScanEye, ListChecks, type LucideIcon,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { useAiStudioCredits } from '@/hooks/seller/useAiStudio';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { CreditsHeader } from './components/CreditsHeader';
import { ListingWriterTool } from './tools/ListingWriterTool';
import { SeoBoosterTool } from './tools/SeoBoosterTool';
import { EmailCampaignsTool } from './tools/EmailCampaignsTool';
import { WorksheetBuilderTool } from './tools/WorksheetBuilderTool';
import { PriceOptimizerTool } from './tools/PriceOptimizerTool';
import { ImageEnhancerTool } from './tools/ImageEnhancerTool';
import { QuizTool } from './tools/QuizTool';
import { WeeklyDigestCard } from './components/WeeklyDigestCard';
import { TranslateTool, InsightsTool, HelpBotTool, CoverTool, PhotoCheckTool } from './tools/ExtraTools';

type ToolId =
  | 'listing_writer' | 'price_optimizer' | 'worksheet_builder' | 'seo_booster' | 'email_campaigns' | 'image_enhancer'
  | 'translate_listing' | 'weekly_insights' | 'help_bot' | 'product_cover' | 'image_check' | 'quiz_generator';

const TOOLS: { id: ToolId; Icon: LucideIcon; title: string; desc: string }[] = [
  { id: 'listing_writer',    Icon: PenLine,    title: 'Listing Writer',    desc: 'AI-generated product titles and descriptions'  },
  { id: 'price_optimizer',   Icon: TrendingUp, title: 'Price Optimizer',   desc: 'Data-backed pricing from comparable listings'  },
  { id: 'worksheet_builder', Icon: BookOpen,   title: 'Worksheet Builder', desc: 'Generate printable educational worksheets'     },
  { id: 'seo_booster',       Icon: Search,     title: 'SEO Booster',       desc: 'Optimize tags, titles & search ranking'        },
  { id: 'email_campaigns',   Icon: Mail,       title: 'Email Campaigns',   desc: 'Write buyer emails and newsletters'            },
  { id: 'image_enhancer',    Icon: ImagePlus,  title: 'Image Enhancer',    desc: 'Improve product photo quality with AI'         },
  { id: 'quiz_generator',    Icon: ListChecks, title: 'Quiz Generator',    desc: 'Quizzes from your lesson text, with listen + PDF' },
  { id: 'translate_listing', Icon: Languages,  title: 'Urdu / English',    desc: 'Translate listings to Urdu (and back)'         },
  { id: 'image_check',       Icon: ScanEye,    title: 'Photo Check',       desc: 'Alt text and quality feedback for photos'      },
  { id: 'product_cover',     Icon: ImageIcon,  title: 'Product Cover',     desc: 'Branded cover image for a product'             },
  { id: 'weekly_insights',   Icon: LineChart,  title: 'Weekly Insights',   desc: 'Your sales digest with 3 next steps'           },
  { id: 'help_bot',          Icon: LifeBuoy,   title: 'Help Assistant',    desc: 'Ask how Edudeen works (free)'                  },
];

export function StoreAIStudio() {
  usePageTitle('AI Studio');
  const { storeId } = useStoreWorkspace();
  const { data: credits, loading: creditsLoading, refetch: refetchCredits } = useAiStudioCredits(storeId);
  const { loading: featuresLoading, available, enabled, extras } = useAiFeatures(storeId);
  const costs = credits?.toolCosts as Record<string, number> | undefined;

  // Hide tools the admin switched off (or all tools when the API has no AI key).
  // With no AI key every tool is shown but disabled (with a notice); otherwise the admin-disabled ones are hidden.
  const tools = available ? TOOLS.filter(t => enabled(t.id)) : TOOLS;
  const notConfigured = !featuresLoading && !available;
  const [picked, setPicked] = useState<ToolId>('listing_writer');
  const activeTool: ToolId | undefined = notConfigured ? undefined : tools.some(t => t.id === picked) ? picked : tools[0]?.id;
  const common = { storeId, onCreditsChanged: refetchCredits };

  return (
    <>
      <StorePageHeader
        title="AI Studio"
        subtitle="AI-powered tools to grow your Edudeen business."
      />

      <div className="px-4 md:px-7 pt-5 pb-8 flex flex-col gap-5">
        <CreditsHeader storeId={storeId} credits={credits} loading={creditsLoading} onCreditsChanged={refetchCredits} />

        {!featuresLoading && (notConfigured || tools.length === 0) && (
          <div role="status" className="rounded-[10px] border border-bone bg-white px-5 py-6 text-center">
            <p className="text-sm font-semibold text-charcoal mb-1">{notConfigured ? 'AI is not configured' : 'AI tools are switched off for now'}</p>
            <p className="text-xs text-slate">{notConfigured ? 'The AI tools are turned off until the platform AI key is set up. No credits are charged.' : 'The Edudeen team has paused these tools. Please check back later.'}</p>
          </div>
        )}

        {/* ── Tool selector ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map(tool => {
            const active = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setPicked(tool.id)}
                disabled={notConfigured}
                aria-pressed={active}
                className="text-left disabled:opacity-50 disabled:cursor-not-allowed px-5 py-[18px] rounded-[10px] cursor-pointer transition-[border-color,background] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
                style={{
                  border: `2px solid ${active ? '#174771' : '#E8E6DC'}`,
                  background: active ? '#EAF2F8' : '#fff',
                }}
              >
                <div className="mb-[10px]" style={{ color: active ? '#0F3354' : '#8C8A82' }}>
                  <tool.Icon size={24} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: active ? '#0F3354' : '#141413' }}>
                  {tool.title}
                </p>
                <p className="text-xs" style={{ color: active ? '#0F3354' : '#8C8A82' }}>
                  {tool.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── Active tool workspace ── */}
        {/* Button costs come from the live credits.toolCosts, not hardcoded numbers. */}
        {activeTool === 'listing_writer'    && <ListingWriterTool {...common} creditCost={costs?.listing_writer} />}
        {activeTool === 'seo_booster'       && <SeoBoosterTool {...common} creditCost={costs?.seo_booster} />}
        {activeTool === 'email_campaigns'   && <EmailCampaignsTool {...common} creditCost={costs?.email_campaigns} />}
        {activeTool === 'worksheet_builder' && <WorksheetBuilderTool {...common} creditCost={costs?.worksheet_builder} />}
        {activeTool === 'price_optimizer'   && <PriceOptimizerTool {...common} creditCost={costs?.price_optimizer} />}
        {activeTool === 'image_enhancer'    && <ImageEnhancerTool {...common} creditCost={costs?.image_enhancer} unavailable={!extras.imageEnhancer} />}
        {activeTool === 'quiz_generator'    && <QuizTool {...common} creditCost={costs?.quiz_generator} />}
        {activeTool === 'translate_listing' && <TranslateTool {...common} creditCost={costs?.translate_listing} />}
        {activeTool === 'image_check'       && <PhotoCheckTool {...common} creditCost={costs?.image_check} />}
        {activeTool === 'product_cover'     && <CoverTool {...common} creditCost={costs?.product_cover} />}
        {activeTool === 'weekly_insights'   && <WeeklyDigestCard storeId={storeId} />}
        {activeTool === 'weekly_insights'   && <InsightsTool {...common} creditCost={costs?.weekly_insights} />}
        {activeTool === 'help_bot'          && <HelpBotTool {...common} />}
      </div>
    </>
  );
}
