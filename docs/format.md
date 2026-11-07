# Book format

Books and system files are JSON. The TypeScript validator in `src/format/validate.ts` is the check a file has to pass before play. Unknown fields are errors. There is no `eval`, no script field, and no executable plugin.

A system file names stats and their starting values, minimums, and maximums. A book names that system and lists numbered sections. A section has plain-text paragraphs and exactly one of: choices, a test, or a combat.

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

## Effects

| op | meaning |
| --- | --- |
| `addItem` | add an item once |
| `removeItem` | remove that item id |
| `gainKeyword` | add a keyword once |
| `tick` | increment a named counter |
| `adjustStat` | add `by`, then clamp to the system min and max |

## Test

A test rolls its dice once. The roll passes when the total is less than or equal to the named stat plus an optional modifier. Success and failure each name a destination section and optional effects. The faces are stored on the session.

## Combat

Combat resolves one round per action. Each round uses the same roll-under test. A failure subtracts the wound amount from the wound stat. If that stat is then at or below `defeatAtOrBelow`, play moves to `defeatSection`. Otherwise, after `rounds` rolls, play moves to `then`. The pending round is part of the save, so a reload continues the fight and undo returns to the previous round.

## Not in this format yet

The list below is the format the app accepts today. Draft plans that would add fields are in [the roadmap](roadmap.md). Those plans are not implemented.

String expressions such as `has("lantern")`, gold, codeword titles that persist across books, roll-over tests, opposed rolls, crits, fumbles, re-roll resources, and per-book migrations. Section ids are decimal strings so they can match a printed book. The sample only has sections 1 through 8.

Saves are version `1` records: a timestamp plus the session. On load, `canRestore` checks the session against the book and system currently in memory and ignores anything else.
