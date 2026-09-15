import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `Edudeen.com: ${title}`;
    return () => { document.title = 'Edudeen'; };
  }, [title]);
}
