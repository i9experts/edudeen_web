import client from '../client';

type Ok<T> = { success: boolean; message?: string; data: T };

/** A child profile. `educationLevel` uses the same values as product filters (EDUCATION_LEVELS). */
export interface ChildProfile {
  _id: string;
  name: string;
  educationLevel: string;
  gradeLabel: string;
  age: number | null;
  subjects: string[];
}
export type ChildInput = Omit<ChildProfile, '_id'>;

export const MAX_CHILDREN = 8;

export const apiGetChildren = () => client.get<never, Ok<ChildProfile[]>>('/api/children');
export const apiCreateChild = (body: ChildInput) => client.post<never, Ok<ChildProfile>>('/api/children', body);
export const apiUpdateChild = (id: string, body: Partial<ChildInput>) => client.patch<never, Ok<ChildProfile>>(`/api/children/${id}`, body);
export const apiDeleteChild = (id: string) => client.delete<never, Ok<{ deleted: boolean }>>(`/api/children/${id}`);
