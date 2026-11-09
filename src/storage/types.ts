import type { Session } from "../format/types";

export const SAVE_VERSION = 2;

export interface SaveRecord {
  version: typeof SAVE_VERSION;
  savedAt: string;
  session: Session;
}

/** Persistence contract. The web app and the Linux shell both use IndexedDB. */
export interface SaveStore {
  load(slot: string): Promise<SaveRecord | null>;
  save(slot: string, record: SaveRecord): Promise<void>;
  clear(slot: string): Promise<void>;
}
