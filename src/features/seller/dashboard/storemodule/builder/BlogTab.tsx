import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Modal, Button, Field, ImageUpload } from '@/components/comman/ui';
import {
  apiListBlogPosts, apiCreateBlogPost, apiUpdateBlogPost, apiUpdateBlogContent,
  apiPublishBlogPost, apiUnpublishBlogPost, apiDeleteBlogPost,
  type BlogPostData,
} from '@/api/services/storeBlog';
import type { Block } from '@/api/services/storefrontTypes';
import { BlockFields } from './BlockFields';
import { SortableList } from './Sortable';
import { ConfirmDialog } from './ConfirmDialog';

const inp = 'w-full px-3 py-2 text-[13px] border border-bone rounded-lg text-charcoal bg-white outline-none';
const ta  = `${inp} resize-y min-h-[70px]`;
const CONTENT_BLOCK_TYPES = ['paragraph', 'heading', 'image', 'quote', 'list', 'divider'];

function slugify(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function BlogTab({ storeId }: { storeId: string }) {
  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const selected = posts.find(p => p._id === selectedId) ?? null;
  const [content, setContent] = useState<Block[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    apiListBlogPosts(storeId).then(res => setPosts(res.data)).finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setContent(selected?.content ?? []); }, [selected?._id]);

  const flash = (ok: boolean, text: string) => { setMessage({ ok, text }); setTimeout(() => setMessage(null), 3000); };

  const handleCreate = async () => {
    setCreateError('');
    if (!title.trim() || !slug.trim()) { setCreateError('Title and slug are required.'); return; }
    setCreating(true);
    try {
      const res = await apiCreateBlogPost(storeId, { title: title.trim(), slug: slug.trim() });
      setPosts(prev => [res.data, ...prev]);
      setSelectedId(res.data._id);
      setShowCreate(false);
      setTitle(''); setSlug('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create post.');
    } finally {
      setCreating(false);
    }
  };

  // `handleDelete` only opens the confirm dialog — the actual API call
  // happens in `confirmDeletePost` once the seller explicitly confirms.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [pendingRemoveBlockIndex, setPendingRemoveBlockIndex] = useState<number | null>(null);

  const confirmDeletePost = async () => {
    if (!pendingDeleteId) return;
    setDeletingPost(true);
    try {
      await apiDeleteBlogPost(storeId, pendingDeleteId);
      setPosts(prev => prev.filter(p => p._id !== pendingDeleteId));
      if (selectedId === pendingDeleteId) setSelectedId(null);
      setPendingDeleteId(null);
    } finally {
      setDeletingPost(false);
    }
  };

  const handleSaveMeta = async (patch: Partial<{ title: string; excerpt: string; coverImage: string }>) => {
    if (!selected) return;
    const res = await apiUpdateBlogPost(storeId, selected._id, patch);
    setPosts(prev => prev.map(p => p._id === res.data._id ? res.data : p));
  };

  const handleSaveContent = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await apiUpdateBlogContent(storeId, selected._id, content);
      setPosts(prev => prev.map(p => p._id === res.data._id ? res.data : p));
      flash(true, 'Saved.');
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = selected.status === 'published' ? await apiUnpublishBlogPost(storeId, selected._id) : await apiPublishBlogPost(storeId, selected._id);
      setPosts(prev => prev.map(p => p._id === res.data._id ? res.data : p));
      flash(true, res.data.status === 'published' ? 'Post published.' : 'Post unpublished.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
      <div className="bg-white border border-bone rounded-xl p-3 flex flex-col gap-1">
        {loading ? <p className="text-[12px] text-slate p-2">Loading…</p> : posts.map(post => (
          <div key={post._id} className={clsx('group flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium', selectedId === post._id ? 'bg-brand-pale-orange text-brand-deep-orange' : 'text-charcoal hover:bg-cream')}>
            <button onClick={() => setSelectedId(post._id)} className="flex-1 min-w-0 flex items-center gap-2 bg-transparent border-none cursor-pointer text-left p-0">
              <FileText size={14} className="shrink-0" /> <span className="truncate">{post.title}</span>
            </button>
            <span className={clsx('text-[10px] px-[6px] py-[1px] rounded-full shrink-0', post.status === 'published' ? 'bg-success-bg text-success' : 'bg-bone text-slate')}>{post.status}</span>
            <button onClick={() => setPendingDeleteId(post._id)} aria-label={`Delete ${post.title}`} className="shrink-0 opacity-0 group-hover:opacity-100 text-error bg-transparent border-none cursor-pointer p-1"><Trash2 size={13} /></button>
          </div>
        ))}
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold text-brand-orange bg-transparent border-none cursor-pointer hover:bg-brand-pale-orange/40">
          <Plus size={14} /> New Post
        </button>
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        {message && <p className={clsx('text-[12px] font-semibold', message.ok ? 'text-success' : 'text-error')}>{message.text}</p>}
        {selected ? (
          <>
            <div className="bg-white border border-bone rounded-xl p-4 flex flex-col gap-3">
              <Field label="Title"><input className={inp} defaultValue={selected.title} onBlur={e => handleSaveMeta({ title: e.target.value })} /></Field>
              <Field label="Excerpt"><textarea className={ta} defaultValue={selected.excerpt} onBlur={e => handleSaveMeta({ excerpt: e.target.value })} /></Field>
              <Field label="Cover image"><ImageUpload value={selected.coverImage ? [selected.coverImage] : []} onChange={urls => handleSaveMeta({ coverImage: urls[0] ?? '' })} maxFiles={1} /></Field>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-slate">Content</p>
              <div className="flex items-center gap-2">
                <button onClick={handleTogglePublish} disabled={saving} className="flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[12px] font-semibold border border-bone bg-white text-charcoal hover:bg-cream cursor-pointer">
                  {selected.status === 'published' ? <><EyeOff size={13} /> Unpublish</> : <><Eye size={13} /> Publish</>}
                </button>
                <button onClick={handleSaveContent} disabled={saving} className="flex items-center gap-1.5 px-4 py-[7px] rounded-lg text-[12px] font-bold text-white border-none cursor-pointer" style={{ background: '#174771' }}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : null} Save Content
                </button>
              </div>
            </div>

            <SortableList items={content} keyFor={(b, i) => b._id ?? `new-${i}`} onReorder={setContent}>
              {(block, i) => (
                <div className="border border-bone rounded-lg bg-cream/40 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <select className="text-[12px] border border-bone rounded-md px-2 py-1" value={block.type} onChange={e => setContent(content.map((b, j) => j === i ? { type: e.target.value, settings: {} } : b))}>
                      {CONTENT_BLOCK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => setPendingRemoveBlockIndex(i)} className="text-error text-[11px] font-semibold bg-transparent border-none cursor-pointer">Remove</button>
                  </div>
                  <BlockFields type={block.type} settings={block.settings} onChange={settings => setContent(content.map((b, j) => j === i ? { ...b, settings } : b))} pageOptions={[]} storeId={storeId} />
                </div>
              )}
            </SortableList>
            <button onClick={() => setContent([...content, { type: 'paragraph', settings: {} }])} className="text-[12px] font-semibold text-brand-orange bg-transparent border-none cursor-pointer text-left flex items-center gap-1 self-start">
              <Plus size={13} /> Add block
            </button>
          </>
        ) : (
          <p className="text-[13px] text-slate">Select or create a post to start writing.</p>
        )}
      </div>

      {showCreate && (
        <Modal title="New Post" onClose={() => setShowCreate(false)} footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>Create Post</Button>
          </>
        }>
          <Field label="Title" required>
            <input className={inp} value={title} onChange={e => { setTitle(e.target.value); setSlug(slugify(e.target.value)); }} placeholder="My first update" />
          </Field>
          <Field label="URL slug" required hint="Will be served at yourstore/blog/this-slug">
            <input className={inp} value={slug} onChange={e => setSlug(slugify(e.target.value))} placeholder="my-first-update" />
          </Field>
          {createError && <p className="text-[12px] text-error mt-1">{createError}</p>}
        </Modal>
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete post"
          message="This post will be permanently deleted. This cannot be undone."
          confirmLabel="Delete Post"
          loading={deletingPost}
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={confirmDeletePost}
        />
      )}

      {pendingRemoveBlockIndex !== null && (
        <ConfirmDialog
          title="Remove block"
          message="This content block will be removed from the post. This cannot be undone."
          confirmLabel="Remove"
          onCancel={() => setPendingRemoveBlockIndex(null)}
          onConfirm={() => {
            setContent(content.filter((_, j) => j !== pendingRemoveBlockIndex));
            setPendingRemoveBlockIndex(null);
          }}
        />
      )}
    </div>
  );
}
