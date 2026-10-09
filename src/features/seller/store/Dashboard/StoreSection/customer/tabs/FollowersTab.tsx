import { useEffect, useState, useCallback } from 'react';
import { Users, UserPlus, RefreshCw } from 'lucide-react';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { apiGetStoreFollowers, type FollowerUser } from '@/api/services/store';

interface FollowerEntry { followedAt: string; user: FollowerUser }

function Avatar({ name, image }: { name: string; image?: string | null }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (image) {
    return <img loading="lazy" decoding="async" src={image} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-brand-pale-orange text-brand-orange flex items-center justify-center text-[12px] font-bold shrink-0">
      {initials}
    </div>
  );
}

function FollowerRow({ entry }: { entry: FollowerEntry }) {
  const when = new Date(entry.followedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <div className="flex items-center gap-3 px-5 py-[14px] border-b border-[#f3f2ec] last:border-none hover:bg-cream transition-colors">
      <Avatar name={entry.user.name} image={entry.user.profileImage} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-charcoal truncate">{entry.user.name}</p>
        {entry.user.email && (
          <p className="text-[12px] text-slate truncate">{entry.user.email}</p>
        )}
      </div>
      <p className="text-[12px] text-slate shrink-0">{when}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="bg-white rounded-[10px] border border-bone overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-[14px] border-b border-[#f3f2ec] last:border-none">
          <div className="animate-pulse w-9 h-9 rounded-full bg-bone shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="animate-pulse w-32 h-3 rounded bg-bone" />
            <div className="animate-pulse w-48 h-2.5 rounded bg-bone" />
          </div>
          <div className="animate-pulse w-16 h-2.5 rounded bg-bone" />
        </div>
      ))}
    </div>
  );
}

export function FollowersTab() {
  const { storeId } = useStoreWorkspace();

  const [followers, setFollowers] = useState<FollowerEntry[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [pages,     setPages]     = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p: number, showRefresh = false) => {
    if (!storeId) return;
    showRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await apiGetStoreFollowers(storeId, p, 20);
      if (res.success) {
        setFollowers(res.data.followers ?? []);
        setTotal(res.data.total);
        setPages(res.data.pagination.totalPages);
        setPage(p);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-slate">{loading ? 'Loading…' : `${total.toLocaleString()} follower${total !== 1 ? 's' : ''}`}</p>
        <button
          onClick={() => load(page, true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-[7px] bg-white border border-bone rounded-[7px] text-[12px] font-medium text-charcoal cursor-pointer transition-colors duration-150 hover:bg-cream disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? <Skeleton /> : followers.length === 0 ? (
        <div className="bg-white rounded-[10px] border border-bone flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-pale-orange flex items-center justify-center">
            <UserPlus size={20} className="text-brand-orange" />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-charcoal">No followers yet</p>
            <p className="text-[13px] text-slate mt-1">Share your store link to grow your audience</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary card */}
          <div className="bg-white rounded-[10px] border border-bone px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-brand-pale-orange flex items-center justify-center shrink-0">
              <Users size={16} className="text-brand-orange" />
            </div>
            <div>
              <p className="text-[22px] font-bold text-charcoal leading-none">{total.toLocaleString()}</p>
              <p className="text-[12px] text-slate mt-[3px]">Total followers</p>
            </div>
          </div>

          {/* List */}
          <div className="bg-white rounded-[10px] border border-bone overflow-hidden">
            <div className="px-5 py-3 border-b border-[#f3f2ec] flex items-center justify-between">
              <p className="text-[12px] font-semibold text-slate uppercase tracking-[0.06em]">Followers</p>
              <p className="text-[12px] text-slate">{followers.length} shown</p>
            </div>
            {followers.map(f => <FollowerRow key={f.user._id} entry={f} />)}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1}
                className="px-4 py-[7px] rounded-[7px] text-[12px] font-medium border border-bone bg-white text-charcoal cursor-pointer transition-colors duration-150 hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
              >
                Previous
              </button>
              <span className="text-[12px] text-slate">{page} / {pages}</span>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= pages}
                className="px-4 py-[7px] rounded-[7px] text-[12px] font-medium border border-bone bg-white text-charcoal cursor-pointer transition-colors duration-150 hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
