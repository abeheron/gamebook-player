export type RuntimeKind = "web" | "tauri";

/** Detects the Tauri webview without calling native commands or plugins. */
export function detectRuntime(): RuntimeKind {
  if (typeof window === "undefined") return "web";
  const host = window as Window & { __TAURI_INTERNALS__?: unknown };
  return host.__TAURI_INTERNALS__ === undefined ? "web" : "tauri";
}
