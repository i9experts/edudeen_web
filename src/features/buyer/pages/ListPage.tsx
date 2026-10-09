import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ListChecks, Copy, Lock, Trash2, StickyNote } from 'lucide-react';
import { BuyerNavbar, Breadcrumb, Footer, Button, EmptyState } from '@/components/comman/ui';
import { ResourceCard, ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useToast } from '@/contexts/ToastContext';
import { useAddAllToCart } from '@/hooks/marketplace/useAddAllToCart';
import { apiGetListBySlug, apiRemoveFromList, apiUpdateListNote, type SavedListDetail } from '@/api/services/classroom';

/**
 * `/lists/:slug` — a teacher's list. Shared lists are readable by anyone with
 * the link (parents, colleagues); the owner can also add notes and remove items.
 */
export function ListPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { addAll, adding } = useAddAllToCart();
  const [list, setList] = useState<SavedListDetail | null>(null);
  const [error, setError] = useState('');

  usePageTitle(list?.name ?? 'List');
  usePageMeta(list ? `${list.name} — a list of ${list.items.length} learning resources by ${list.ownerName} on Edudeen.` : null);

  useEffect(() => {
    setList(null); setError('');
    apiGetListBySlug(slug).then(res => setList(res.data)).catch(err => setError(err instanceof Error ? err.message : 'List not found'));
  }, [slug]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); } catch { /* address bar still works */ }
  };

  const remove = async (productId: string) => {
    if (!list) return;
    try { await apiRemoveFromList(list._id, productId); setList({ ...list, items: list.items.filter(i => i.product._id !== productId) }); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not remove.'); }
  };

  const editNote = async (productId: string, current: string) => {
    if (!list) return;
    const note = window.prompt('Note for this resource (e.g. "Week 3 homework")', current);
    if (note === null) return;
    try { await apiUpdateListNote(list._id, productId, note); setList({ ...list, items: list.items.map(i => i.product._id === productId ? { ...i, note: note.trim().slice(0, 200) } : i) }); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save the note.'); }
  };

  return (
    <div className="bg-white min-h-full">
      <div className="sticky top-0 z-50"><BuyerNavbar /></div>
      <main className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] pt-4 md:pt-6 pb-12">
        <Breadcrumb className="mb-1" items={[{ label: 'Home', path: '/' }, ...(list?.isOwner ? [{ label: 'My Lists', path: '/account/lists' }] : []), { label: list?.name ?? 'List' }]} />
        {error ? (
          <EmptyState icon={<ListChecks size={22} />} title="This list isn't available" description="It may be private or deleted. Ask the teacher who shared it for a new link." action={{ label: 'Browse resources', onClick: () => navigate('/search') }} />
        ) : (
          <>
            <header className="mb-6 flex items-end gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-1">{list ? `A list by ${list.isOwner ? 'you' : list.ownerName}` : 'Teacher list'}</p>
                <h1 className="font-serif font-normal text-[28px] md:text-[36px] leading-[1.15] text-carbon">{list?.name ?? '…'}</h1>
                {list?.description && <p className="text-[14.5px] text-graphite mt-2 max-w-[70ch]">{list.description}</p>}
                {list && <p className="text-[12.5px] text-slate mt-1">{list.items.length} {list.items.length === 1 ? 'resource' : 'resources'}{list.isOwner && !list.isPublic ? ' · only you can see this list' : ''}</p>}
              </div>
              {list && (
                <div className="flex gap-2 flex-wrap">
                  {list.isPublic && <Button variant="outline" size="sm" onClick={copy}><Copy size={13} /> Copy link</Button>}
                  {list.isOwner && !list.isPublic && <Link to="/account/lists" className="inline-flex items-center gap-1 text-[12.5px] text-slate no-underline"><Lock size={12} /> Make it shareable</Link>}
                  {list.items.length > 0 && <Button variant="primary" size="sm" loading={adding} onClick={() => list && addAll(list.items.map(i => i.product), 'Whole list added to your cart')}>Add all to cart</Button>}
                </div>
              )}
            </header>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
              {!list
                ? Array.from({ length: 5 }, (_, i) => <ResourceCardSkeleton key={i} />)
                : list.items.map(({ product, note }, i) => (
                  <div key={product._id} className="min-w-0 flex flex-col gap-2">
                    <ResourceCard product={product} index={i} onClick={s => navigate(`/product/${s}`)} />
                    {note && <p className="flex items-start gap-1 text-[12px] text-graphite bg-cream rounded-md px-2 py-1"><StickyNote size={12} className="shrink-0 mt-[2px]" /> {note}</p>}
                    {list.isOwner && (
                      <div className="flex gap-3 text-[12px]">
                        <button type="button" onClick={() => editNote(product._id, note)} className="bg-transparent border-none p-0 text-slate hover:text-brand-orange cursor-pointer">{note ? 'Edit note' : 'Add note'}</button>
                        <button type="button" onClick={() => remove(product._id)} className="inline-flex items-center gap-1 bg-transparent border-none p-0 text-slate hover:text-error cursor-pointer"><Trash2 size={11} /> Remove</button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
            {list && list.items.length === 0 && <p className="text-[13.5px] text-slate">This list is empty{list.isOwner ? ' — save resources to it from any product page.' : '.'}</p>}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
