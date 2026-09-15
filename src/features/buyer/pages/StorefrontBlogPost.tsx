import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { SkeletonBox } from '@/components/comman/ui';
import { apiGetPublicBlogPost, type BlogPostData } from '@/api/services/storeBlog';
import { useStorefront } from '@/features/storefront/StorefrontContext';
import { ContentBlocks } from '@/features/storefront/sections/ContentBlocks';

export function StorefrontBlogPost() {
  const { postSlug } = useParams<{ postSlug: string }>();
  const { store, cfg } = useStorefront();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!postSlug) return;
    setLoading(true);
    setNotFound(false);
    apiGetPublicBlogPost(store.storeId, postSlug)
      .then(res => setPost(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [store.storeId, postSlug]);

  useEffect(() => {
    document.title = post ? `${post.title} — ${store.name}` : store.name;
    return () => { document.title = 'Edudeen'; };
  }, [post, store.name]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-10 max-w-[720px] mx-auto flex flex-col gap-4">
        <SkeletonBox width="60%" height={30} rounded="6px" />
        <SkeletonBox height={300} rounded="10px" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 py-16">
        <FileQuestion size={40} className="text-bone" />
        <p className="text-[14px] text-slate">This post doesn't exist.</p>
      </div>
    );
  }

  return (
    <article className="px-4 sm:px-6 lg:px-10 py-10">
      <div className="max-w-[720px] mx-auto flex flex-col gap-4">
        {post.publishedAt && <p className="text-[12px] text-slate">{new Date(post.publishedAt).toLocaleDateString()}</p>}
        <h1 className="text-[28px] font-bold" style={{ color: cfg.textColor }}>{post.title}</h1>
        {post.coverImage && <img src={post.coverImage} alt={post.title} className="w-full rounded-xl object-cover max-h-[420px]" />}
        <ContentBlocks blocks={post.content} />
      </div>
    </article>
  );
}
