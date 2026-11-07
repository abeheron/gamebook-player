import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { Plugin } from "vite";

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "object-src 'none'",
].join("; ");

/** Production-only app-shell cache and a strict content security policy. */
export function gamebookPwa(): Plugin {
  return {
    name: "gamebook-pwa",
    apply: "build",
    transformIndexHtml(html) {
      const meta = `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`;
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${meta}`);
    },
    closeBundle() {
      const dist = resolve("dist");
      const files = walk(dist).sort();
      const hash = createHash("sha256");
      const urls: string[] = [];
      for (const file of files) {
        const url = `/${relative(dist, file).split("\\").join("/")}`;
        if (url === "/sw.js") continue;
        hash.update(url);
        hash.update(readFileSync(file));
        urls.push(url);
      }
      const version = hash.digest("hex").slice(0, 12);
      writeFileSync(join(dist, "sw.js"), serviceWorker(version, urls), "utf8");
    },
  };
}

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function serviceWorker(version: string, urls: string[]): string {
  return `const CACHE = ${JSON.stringify(`gamebook-${version}`)};
const URLS = ${JSON.stringify(urls)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          if (event.request.mode === "navigate") {
            const index = await caches.match("/index.html");
            if (index) return index;
          }
          return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        });
    }),
  );
});
`;
}
