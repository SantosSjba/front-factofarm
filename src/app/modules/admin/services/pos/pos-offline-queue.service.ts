import { Injectable, signal } from '@angular/core';
import type { CreateSaleRequest } from '../../models/directory.models';

const DB_NAME = 'factofarm-pos-offline';
const STORE = 'pending-sales';

export type OfflineQueuedSale = {
  offlineLocalId: string;
  sale: CreateSaleRequest;
  createdAt: string;
};

@Injectable({ providedIn: 'root' })
export class PosOfflineQueueService {
  readonly pendingCount = signal(0);

  private dbPromise: Promise<IDBDatabase> | null = null;

  async enqueue(offlineLocalId: string, sale: CreateSaleRequest): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put({
        offlineLocalId,
        sale,
        createdAt: new Date().toISOString(),
      } satisfies OfflineQueuedSale);
    });
    await this.refreshCount();
  }

  async list(): Promise<OfflineQueuedSale[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as OfflineQueuedSale[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  async remove(offlineLocalId: string): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).delete(offlineLocalId);
    });
    await this.refreshCount();
  }

  async refreshCount(): Promise<void> {
    const rows = await this.list();
    this.pendingCount.set(rows.length);
  }

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'offlineLocalId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }
}
