# Book format

Books and system files are JSON. The TypeScript validator in `src/format/validate.ts` is the check a file has to pass before play. Unknown fields are errors. There is no `eval`, no script field, and no executable plugin.

A system file names stats and their starting values, minimums, and maximums. It also names the skill list, the basic-skill bonus, the penalty for a named skill the character lacks, and the sample character's starting skills, gold, and items. A book names that system and lists numbered sections. A section has plain-text paragraphs and an exit: choices, a test, a test with choices beside it, a combat, or a test before a combat (P35). A combat never shares its section with choices.

## Dice

Dice strings are `NdS`, `NdS+M`, or `NdS-M`, with small bounds (at most 20 dice, at most 100 sides, modifier from -20 to 20). `2d6` is the sample's roll.

## Conditions

| op | meaning |
| --- | --- |
| `hasItem` | the item id is on the sheet |
| `keyword` | the keyword id has been gained |
| `ticked` | that tick's count is at least 1 |
| `statAtLeast` | the stat is at least `value` |
| `not` | the nested condition is false |
| `all` | every nested condition is true |
| `testFailed` | only on a choice beside a test: the section's held test roll has failed. No roll yet, or a pass, keeps the choice locked |

## Effects

| op | meaning |
| --- | --- |
| `addItem` | add an item once |
| `removeItem` | remove that item id |
| `gainKeyword` | add a keyword once |
| `tick` | increment a named counter |
| `adjustStat` | add `by`, then clamp to the system min and max |
| `adjustGold` | add `by` to the coin pouch, which never goes below 0 |

## Test

A test rolls its dice once. The roll passes when the total is less than or equal to the named stat plus an optional modifier. If the test names a skill, the character's bonus for that skill is included in the target before the roll is judged. A skill the character does not have contributes the system's absent-skill penalty instead. A test that names no skill does not apply either number. Success and failure each name a destination section and optional effects. When the section also has choices, either result may leave out its destination, or be left out entirely: that result stays on the section and the player picks a choice. Effects on a result that stays apply as soon as the roll settles, and a Fortune re-roll that changes the result swaps them. A pass that stays needs at least one choice that is not `testFailed`. The faces are stored on the session. The stored total is the dice total. It does not have the skill bonus added to it.

## Combat

Combat resolves one round per action. Each round uses the same roll-under test. A failure subtracts the wound amount from the wound stat. If that stat is then at or below `defeatAtOrBelow`, play moves to `defeatSection`. Otherwise, after `rounds` rolls, play moves to `then`. With no `defeatSection`, a defeat ends the adventure: play stays on the fight's section and the reader shows a Game over card (P33) with New game and Library; Undo turn in the toolbar can still rewind the last round. The pending round is part of the save, so a reload continues the fight and undo returns to the previous round.

A combat may carry `edge`: `"advantage"` or `"disadvantage"` (pp. 10–11). With `edge` it may also carry `unless`, up to four boxes (`id`, `label`) the player ticks before round 1, such as "I can cast a flight spell". Any one ticked removes that edge. The boxes are not read from the sheet yet.

Re-rolls in a fight round happen in this order. Disadvantage re-rolls the first 1 or 2, left to right. Then a two-handed weapon re-rolls the first 6, which can be the face Disadvantage just rolled; this applies in every fight. Both are automatic and the second result stands. Then Fortune, as often as the player pays for it, which may re-roll a die already replaced. Then, with Advantage, one free re-roll of any die, once per round; after it, the round takes no more re-rolls. If both Advantage and Disadvantage apply, they cancel at resolution time and neither does; the data never pre-cancels. Each fight roll stores its re-rolls (`index`, `from`, `to`, `by`) so the reader can show the replaced face. The round that ends the fight can still be re-rolled before the player continues.

## Test before a combat

A section may have a test and a combat together. The combat then must set `afterTest: true`, and the fight stays locked until the test is settled. Each result may:

- turn to a section with `to`, so the fight never opens;
- open the fight, applying its `effects` first (a Wound here is taken before round 1 and is not a fight-round wound) and fighting with its `edge`, if any;
- be left out, which opens the fight as normal.

`edge` is allowed only on such a result, and not with `to`. A test with `optional: true` (the section says "you can try") may be skipped, which takes the fail result without a roll. Only a test before a combat may be optional. A test during a fight is not in the format yet.

## Not in this format yet

The list below is the format the app accepts today. Draft plans that would add fields are in [the roadmap](roadmap.md). Those plans are not implemented.

String expressions such as `has("lantern")`, titles that persist across books, roll-over tests, opposed rolls, crits, fumbles, assault values, tests during a fight, and a shop. Gold is a number on the character; `adjustGold` changes it. Section ids are decimal strings so they can match a printed book. The sample has sections 1 through 9.

Saves are version `6` records: a timestamp, the session, and bookmarks. Older versions are migrated on load. Version `1` gains the sample's starting skills, gold, and any starting item that is missing. Versions `1` to `4` gain a Talent maximum, a one-handed weapon, and no shield. Versions `1` to `5` gain `fight: null`, the fight set-up that holds a settled test before a fight and ticked boxes. Each change is made on the current state and on each undo entry. On load, `canRestore` checks the migrated session against the book and system currently in memory and ignores anything else.
