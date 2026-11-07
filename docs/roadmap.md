# Roadmap

Status: Draft. Not approved. These notes do not change the running app.

This file is the order for later work. Each feature has its own proposal in [docs/proposals/README.md](proposals/README.md). A proposal can become several small pull requests. A pull request is not tied to one proposal, and one proposal is not tied to one branch.

Do not start that work from this file alone. Wait until you accept a proposal, or a named slice inside it.

## Source

The rules source for later GNAT work is a local page-cited audit of *Temple of the Skull God* (Paul Partington, text copyright 2024). Citations below are 1-based PDF page numbers. Printed pages 6 to 15 match those numbers. The PDF is not in this repository, and these docs do not copy its prose or art.

Rules are credited to David M. Donachie, CC BY-SA 4.0, on PDF page 4. That credit is not a license for the book text or for Dean Spencer's art. See [content rights](content-rights.md).

The audit is not a conversion of all 573 playable sections. Book-specific exceptions below are the ones the audit checked. They are data requirements, not permission to special-case those section numbers in the engine.

Older design notes and the HTML mock treated some of these points as unknown or as demo choices. The saved mock is under [design reference](design-reference/PRESERVATION.md). It is not edited to match this audit. Where the PDF states a rule, this roadmap follows the PDF. Where the audit lists a residual case, this roadmap leaves it open.

## What already runs

The playable book is the original sample `tests/fixtures/lantern-stair.json`, using `gnatDemoSystem` from `src/systems/gnat/demo.json`. That system file is a demo. Its Talent maximum of 12 and its other bounds are sample values, not the PDF.

`rollTest` in `src/engine/rules.ts` succeeds when the dice total is at or under the stat plus an optional modifier. It does not treat double 1 or double 6 as special, and it does not spend Fortune.

`rollCombatRound` applies one wound on a failed round and can leave the section early when the wound stat is at or below `defeatAtOrBelow`. The PDF fight does not work that way. A failed round is not by itself a loss. You finish the stated rounds and you still have to survive. See proposal 02.

Fortune is on the sheet and is never spent. The PDF costs one Fortune to reroll one die, with a hard cap of 3 (pages 8 and 9).

`App.svelte` keeps a held roll in the page until you take the pass, fail, or fight-over turn. That hold is not part of `Session`, so a reload drops it. View Back and Esc restore scroll. `undo` rewinds story state. IndexedDB stores `SaveRecord` version 1 through `createIndexedDbStore`.

Details of the current format are in [format.md](format.md). Module boundaries are in [architecture.md](architecture.md).

## Decision register

Resolved by the PDF. Do not reopen these as if the mock were still the source.

| Id | Decision | Where it is written |
| --- | --- | --- |
| D1 | After any dice roll, one Fortune rerolls one die. You may spend again. Fortune does not come back by itself. The hard cap is 3. One or more XP from a single award grants one Fortune, not one Fortune per point. | Pages 8, 9, and 13. Proposal 01 and proposal 05. |
| D2 | A new character starts at Talent 9, Vitality 3, and Fortune 3, with two basic skills, a weapon choice, a ration, and 10 gp. Up to three times, you may trade one Talent for one more basic skill. Only Fortune has this explicit cap of 3. Starting numbers are not lifetime caps for Talent or Vitality. | Pages 6 and 13. Proposal 01. |
| D3 | A Talent test succeeds when the 2d6 total is at or under Talent. Equal succeeds. Natural double 1 succeeds. Natural double 6 fails. Modifiers change Talent, not the dice. Talent cannot be restored above its maximum. The floor is 2. | Page 7. Proposal 01. |
| D4 | Each Wound reduces Vitality by one. Zero Vitality ends the adventure. A book effect can replace that ending. Remaining fight rounds are not rolled after that default ending. There is no universal rest action, ration price, or healing amount. | Page 8. Proposals 02 and 05. Page 10 still says a failed round is not, by itself, a lost fight while you are alive. |
| D5 | The casting test in the magic chapter is a test against 10. Do not add Talent or Occult to that test unless Q1 is decided that way. | Page 9. Proposal 04. |
| D6 | Fight for the stated rounds at the stated penalty. A failed round is one Wound. A fumble adds one to that round's damage, if there is any. You can still win with failed rounds if you finish and survive. Choose a weapon each round. Unarmed is an extra -1. | Page 10. Proposal 02. |
| D7 | Book exceptions stay in book data. The engine does not grow a branch for section 361, section 552, or any other Temple section id. | Audit recommendation. Proposal 06. |

Still open. No proposal may pick a silent answer.

