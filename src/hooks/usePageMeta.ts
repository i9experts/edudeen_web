import { useEffect } from 'react';

/** Sets the page's meta description (search results snippet) while mounted. */
export function usePageMeta(description: string | null | undefined) {
  useEffect(() => {
    if (!description) return;
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = !tag;
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    const previous = tag.content;
    tag.content = description;
    return () => {
      if (created) tag?.remove();
      else if (tag) tag.content = previous;
    };
  }, [description]);
}
