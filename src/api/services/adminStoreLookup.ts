import client from '../client';
interface ApiResponse<T> { success: boolean; message?: string; data: T }
import type { EntityOption } from '@/features/admin/components/analytics/EntitySearchSelect';

/** Admin store picker: any store (every status), from a few letters, tolerant of wrong spelling. */
export async function searchStoresByName(query: string): Promise<EntityOption[]> {
  const res = await client.get<never, ApiResponse<{ stores: Array<{ id: string; name: string; slug: string; status?: string; email?: string }> }>>(
    '/api/admin/store-lookup', { params: { q: query } },
  );
  return res.data.stores.map(s => ({ id: s.id, label: s.name, sub: `${s.email ? `${s.email} · ` : ''}/${s.slug}${s.status && s.status !== 'active' ? ` · ${s.status}` : ''}` }));
}
