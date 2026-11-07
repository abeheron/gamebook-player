# Roadmap

Status: Draft. Not approved. These notes do not change the running app.

This file is the order for later work. Each feature has its own proposal in [docs/proposals/README.md](proposals/README.md). A proposal can become several small pull requests. A pull request is not tied to one proposal, and one proposal is not tied to one branch.

Do not start that work from this file alone. Wait until you accept a proposal, or a named slice inside it.

## Source

The rules source for later GNAT work is a local page-cited audit of *Temple of the Skull God* (Paul Partington, text copyright 2024). Citations below are 1-based PDF page numbers. Printed pages 6 to 15 match those numbers. The PDF is not in this repository, and these docs do not copy its prose or art.

Rules are credited to David M. Donachie, CC BY-SA 4.0, on PDF page 4. That credit is not a license for the book text or for Dean Spencer's art. See [content rights](content-rights.md).

The audit is not a conversion of all 573 playable sections. Book-specific exceptions below are the ones the audit checked. They are data requirements, not permission to special-case those section numbers in the engine.

Older design notes and the HTML mock treated some of these points as unknown or as demo choices. Where the PDF states a rule, this roadmap follows the PDF. Where the audit lists a residual case, this roadmap leaves it open.

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
| D4 | Each Wound reduces Vitality by one. Zero Vitality ends the adventure unless this book says otherwise. There is no universal rest action, ration price, or healing amount. | Page 8. Proposals 02 and 05. |
| D5 | The casting test in the magic chapter is a test against 10. Do not add Talent or Occult to that test unless Q1 is decided that way. | Page 9. Proposal 04. |
| D6 | Fight for the stated rounds at the stated penalty. A failed round is one Wound. A fumble adds one to that round's damage, if there is any. You can still win with failed rounds if you finish and survive. Choose a weapon each round. Unarmed is an extra -1. | Page 10. Proposal 02. |
| D7 | Book exceptions stay in book data. The engine does not grow a branch for section 361, section 552, or any other Temple section id. | Audit recommendation. Proposal 06. |

Still open. No proposal may pick a silent answer.

| Id | Question | Why it is open |
| --- | --- | --- |
| Q1 | Does Occult, or an item, change the casting test against 10? | Page 8 lists spellcasting under Occult. Page 9 states the test against 10 and does not name Occult or modifiers. |
| Q2 | When armour protection is partly used, is the Stealth, Swimming, or Climbing penalty the original rating or the protection still left? | Page 11 says the penalty equals the undamaged protection value and gives no depleted example. |
| Q3 | When you buy a point in a damaged stat, is the XP price the depleted value or the maximum? | Page 13 says the price is the current stat, and also says a damaged-stat purchase raises the maximum only. |
| Q4 | If both dice show the same eligible face, which die is the first 6, or the first 1 or 2? | Pages 10 and 11 say first and binding. They do not define die order. |
| Q5 | Is the resurrection grant one use, and does it cover endings that are not Vitality 0? | Section 552, PDF page 241, does not say. Section 509, page 222, is a different restoration. |
| Q6 | When text restores Vitality, what is the ceiling if it does not repeat the word maximum? | Talent restoration on page 7 is explicit. The Vitality paragraph on page 8 is not equally explicit. Maximum tracking still exists. |
| Q7 | If Vitality hits 0 during a multi-round fight, do the remaining rounds still roll? | Page 8 ends the adventure at 0. Page 10 says finish the rounds and survive. There is no worked example of hitting 0 mid-fight. |
| Q8 | After a rules-correct original adventure exists, does The Lantern Stair stay in the app beside it? | Product choice. The demo must keep working until that choice is made. |

Q2 also blocks a worked rule for several Wounds, a fumble, Invulnerability, and a wound-trigger effect in one round. Proposal 02 names that limit.

## Order

Tests and the screen that shows them land in the same pull request. Save migration lands in any pull request that changes `Session` or `SaveRecord`. Do not leave a rules change untested until a later UI pass.

1. **Character, tests, and Fortune.** Proposal 01, with the format fields and the save migration that change needs. Gate: an original short adventure, not Temple text, where a Talent test, double 1, double 6, one skill modifier, and one Fortune reroll match the PDF. The Lantern Stair demo still runs.
2. **Fight rounds and the reroll order, without armour.** Proposal 02. Gate: the same original adventure grows one fight. A failed round with Vitality still above 0 does not skip the rest of the fight. Fumble damage matches page 10. Two-handed and Disadvantage rerolls wait on Q4.
3. **Gear, carry limit, and armour uses.** Proposal 03. Gate: the original adventure can give a heavy item, refuse a seventh heavy slot at Vitality maximum 3, and ignore a chosen Wound until armour uses run out. Q2 stays open, so the skill penalty ships only after you answer it, or not at all in this increment.
4. **Magic at a fixed 10.** Proposal 04. Gate: one spell item in the original adventure. Success consumes it. Failure offers the page 9 choice. Occult is not added. Q1 stays open.
5. **Rest, XP, and Fortune from an XP award.** Proposal 05. Amounts come from the section, not from a global heal. The damaged-stat price waits on Q3. Resurrection stays book data and waits on Q5.
6. **Local book load, still not a Temple conversion.** Proposal 06. Gate: you can load one validated JSON file from the machine. The file is data. The full 573-section book is a separate later project.

Proposals 07 and 08 are not steps after these. Proposal 07 is the save contract every step uses. Proposal 08 is the screen contract every step uses.

## Checks for an accepted slice

The slice names the tests it adds. `npm test` covers engine and format cases. If the slice changes what you click, `npm run test:e2e` covers that path, including reload. A slice that changes `Session` includes a migration test from version 1.

`npm run typecheck` stays required. This repository has not shown an Omarchy run, and these plans do not add one.

## Not in this roadmap

Fighting Fantasy, other systems, a plugin loader, an authoring suite, remote AI, key storage, Capacitor, and phone or tablet shells stay out. Linux packages remain the Tauri targets already in `src-tauri/tauri.conf.json`. SQLite stays deferred behind `SaveStore`.

Shipping *Temple of the Skull God* would copy a book this repo does not have rights to redistribute. A later conversion, if you do it locally, is not one of the increments above.
