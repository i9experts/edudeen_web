import { useEffect } from 'react';

/** Tab/search-result title: "<page> | Edudeen". */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    const next = title.toLowerCase().includes('edudeen') ? title : `${title} | Edudeen`;
    document.title = next;
    return () => { if (document.title === next) document.title = prev; };
  }, [title]);
}
