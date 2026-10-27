import client from './client';
import { ENDPOINTS } from './endpoints';

export interface PublicUploadData {
  url:          string;
  publicId:     string;
  resourceType: string;
}

export interface PrivateUploadData {
  publicId:     string;
  resourceType: string;
  fileName:     string;
  fileSize:     number;
  mimeType:     string;
}

interface UploadApiResponse<T> { success: boolean; message: string; data: T }

/** Optional progress callback (0-100) for long uploads. Uploads always use a 10 min timeout (the default 15 s is too short for big files). */
export type UploadProgress = (percent: number) => void;
const uploadConfig = (onProgress?: UploadProgress) => ({
  timeout: 10 * 60_000,
  ...(onProgress ? { onUploadProgress: (e: { loaded: number; total?: number }) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)); } } : {}),
});

export function apiUploadPublicFile(file: File, onProgress?: UploadProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return client.post<never, UploadApiResponse<PublicUploadData>>(ENDPOINTS.UPLOAD.PUBLIC_FILE, fd, uploadConfig(onProgress));
}

/** `purpose` scopes the private storage folder server-side (e.g. 'kyc_document'
 *  for seller-verification documents) — omit for the original digital-products
 *  upload flow, which keeps its existing default folder. */
export function apiUploadPrivateFile(file: File, purpose?: string, onProgress?: UploadProgress) {
  const fd = new FormData();
  fd.append('file', file);
  if (purpose) fd.append('purpose', purpose);
  return client.post<never, UploadApiResponse<PrivateUploadData>>(ENDPOINTS.UPLOAD.PRIVATE_FILE, fd, uploadConfig(onProgress));
}
