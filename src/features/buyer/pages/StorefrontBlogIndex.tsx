import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import { SkeletonBox } from '@/components/comman/ui';
import { apiListPublicBlogPosts, type BlogPostSummary } from '@/api/services/storeBlog';
import { useStorefront, useStorefrontPaths } from '@/features/storefront/StorefrontContext';

export function StorefrontBlogIndex() {
  const { store, cfg } = useStorefront();
  const { path } = useStorefrontPaths();
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `Blog — ${store.name}`;
    return () => { document.title = 'Edudeen'; };
  }, [store.name]);

  useEffect(() => {
    apiListPublicBlogPosts(store.storeId, 1, 20).then(res => setPosts(res.data.posts)).finally(() => setLoading(false));
  }, [store.storeId]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-10">
      <h1 className="text-[24px] font-bold mb-6" style={{ color: cfg.textColor }}>Blog</h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <SkeletonBox key={i} height={220} rounded="12px" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Newspaper size={36} className="text-bone" />
          <p className="text-[14px] text-slate">No posts yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map(post => (
            <Link key={post.slug} to={path(`/blog/${post.slug}`)} className="block bg-white border border-bone rounded-xl overflow-hidden no-underline hover:shadow-md transition-shadow">
              {post.coverImage && <img src={post.coverImage} alt={post.title} className="w-full h-[160px] object-cover" />}
              <div className="p-4">
                {post.publishedAt && <p className="text-[12px] text-slate mb-1">{new Date(post.publishedAt).toLocaleDateString()}</p>}
                <p className="text-[15px] font-bold mb-1" style={{ color: cfg.textColor }}>{post.title}</p>
                {post.excerpt && <p className="text-[12.5px] text-slate line-clamp-2">{post.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
