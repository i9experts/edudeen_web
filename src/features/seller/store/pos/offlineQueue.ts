import type { CreateSalePayload } from '@/api/services/pos/posSales';

// A minimal IndexedDB-backed queue for POS sales created while offline (or while
// a request times out). Sales are keyed by their idempotencyKey so a retry after
// reconnecting can never double-create the same sale server-side.

const DB_NAME    = 'edudeen-pos-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-sales';

export interface QueuedSale {
  idempotencyKey: string;
  payload:        CreateSalePayload;
  queuedAt:        string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'idempotencyKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function enqueueSale(payload: CreateSalePayload): Promise<void> {
  const idempotencyKey = payload.idempotencyKey;
  if (!idempotencyKey) throw new Error('Cannot queue a sale without an idempotencyKey.');
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({
      idempotencyKey,
      payload,
      queuedAt: new Date().toISOString(),
    } satisfies QueuedSale);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
    db.close();
  });
}

export async function getQueuedSales(): Promise<QueuedSale[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as QueuedSale[]);
    req.onerror   = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function removeQueuedSale(idempotencyKey: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(idempotencyKey);
    tx.oncomplete = () => { resolve(); db.close(); };
    tx.onerror    = () => reject(tx.error);
  });
}

export async function countQueuedSales(): Promise<number> {
  return (await getQueuedSales()).length;
}
