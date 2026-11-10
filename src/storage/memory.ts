import type { BookRecord, SaveRecord, SaveStore } from "./types";

export function createMemoryStore(): SaveStore {
  const slots = new Map<string, SaveRecord>();
  const books = new Map<string, BookRecord>();
  return {
    async load(slot) {
      const record = slots.get(slot);
      return record === undefined ? null : structuredClone(record);
    },
    async save(slot, record) {
      slots.set(slot, structuredClone(record));
    },
    async clear(slot) {
      slots.delete(slot);
    },
    async listBooks() {
      return [...books.values()].map((record) => structuredClone(record));
    },
    async putBook(record) {
      books.set(record.id, structuredClone(record));
    },
    async deleteBook(id) {
      books.delete(id);
    },
  };
}
