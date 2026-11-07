# Saves, undo, and backups

Status: Draft. Not approved.

## Outcome

A reload restores the character, the round, and a Fortune reroll you already confirmed. Undo returns to the previous story state, including the state before that reroll. You can export a save file and load it back. View Back still does not rewind the story.

## In scope

- `SaveRecord.version` moves forward when `Session` changes. `canRestore` accepts the versions the app still supports and rejects the rest.
- A migration from version 1, the shape `createIndexedDbStore` writes today.
- Undo entries that include reroll steps and armour uses, not only the section id.
- Export and import of the save record as a file the player keeps. This is not a server backup.
- The same `SaveStore` on the web build and in the Tauri webview. No second database.

## Out of scope

- SQLite, cloud sync, accounts, and several named campaign slots, unless a later proposal asks for slots. The store can keep using one slot until then.
- Treating browser history as undo.
- Saving an unconfirmed UI hover or an uncommitted die animation. There is no die animation in the app.

## Current code

`SaveRecord` is `{ version: 1, savedAt, session }`. `GameState` has one number per stat, items, keywords, ticks, rolls, and `pending` combat. `undo` stores prior `GameState` values, capped in `rules.ts`.

`canRestore` checks the book id, stat keys, and a combat `pending` that matches the current section. Extra future fields will fail that check, which is what we want until a migration exists.

`App.svelte` holds `Arrival` outside `session`. The save effect writes `session` only. A reload during a held pass or fail turn drops the roll. That is acceptable for the demo. It is not acceptable after Fortune, because the spend has to survive reload.

View history is `history` in `App.svelte`, separate from `session.undo`. Esc calls `backView`. The Undo turn button calls `undo`.

## Two shapes

**Keep the held roll in the component.** Easy, and it matches today. A Fortune spend in that object is lost on reload, or you must remember to copy it into `session` in the component. That is a second write path.

**Put the pending roll on `GameState`.** The engine records the roll, the reroll log, and whether you have accepted the section change. `createIndexedDbStore` saves that state. `undo` pops it. The component stops keeping a parallel `Arrival` once this slice lands. View Back stays in the component, because it is scroll and screen, not story.

Use the second when proposal 01 adds Fortune. Leave `Arrival` in place for the demo until that pull request. Do not write both for the same action.

## Proposed change

- Each pull request that changes `Session` bumps `SaveRecord.version` and migrates older records, or it refuses them with a visible error. Silent field drops are not allowed.
- Export writes the record the store would write. Import runs the same migration and `canRestore`.
- Undo of a Fortune reroll restores the Fortune point and the previous faces.
- Back and Esc stay on `history`. A test that opens Sheet and comes back must not change Vitality or the section.

## PR slices

This proposal does not end in one large save pull request. The slices attach to other work.

1. With the first Fortune spend, move the pending roll into `GameState`, migrate version 1, and add the reload test.
2. With combat rounds, assert that `pending` and the round log reload, and that undo restores the previous round.
3. Export and import, after the version path exists. A browser test downloads nothing to the network. It uses a file the page creates.

## Tests

- A version 1 Lantern Stair save still loads after the migration, or the game shows a clear refusal. It does not half-load.
- Spend Fortune, reload, Fortune is one lower, and the new face is the one you saved.
- Undo that spend. Fortune and the face return. The section does not change if you had not accepted the turn.
- Mid-fight reload shows the same round index `PendingCombat` would have shown.
- Sheet, then Back, does not call `undo`. Esc does the same.
- Import of a record with the wrong `bookId` is ignored, as `canRestore` ignores it today.
- Import of a future version the app does not know is refused.

## Sources

The behavior comes from the current `SaveStore` and from the need to keep D1's Fortune spend. The PDF does not describe software saves. Do not invent a rules reading to justify a save format.

Rights: an exported save must not require Temple text to be embedded by the app. If the player has loaded a book, the save stores ids and numbers, not a second copy of copyrighted prose, unless we later design that on purpose. This proposal does not add that copy.

## Open questions

No rules question in the register is answered by the save format. The version 1 demo save still needs an explicit migration when `Session` changes. That requirement first applies to the Fortune slice of [proposal 01](01-character-tests-fortune.md), not to its pure test-result slice.

## Done when

The Fortune slice's migration test and reload test exist, and the Back-is-not-undo test exists. The pure test-result slice has neither a version bump nor a migration. `SaveStore` is still the only storage interface. SQLite is still absent.
