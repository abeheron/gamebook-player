import JSZip from "jszip";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { SystemDef } from "./types";
import { type DraftBook, structurePages, type SourcePage } from "./structure-book";

let fontBase = "/pdfjs/standard_fonts/";
let readerReady = false;

export const SCANNED_PDF = "This PDF has no selectable text. A scanned book can't be converted yet.";
export const UNRECOGNISED = "Nothing in this file was recognised as a book.";
export const UNREADABLE = "This file could not be read as a PDF or EPUB.";
export const PROTECTED_EPUB = "This EPUB is protected and can't be converted.";

export type ConvertedFile =
  | { ok: true; draft: DraftBook }
  | { ok: false; step: 2 | 3; error: string };

/** Browser build: the worker and fonts are same-origin assets, including offline and in Tauri. */
export function useBrowserPdf(workerSrc: string): void {
  GlobalWorkerOptions.workerSrc = workerSrc;
  fontBase = "/pdfjs/standard_fonts/";
  readerReady = true;
}

/** Node tools pass the package's worker and font directory. They are not fetched. */
export function useNodePdf(workerSrc: string, standardFonts: string): void {
  GlobalWorkerOptions.workerSrc = workerSrc;
  fontBase = standardFonts.endsWith("/") ? standardFonts : `${standardFonts}/`;
  readerReady = true;
}

function ensureReader(): void {
  if (!readerReady) throw new Error("PDF reader was not configured.");
}

/** Read a PDF or EPUB that is already in memory. Step 1, the file read, is the caller's. */
export async function convertBytes(data: Uint8Array, filename: string, system: SystemDef): Promise<ConvertedFile> {
  const kind = fileKind(data);
  if (kind === "other") return { ok: false, step: 2, error: UNREADABLE };
  try {
    const extracted = kind === "pdf" ? await extractPdf(data, filename) : await extractEpub(data, filename);
    if (!extracted.ok) return extracted;
    const draft = structurePages(extracted.pages, { title: extracted.title, author: extracted.author }, system);
    if (draft.sections.length === 0) return { ok: false, step: 3, error: UNRECOGNISED };
    return { ok: true, draft };
  } catch {
    return { ok: false, step: 2, error: UNREADABLE };
  }
}

function fileKind(data: Uint8Array): "pdf" | "epub" | "other" {
  if (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) return "pdf";
  if (data[0] === 0x50 && data[1] === 0x4b) return "epub";
  return "other";
}

function copyBytes(data: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(data.byteLength);
  bytes.set(data);
  return bytes;
}

async function extractPdf(
  data: Uint8Array,
  filename: string,
): Promise<{ ok: true; title: string; author: string; pages: SourcePage[] } | { ok: false; step: 2; error: string }> {
  ensureReader();
  const task = getDocument({
    data: copyBytes(data),
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: 0,
    standardFontDataUrl: fontBase,
  });
  const pdf = await task.promise;
  try {
    const meta = await pdf.getMetadata();
    const info = meta.info as { Title?: string; Author?: string };
    const pages: SourcePage[] = [];
    let characters = 0;
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const text = linesFromItems(content.items).join("\n");
      characters += text.replace(/\s/g, "").length;
      pages.push({ ref: `Page ${number}`, text });
    }
    if (characters === 0) return { ok: false, step: 2, error: SCANNED_PDF };
    return {
      ok: true,
      title: textValue(info.Title) || titleFromName(filename),
      author: textValue(info.Author) || "Unknown",
      pages,
    };
  } finally {
    await task.destroy();
  }
}

async function extractEpub(
  data: Uint8Array,
  filename: string,
): Promise<{ ok: true; title: string; author: string; pages: SourcePage[] } | { ok: false; step: 2 | 3; error: string }> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    return { ok: false, step: 2, error: UNREADABLE };
  }
  if (zip.file(/meta-inf\/encryption\.xml/i).length > 0) return { ok: false, step: 2, error: PROTECTED_EPUB };
  const container = await zip.file(/meta-inf\/container\.xml/i)[0]?.async("string");
  const root = /full-path\s*=\s*"([^"]+)"/i.exec(container ?? "")?.[1];
  if (!root) return { ok: false, step: 2, error: UNREADABLE };
  const opfFile = zip.file(root);
  if (!opfFile) return { ok: false, step: 2, error: UNREADABLE };
  const opf = await opfFile.async("string");
  const title = decodeXml(/<dc:title[^>]*>([^<]*)<\/dc:title>/i.exec(opf)?.[1] ?? "") || titleFromName(filename);
  const author = decodeXml(/<dc:creator[^>]*>([^<]*)<\/dc:creator>/i.exec(opf)?.[1] ?? "") || "Unknown";
  const hrefs = spineHrefs(opf);
  if (hrefs.length === 0) return { ok: false, step: 2, error: UNREADABLE };
  const pages: SourcePage[] = [];
  for (let index = 0; index < hrefs.length; index += 1) {
    const href = hrefs[index];
    if (!href) continue;
    const path = joinZip(root, href);
    const file = zip.file(path);
    if (!file) return { ok: false, step: 2, error: UNREADABLE };
    const xhtml = await file.async("string");
    pages.push({ ref: `Page ${index + 1}`, text: xhtmlToText(xhtml) });
  }
  return { ok: true, title, author, pages };
}

function spineHrefs(opf: string): string[] {
  const items = new Map<string, string>();
  for (const match of opf.matchAll(/<item\b([^>]*)\/?>/gi)) {
    const tag = match[1] ?? "";
    const id = /id\s*=\s*"([^"]+)"/i.exec(tag)?.[1];
    const href = /href\s*=\s*"([^"]+)"/i.exec(tag)?.[1];
    if (id && href) items.set(id, decodeXml(href));
  }
  const hrefs: string[] = [];
  for (const match of opf.matchAll(/<itemref\b([^>]*)\/?>/gi)) {
    const id = /idref\s*=\s*"([^"]+)"/i.exec(match[1] ?? "")?.[1];
    const href = id ? items.get(id) : undefined;
    if (href) hrefs.push(href);
  }
  return hrefs;
}

export function xhtmlToText(xml: string): string {
  const without = xml.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
  const broken = without
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|section|title|body)>/gi, "\n");
  return decodeXml(broken.replace(/<[^>]+>/g, ""))
    .split(/\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function linesFromItems(items: unknown[]): string[] {
  const rows = new Map<number, { x: number; text: string }[]>();
  for (const item of items) {
    if (!isGlyph(item) || item.str === "") continue;
    const y = Math.round(item.transform[5] ?? 0);
    let key = y;
    for (const existing of rows.keys()) {
      if (Math.abs(existing - y) <= 2) {
        key = existing;
        break;
      }
    }
    const row = rows.get(key) ?? [];
    row.push({ x: item.transform[4] ?? 0, text: item.str });
    rows.set(key, row);
  }
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, row]) =>
      row
        .sort((a, b) => a.x - b.x)
        .map((glyph) => glyph.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

function isGlyph(item: unknown): item is { str: string; transform: number[] } {
  if (item === null || typeof item !== "object") return false;
  const record = item as { str?: unknown; transform?: unknown };
  return typeof record.str === "string" && Array.isArray(record.transform);
}

function joinZip(opfPath: string, href: string): string {
  const parts = opfPath.split("/").slice(0, -1);
  for (const part of href.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== "." && part !== "") parts.push(part);
  }
  return parts.join("/");
}

function titleFromName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base || "Imported book";
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