| Id | Question | Why it is open |
| --- | --- | --- |
| Q1 | Does Occult, or an item, change the casting test against 10? | Page 8 lists spellcasting under Occult. Page 9 states the test against 10 and does not name Occult or modifiers. |
| Q2 | When armour protection is partly used, is the Stealth, Swimming, or Climbing penalty the original rating or the protection still left? | Page 11 says the penalty equals the undamaged protection value and gives no depleted example. |
| Q3 | When you buy a point in a damaged stat, is the XP price the depleted value or the maximum? | Page 13 says the price is the current stat, and also says a damaged-stat purchase raises the maximum only. |
| Q4 | Which die is first when both show the eligible face, and what is the order between the two-handed reroll and Disadvantage? | Pages 10 and 11 say the first 6, and the first die showing 1 or 2. They do not say which die is first. They also do not order those two rerolls against each other. Advantage is after other rerolls. Fortune is after other rerolls. That does not fix this gap. |
| Q5 | Is the resurrection grant one use, and does it cover endings that are not Vitality 0? | Section 552, PDF page 241, does not say. Section 509, page 222, is a different restoration. The default ending at Vitality 0 is not this question. |
| Q6 | When text restores Vitality, what is the ceiling if it does not repeat the word maximum? | Talent restoration on page 7 is explicit. The Vitality paragraph on page 8 is not equally explicit. Maximum tracking still exists. |

Q2 also blocks a worked rule for several Wounds, a fumble, Invulnerability, and a wound-trigger effect in one round. Proposal 02 names that limit.

The Lantern Stair demo stays in the app while these drafts are reviewed. Removing it, or making another book the one that opens, is a later product choice. It is not a rules gap, and these drafts do not ask for that choice.

## Order

Tests and the screen that shows them land in the same pull request. Save migration lands in any pull request that changes `Session` or `SaveRecord`. Do not leave a rules change untested until a later UI pass.

1. **Character, tests, and Fortune.** Proposal 01. The pure test-result slice does not change the save schema. The Fortune-spend slice does, and it includes the version and migration checks from proposal 07. Any new book field in that slice is validated in the same pull request. Gate: an original short adventure, not Temple text, where a Talent test, double 1, double 6, one skill modifier, and one Fortune reroll match the PDF. The Lantern Stair demo still runs.
2. **Fight rounds, without a full reroll sequence.** Proposal 02. Gate: the same original adventure grows one fight. A failed round with Vitality still above 0 does not skip the rest of the fight. Vitality 0 ends the adventure, so later rounds do not roll, unless that section's own effect replaces the ending. Fumble damage matches page 10. Two-handed and Disadvantage rerolls wait on Q4. Advantage and Fortune stay described only as coming after other rerolls.
3. **Gear, carry limit, and armour uses.** Proposal 03. Gate: the original adventure can give a heavy item, refuse a seventh heavy slot when maximum Vitality is 3, and ignore a chosen Wound until armour uses run out. A Wound that leaves the maximum unchanged does not shrink that slot count. Q2 stays open, so the skill penalty ships only after you answer it, or not at all in this increment.
4. **Magic at a fixed 10.** Proposal 04. Gate: one spell item in the original adventure. Success consumes it. Failure offers the page 9 choice. Occult is not added. Q1 stays open.
5. **Rest, XP, and Fortune from an XP award.** Proposal 05. The effect that states a healing amount is added in that same pull request. It does not wait on a later book-loading project. The damaged-stat price waits on Q3. How long a resurrection grant lasts waits on Q5. The default at Vitality 0 does not.
6. **Local book load, still not a Temple conversion.** This is the last slice of proposal 06, after the schema slices above exist. Gate: you can load one validated JSON file from the machine. The file is data. The full 573-section book is a separate later project.

Proposals 07 and 08 are not steps after these. Proposal 07 is the save contract every step uses. Proposal 08 is the screen contract every step uses.

## Checks for an accepted slice

The slice names the tests it adds. `npm test` covers engine and format cases. If the slice changes what you click, `npm run test:e2e` covers that path, including reload. A slice that changes `Session` includes a migration test from version 1.

`npm run typecheck` stays required. This repository has not shown an Omarchy run, and these plans do not add one.

## Not in this roadmap

Fighting Fantasy, other systems, a plugin loader, an authoring suite, remote AI, key storage, Capacitor, and phone or tablet shells stay out. Linux packages remain the Tauri targets already in `src-tauri/tauri.conf.json`. SQLite stays deferred behind `SaveStore`.

Shipping *Temple of the Skull God* would copy a book this repo does not have rights to redistribute. A later conversion, if you do it locally, is not one of the increments above.
