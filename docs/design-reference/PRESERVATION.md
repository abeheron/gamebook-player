# Design reference preservation

This note is part of the repository. It is not one of the archived files. `TOP-LEVEL-DOCS.SHA256` and `versions/v0.4/SHA256SUMS` do not list it, and those manifests were not edited.

## What this directory is

`docs/design-reference/` keeps a prototype snapshot for visual and historical reference. It is not the running app, not production code, and not the rules source for later GNAT work. The app does not import these files. Nothing here is approved as a feature, including sound on by default and the compact test panel.

The v0.4 HTML, previews, and audio are a demo with illustrative section text. They are not a definitive statement of the GNAT rules. Later planning uses the page-cited PDF audit in [the roadmap](../roadmap.md). Where the snapshot and the audit disagree, the audit is the later factual note. The snapshot was not rewritten to match it.

## Historical status

`CHANGELOG.md` and `design-decisions.md` say, as of 8 Nov 2026 00:28 (Asia/Jerusalem), that a reference-only commit was waiting on Lone Wolf and that nothing was committed yet. That wording is the record from before this directory was added. Leave it as written. It is not the current git status. The commit that added these files is reported with the pull request, not by editing those two documents.

`handoff.txt` already calls that 00:28 wording stale once a commit exists. The same label applies after the commit.

## v0.4 bytes

`versions/v0.4/` is the immutable baseline. Its `SHA256SUMS` covers 15 files and was checked after extraction. The HTML, README, audio, contact sheet, eight previews, `render_previews.py`, and `state-test.jsdom.js` stay byte for byte. Do not run those scripts to regenerate images or audio.

`TOP-LEVEL-DOCS.SHA256` covers only `design-decisions.md`, `CHANGELOG.md`, and `README.md` in this directory. Those three files stay byte for byte. `handoff.txt` is part of the archive and is not in that short manifest.

## Not in this tree

v0.5 is described in the changelog and the decision log as a trial of the compact panel (P01, still Trying, not approved). The v0.5 files were not in the archive and were not reconstructed. Paths such as `/workspace/gamebook-player-prototype/versions/v0.5/` are locations on the machine that packed the archive. They are not links in this repository.

Also absent, on purpose: a mutable root `index.html`, older version backups, and any book PDF or book text. v0.2 and v0.3 were not kept as full snapshots and were not rebuilt.

## Sound credit

The dice recording is credited in the archived README and in `design-decisions.md`. Short form: "Wooden dice on wodden table roll" by Wuzzy, file `Holzwürfel_auf_Holztisch_3.flac`, CC0, from the OpenGameArt page `https://opengameart.org/content/wooden-dice-on-wodden-table-roll`. The files here are an edit (first 1.0 second, fades, mono, limiter, MP3 at 96 kbps) plus a wav preview. That credit stays in the snapshot. Accepting the sound in the prototype log is not an approval to turn it on in this app.

## Fortune cost and cap

The archived handoff says the Fortune reroll cost, the Fortune cap of 3, and the demo fight length are illustrative, not verified from the book. That was the prototype's caution at the time. Keep that sentence. The later PDF audit, decision D1 in [the roadmap](../roadmap.md), does state that one Fortune rerolls one die and that Fortune's hard cap is 3. The audit does not turn the prototype into a rules source, and this note does not edit the prototype to pretend it already knew that.
