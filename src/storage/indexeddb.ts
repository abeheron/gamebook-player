import type { BookRecord, SaveRecord, SaveStore } from "./types";

const DATABASE = "gamebook-player";
const STORE = "saves";
const BOOKS = "books";
const VERSION = 2;

export function createIndexedDbStore(): SaveStore {
  return {
    async load(slot) {
      const value: unknown = await request(STORE, "readonly", (store) => store.get(slot));
      if (value === undefined || value === null) return null;
      return value as SaveRecord;
    },
    save(slot, record) {
      return request(STORE, "readwrite", (store) => store.put(structuredClone(record), slot)).then(() => undefined);
    },
    clear(slot) {
      return request(STORE, "readwrite", (store) => store.delete(slot)).then(() => undefined);
    },
    async listBooks() {
      const value: unknown = await request(BOOKS, "readonly", (store) => store.getAll());
      return Array.isArray(value) ? (value as BookRecord[]) : [];
    },
    putBook(record) {
      return request(BOOKS, "readwrite", (store) => store.put(structuredClone(record), record.id)).then(() => undefined);
    },
  };
}

function request<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const pending = run(transaction.objectStore(storeName));
        pending.onsuccess = () => resolve(pending.result);
        pending.onerror = () => reject(pending.error ?? new Error("IndexedDB request failed"));
        transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
      }),
  );
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DATABASE, VERSION);
    opening.onupgradeneeded = () => {
      const database = opening.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
      if (!database.objectStoreNames.contains(BOOKS)) database.createObjectStore(BOOKS);
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error ?? new Error("IndexedDB failed to open"));
  });
}
