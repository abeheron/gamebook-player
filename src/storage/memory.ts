import type { SaveRecord, SaveStore } from "./types";

export function createMemoryStore(): SaveStore {
  const slots = new Map<string, SaveRecord>();
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
  };
}
