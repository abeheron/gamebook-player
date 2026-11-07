import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) files.push(...sourceFiles(path));
    else if (path.endsWith(".ts")) files.push(path);
  }
  return files;
}

describe("engine and format boundaries", () => {
  it("stays free of UI, storage, network, and eval", () => {
    const forbidden = [
      /from\s+["']svelte/,
      /indexedDB/,
      /localStorage/,
      /\bfetch\s*\(/,
      /from\s+["']node:/,
      /@tauri-apps/,
      /\beval\s*\(/,
      /new Function/,
    ];
    const files = [...sourceFiles("src/engine"), ...sourceFiles("src/format")];
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        expect(source, `${file} matches ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
