import type { SaveRecord, SaveStore } from "./types";

const DATABASE = "gamebook-player";
const STORE = "saves";
const VERSION = 1;

export function createIndexedDbStore(): SaveStore {
  return {
    async load(slot) {
      const value: unknown = await request("readonly", (store) => store.get(slot));
      if (value === undefined || value === null) return null;
      return value as SaveRecord;
    },
    save(slot, record) {
      return request("readwrite", (store) => store.put(structuredClone(record), slot)).then(() => undefined);
    },
    clear(slot) {
      return request("readwrite", (store) => store.delete(slot)).then(() => undefined);
    },
  };
}

function request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE, mode);
        const pending = run(transaction.objectStore(STORE));
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
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error ?? new Error("IndexedDB failed to open"));
  });
}
