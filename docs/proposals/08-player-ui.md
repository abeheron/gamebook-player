# Player UI

Status: Draft. Not approved.

## Outcome

The screens you already have show the rules from the other proposals. Read, Sheet, the test, and the fight stay the places where those rules appear. There is no later pull request whose only job is "add the UI". Each rule slice includes the control and the browser test for that control.

## In scope

- `Reader.svelte` shows the Talent being compared, the dice faces, double 1 or double 6 when they decided the test, and the Fortune control when a spend is legal.
- `Combat.svelte` shows the round, the weapon choice, the penalty, and the reroll steps that are actually legal. It does not offer a two-handed reroll while [Q4](../roadmap.md) is open.
- `Sheet.svelte` shows current and maximum when the character has both, skills, Fortune, heavy slots, and armour uses. It does not show a Rest button or an XP button that the engine does not implement.
- `Choices.svelte` keeps showing the destination section id. New effects do not turn choices into code.
- View Back, Esc, and Undo turn stay distinct, as they are in `App.svelte` today.
- The original short adventure is readable in this layout. The Lantern Stair demo keeps this layout too.

## Out of scope

- Library, rules encyclopedia, illustration modes, sound, and dice animation. The mock has them. The PDF does not require them for play.
- Manual dice entry. The audit found no dice-order instruction for the player, and Q4 is the engine question. A manual-entry mode is a separate product choice, not part of these slices.
- A second rules implementation in the component. Svelte calls `rollTest`, the future pure roll function, and `rollCombatRound`. It does not reimplement doubles or the Fortune cap.
- Mobile shells, Capacitor, and a claim that Omarchy was tested.

## Current code

`App.svelte` owns `session`, `arrival`, `history`, and the IndexedDB writes. `rollFormula` in `wording.ts` prints the demo formula. It is display text. The comparison still happens in `rollTest`.

`TickBox.svelte` draws a tick. Ticks are not buttons. That stays, because the engine sets them.

`detectRuntime` only labels web or Tauri. It does not grant filesystem access. A file picker for [proposal 06](06-book-format-and-effects.md) uses the browser file input, which does not need a Tauri plugin.

The sheet copy says the demo numbers are the sample's and that Fortune is not spent. Update that copy only in the pull request that actually spends Fortune, and only on the rules-correct adventure. Do not change the demo sentence into a claim that the PDF cap is already implemented.

## Two shapes

**One screen per rule chapter.** Add Test, Fight, Magic, and Inventory as more nav items, and move rules into those pages. The mock is built that way. The running app hangs the test and the fight on the section, which is where the book puts them.

**Keep the section as the page.** The test panel and the fight panel stay on Read. Sheet gets the longer character details. New rules add controls inside those panels. Nav stays Read and Sheet unless a control does not fit, in which case you say so in that pull request rather than adding Library or Rules.

Use the second. A spell cast from a section is still a section action. A separate Magic screen would duplicate `Reader.svelte` or drift from it.

## Proposed change

- When proposal 01 lands Fortune, the test panel's buttons call the engine, then show the faces the engine returned. The formula text is built from that result, not from a second copy of the math in `wording.ts`.
- When proposal 02 lands rounds, the fight panel lists one row per round from `RollRecord` data, including rerolls once they exist.
- When proposal 07 moves the pending roll into `GameState`, delete `Arrival` rather than keeping both.
- Disabled controls explain the PDF reason in plain text, the way a missing tick already explains itself in `blockedBecause`. They do not explain a rule we have not accepted.

## PR slices

There is no independent UI schedule. The slices are the screen parts of the other proposals.

| Rule slice | Screen change | Browser check |
| --- | --- | --- |
| Proposal 01, Fortune | Spend control on the test you just rolled | Reload keeps the new face and the new Fortune |
| Proposal 01, skills | Sheet lists the skill and the +2 or -2 | A skill test shows the modified Talent |
| Proposal 02, rounds | Fight log does not jump away on the first miss | Reload mid-fight |
| Proposal 02, rerolls after Q4 | Buttons only for legal rerolls | Fortune is refused if it is offered before the mandatory reroll |
| Proposal 03 | Heavy count and armour uses on the sheet | Ignore one Wound and reload |
| Proposal 04 | Cast and the failure choice on the section | The two failure results |
| Proposal 05 | No Rest button until a section effect exists | Vitality 0 shows the default ending |
| Proposal 06, file load | Error text from `BookValidationError` | Unknown key does not start play |
| Proposal 07 | Undo turn and Back, unchanged in meaning | Back does not change the section |

## Tests

The browser checks in the table are the tests. Add them in the rule's pull request, in `tests/e2e`, beside the unit tests. A screen change without a click-through test is not done.

Also keep the current e2e path: save, reload, undo, offline reload, and phone-width Back. Those cover the demo. New tests should use the original adventure when they need PDF behavior the demo does not have, so the demo test does not become a GNAT test by accident.

## Sources

The layout you are extending is the current `src/ui` code, not the six-screen mock. The rules shown on those screens are the PDF pages cited in proposals 01 to 05. Display does not create a rule. If a widget needs a fact the decision register marks open, the widget waits.

## Open questions

Q4, Q6, and Q7 change which buttons exist. Do not add a disabled button that guesses the missing answer.

Q8 changes whether the demo and the new adventure are both in the nav. Until then, do not remove The Lantern Stair from the build.

## Done when

Every accepted rule slice in the table has its browser check, `Arrival` is gone if the pending roll moved into `GameState`, and the nav still does not contain Library, Rules, or a Magic item that bypasses the section.
