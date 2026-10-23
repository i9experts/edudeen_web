import client from '../client';

export type HomeCardLayout = 'grid4' | 'single';

export interface HomeCardTile { label: string; imageUrl: string; link: string }

export interface HomeCard {
  _id: string;
  title: string;
  layout: HomeCardLayout;
  tiles: HomeCardTile[];
  imageUrl: string;
  link: string;
  ctaLabel: string;
  status: 'active' | 'draft';
  order: number;
}

export interface HomeCardPayload {
  title?: string;
  layout?: HomeCardLayout;
  tiles?: HomeCardTile[];
  imageUrl?: string;
  link?: string;
  ctaLabel?: string;
  status?: 'active' | 'draft';
}

type Res<T> = { success: boolean; data: T };

export const apiGetHomeCards = () => client.get<never, Res<HomeCard[]>>('/api/home-cards');
export const apiGetAdminHomeCards = () => client.get<never, Res<HomeCard[]>>('/api/home-cards/admin/all');
export const apiCreateHomeCard = (p: HomeCardPayload) => client.post<never, Res<HomeCard>>('/api/home-cards', p);
export const apiUpdateHomeCard = (id: string, p: HomeCardPayload & { order?: number }) => client.patch<never, Res<HomeCard>>(`/api/home-cards/${id}`, p);
export const apiDeleteHomeCard = (id: string) => client.delete<never, { success: boolean }>(`/api/home-cards/${id}`);
export const apiReorderHomeCards = (ids: string[]) => client.patch<never, { success: boolean }>('/api/home-cards/admin/reorder', { ids });