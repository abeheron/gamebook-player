import type { Book, SystemDef } from "./types";
import { BookValidationError, validateBook } from "./validate";

export interface ImportedBook {
  ok: true;
  book: Book;
}

export interface RejectedBook {
  ok: false;
  /** 2 schema, 3 system file, 4 already in the library. */
  step: 2 | 3 | 4;
  errors: string[];
}

/** Parse and check a book file that has already been read. Step 1 is the file read. */
export function importBookText(text: string, system: SystemDef, existingIds: readonly string[]): ImportedBook | RejectedBook {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, step: 2, errors: ["The file is not JSON."] };
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, step: 2, errors: ["book: expected an object"] };
  }
  const record = { ...(value as Record<string, unknown>) };
  const declared = typeof record.system === "string" ? record.system : null;
  if (declared && declared !== system.id) record.system = system.id;
  let book: Book;
  try {
    book = validateBook(record, system);
  } catch (error) {
    const message = error instanceof BookValidationError || error instanceof Error ? error.message : "The book is not valid.";
    return { ok: false, step: 2, errors: [message] };
  }
  if (declared && declared !== system.id) {
    return { ok: false, step: 3, errors: [`This app does not include the system “${declared}”.`] };
  }
  if (existingIds.includes(book.id)) {
    return { ok: false, step: 4, errors: [`“${book.title}” is already in the library.`] };
  }
  return { ok: true, book };
}

export function exploredSections(sectionId: string, previous: readonly { sectionId: string }[]): number {
  return new Set([sectionId, ...previous.map((state) => state.sectionId)]).size;
}
