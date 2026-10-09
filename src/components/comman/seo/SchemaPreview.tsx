import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Card } from '@/components/comman/ui/Card';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';

interface SchemaPreviewProps {
  jsonLd:    unknown;
  loading?:  boolean;
  className?: string;
}

export function SchemaPreview({ jsonLd, loading, className }: SchemaPreviewProps) {
  const [copied, setCopied] = useState(false);
  const formatted = jsonLd ? JSON.stringify(jsonLd, null, 2) : '';

  const copy = () => {
    if (!formatted) return;
    navigator.clipboard.writeText(formatted).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <SkeletonBox height={13} width="30%" rounded="4px" className="mb-3" />
        <SkeletonBox height={140} width="100%" rounded="8px" />
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-carbon">Structured Data (JSON-LD)</p>
        <Button variant="outline" size="xs" icon={copied ? <Check size={11} /> : <Copy size={11} />} onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="bg-cream border border-bone rounded-lg p-3 text-[12px] leading-[1.6] text-charcoal overflow-auto max-h-[360px] whitespace-pre-wrap break-words">
        {formatted || '// No structured data available yet.'}
      </pre>
    </Card>
  );
}
