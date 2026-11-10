import type { Session } from "../format/types";

export const SAVE_VERSION = 4;

export interface SaveRecord {
  version: typeof SAVE_VERSION;
  savedAt: string;
  session: Session;
  /** Section ids the player has bookmarked. Not part of the story undo stack. */
  bookmarks: string[];
}

/** Persistence contract. The web app and the Linux shell both use IndexedDB. */
export interface SaveStore {
  load(slot: string): Promise<SaveRecord | null>;
  save(slot: string, record: SaveRecord): Promise<void>;
  clear(slot: string): Promise<void>;
}
