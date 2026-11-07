# Architecture

Gamebook Player is one Svelte and Vite app. There is no monorepo and no server. The rules engine is plain TypeScript. The web build and the Tauri shell share it.

```text
book JSON -> format validation -> engine -> Svelte UI
                 ^                  |
                 |                  v
            system JSON         IndexedDB
```

Imported books are data. The validator allowlists keys, conditions, and effects. Nothing in a book is evaluated as JavaScript, and there is no plugin loader.

## Targets

The first targets are an installable offline web app and a Linux desktop shell. Tauri is configured for deb, rpm, and AppImage icons only. macOS and Windows bundles are not set up. iOS and Android are not targets. Capacitor is not a dependency.

Omarchy (Arch with Hyprland) has not been run in this environment. A passing `cargo check` on Ubuntu, or a CI run on `ubuntu-latest`, is not an Omarchy compatibility test. That still has to be done on Omarchy itself.

The shell's capability file grants `core:default` to the main window. It does not grant filesystem, shell, HTTP, or secret-storage commands. The page uses IndexedDB in the system webview, the same adapter as the browser. SQLite is not included. A later native build can add a SQLite adapter behind `SaveStore` if IndexedDB in the webview becomes a real limit.

## Engine

`src/engine` imports the format types and the validator's section lookup. It does not import Svelte, IndexedDB, `fetch`, Node, or Tauri. Dice use an injected random function so tests can script the faces. Undo stores prior state, including combat rounds and recorded rolls, and each save writes that whole session.

The implemented combat step is a fixed number of roll-under rounds defined by the sample book. One failed round reduces a stat. Reaching the sample's wound threshold moves to that book's defeat section. This is not a general combat-template language, and it is not the prototype's three-round fight, a stated modifier, or a rule about stopping at Vitality 0.

The reading screen can hold a roll until you take its pass, fail, or fight-over turn. That pause is only in the page. The engine's roll functions are unchanged: once the turn is taken, the same session is saved and can be undone. Back and Esc move between Read and Sheet and restore scroll. They do not call undo.

## Web app

Vite builds a static `dist`. The production build adds a content security policy and writes `sw.js`, which precaches that build. `npm run dev` does not register the service worker. The manifest and icons are in `public`.

## Deferred

- Full GNAT rules: skills, Fortune rerolls, double 1, double 6, armour, spells, encumbrance, titles, rest, and experience. Draft proposals, not an implementation, are in [docs/roadmap.md](roadmap.md).
- Fighting Fantasy and any other system
- Expression strings. Conditions and effects are JSON objects on an allowlist
- YAML authoring, JSON Schema files, Project Aon import, ink or Twine export
- Map, notes, campaigns, and an editor
- Book import UI. The sample is bundled and still passes through the validator
- Remote AI conversion, link checking, and illustration
- API keys. There is no key field and no native secret store
- Sync, accounts, and hosting

## AI, keys, and uploads

The reader does not call a network. If a later converter sends a book to a model, that upload needs a separate consent step and must stay out of the offline player. A browser cannot safely hold a provider API key: the key is visible to the page, and many providers block browser requests with CORS. Provider guidance is to keep keys off the client. A native command with OS secret storage would be a later, separate decision. It is not wired up here.
