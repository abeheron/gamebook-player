# gamebook-player

Lean foundation for an offline gamebook reader. It plays one original sample, The Lantern Stair, in a Svelte app with a small TypeScript rules engine. The same build is an installable web app and the page loaded by a thin Tauri shell on Linux.

This is not the full player. Fighting Fantasy, a plugin SDK, authoring, remote AI, and native secret storage are not implemented. See [docs/architecture.md](docs/architecture.md). Draft plans for a later rules-correct original adventure are in [docs/roadmap.md](docs/roadmap.md). They are not approved and they do not change this demo. An archived HTML prototype, not used by the app, is described in [docs/design-reference/PRESERVATION.md](docs/design-reference/PRESERVATION.md). The approved compact skill-test panel is described in [docs/p01-compact-skill-test.md](docs/p01-compact-skill-test.md). The approved parchment layout, which stays parchment when the system theme is dark, is described in [docs/p07-layout.md](docs/p07-layout.md). The character sheet and keyword log are described in [docs/p08-character-log.md](docs/p08-character-log.md). The rules summary is described in [docs/p12-rules.md](docs/p12-rules.md). The test and fight screen is described in [docs/p09-test-and-fight.md](docs/p09-test-and-fight.md). Dice animation and the recorded roll sound are described in [docs/p20-dice-settings.md](docs/p20-dice-settings.md).

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

The sample book is original text in `tests/fixtures/lantern-stair.json`. Talent, Vitality, and Fortune use those GNAT names. New game, and a first open with no save, go to the New character screen. You pick two basic skills and a one-handed, long, or two-handed weapon, with a shield only alongside a one-handed weapon. Up to three times you may give up 1 Talent for one more skill. The character starts at Talent 9 less any trades, which is also its maximum Talent, Vitality 3, Fortune 3, 10gp, and one ration. Nothing is saved until Begin adventure, which opens the book's start section. Weapon and shield bonuses in fights are not applied yet. A test that names a skill adds that skill's bonus, or −2 when the character lacks it. Stat maxima in the system file are still sample bounds. You can choose, tick a box, roll 2d6 under the adjusted Talent, take the pass or fail turn, resolve the sample's two-round fight and continue, undo the story, and reload. Saves go to IndexedDB on web and in the Linux webview. Saves from versions 1 to 4 are migrated to version 5, which adds the weapon, the shield, and the Talent maximum. A production build registers a service worker and can open again while offline.

Screen Back, including Esc, returns to the previous screen and its scroll. It does not rewind the story. Undo turn does. One Fortune rerolls one selected die, and Fortune does not rise above 3. The sample does not include double ones, double sixes, or item weight.

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
