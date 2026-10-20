import type { ReactNode } from 'react';
import { Card, PageHeader } from '@/components/comman/ui';

/** The one header every account page uses: "ACCOUNT" eyebrow + title + subtitle (+ actions) in a card. */
export function AccountPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <Card padding="none" className="rounded-2xl">
      <div className="px-5 pt-5 pb-4">
        <PageHeader eyebrow="Account" title={title} description={description} actions={actions} />
      </div>
    </Card>
  );
}
