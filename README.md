# gamebook-player

Lean foundation for an offline gamebook reader. It plays one original sample, The Lantern Stair, in a Svelte app with a small TypeScript rules engine. The same build is an installable web app and the page loaded by a thin Tauri shell on Linux.

This is not the full player. Fighting Fantasy, a plugin SDK, authoring, remote AI, and native secret storage are not implemented. See [docs/architecture.md](docs/architecture.md).

## Commands

```bash
npm ci
npm run dev          # http://localhost:5173
npm run typecheck
npm test
npm run build
npm run preview
npm run test:e2e     # needs Playwright Chromium: npx playwright install chromium
npm run tauri:check  # Rust 1.90+ and WebKitGTK dev libraries
npm run tauri dev    # Linux desktop shell, when those libraries are installed
npm run tauri build  # Linux packages listed in src-tauri/tauri.conf.json
```

WebKit packages used for the shell check are the Tauri Linux prerequisites: `libwebkit2gtk-4.1-dev`, `build-essential`, `libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, and `patchelf`.

## What the demo does

The sample book is original text in `tests/fixtures/lantern-stair.json`. It uses a GNAT-shaped sheet (Talent, Vitality, Fortune) defined in `src/systems/gnat/demo.json`. You can choose, tick a box, roll 2d6 under Talent, resolve a two-round combat, undo, and continue after reload. Saves go to IndexedDB on web and in the Linux webview. A production build registers a service worker and can open again while offline.

Fortune is shown and is never spent. Double ones, double sixes, skills, items with weight, and the rest of the GNAT rules are not in this demo.

## Layout

- `src/ui` reader, choices, sheet, and combat
- `src/engine` state, dice, rules, and undo, with no UI or storage imports
- `src/format` book types and validation
- `src/systems/gnat` the demo system file
- `src/storage` the save contract, an in-memory adapter, and IndexedDB
- `src/platform` web service-worker registration and a Tauri-versus-web check
- `src-tauri` the Linux shell and its permissions
- `public` the web manifest and icons
- `tests/fixtures` the original sample
- `tests/unit` and `tests/e2e`
- `docs` architecture, the book format, and content rights

No license is chosen for this repository. The sample's rights note is in [docs/content-rights.md](docs/content-rights.md).
