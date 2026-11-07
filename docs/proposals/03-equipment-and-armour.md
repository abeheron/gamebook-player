# Equipment and armour

Status: Draft. Not approved.

## Outcome

The sheet can carry ordinary items without a count limit, refuse heavy items past 2 times maximum Vitality, and let you ignore individual Wounds up to the armour's remaining uses. Item skill bonuses do not stack. The highest one applies.

## In scope

- Ordinary items are unlimited. Coins are unlimited. Treasure is not spendable until a section says you sold it.
- Every weapon, shield, and armour piece is heavy. Other heavy items are marked heavy in data.
- Capacity is 2 times maximum Vitality, not 2 times current Vitality.
- Light, Medium, and Heavy armour protect 1, 2, and 3. You choose which Wounds to ignore, up to that many uses in one adventure. Unused protection is not a penalty subtracted from every round.
- Repair restores protection. The price and the place are section data.
- On a skill test, if several items add a bonus to that skill, only the highest bonus counts. It does not add to the skill's own +2 as a second stack of the same kind. The skill's +2 or -2 still comes from [proposal 01](01-character-tests-fortune.md). The item bonus is a further Talent modifier, and only the best item contributes.
- Shield and weapon flags that [proposal 02](02-combat-and-rerolls.md) reads: hands used, magical Advantage, shield versus one opponent or several.

## Out of scope

- The Stealth, Swimming, and Climbing penalty while Q2 is open.
- A worked sequence for a fumble, several Wounds, Invulnerability, and a book effect on the same round. That is the second half of Q2.
- Shops from Temple sections 227 and 296. A repair effect can exist. Those section numbers do not.
- Encumbrance puzzles beyond the heavy-item count.

## Current code

`NamedValue` is an id and a label. `addItem` refuses a duplicate id. There is no heavy flag, no coin field, and no armour uses. `GameState.items` is the whole inventory.

`adjustStat` is the only way to lose Vitality. Nothing records that a Wound was ignored.

## Two shapes

**Items as strings plus side maps.** Keep `items` as names, and store armour uses on `GameState` under another field the book must keep in sync.

**One item record.** An item has id, label, tags (`heavy`, `weapon`, `shield`, `armour`), and optional numbers (protection, uses left, skill bonus, hands). The sheet and the fight read that record.

Use the second. One record cannot claim a sword is heavy in the fight and not heavy in the pack. Books still cannot invent new tags. Unknown tags fail `validateBook`.

## Proposed change

- Extend the item effect so a book can add a tagged item. `addItem` with only id and label remains valid for the demo.
- Capacity is 2 times maximum Vitality. At a maximum of 3, the limit is 6 heavy items. A Wound lowers current Vitality and does not change that limit. If the maximum itself changes, the limit changes with it.
- When a round would deal one or more Wounds, the player may assign armour uses to individual Wounds, including the fumble Wound if it exists. Uses left fall by that many. This slice does not decide the skill penalty.
- Selling treasure is an effect that removes the item and adds coins, only when the section includes that effect.

## PR slices

1. Tagged items, heavy count, and a sheet line. Unit tests for the limit. The demo lantern stays a normal item.
2. Armour uses on the wound step from proposal 02. Browser test: ignore one Wound, reload, the use is gone and Vitality did not drop for that Wound.
3. Highest item skill bonus on a Talent test. Blocked tests for the armour skill penalty until you answer Q2.

## Tests

- Six heavy items fit when maximum Vitality is 3. The seventh is refused.
- Current Vitality falls from 3 to 1. The maximum stays 3. Capacity stays 6.
- The maximum itself falls from 3 to 2. Capacity becomes 4, because the rule is 2 times the maximum.
- A non-heavy item does not consume a slot.
- Two skill items, +1 and +2, contribute +2, not +3.
- Protection 2 ignores two chosen Wounds in the adventure, then the third Wound lands.
- Repair sets uses back to the rating. It does not raise the rating.
- Coins can increase without a heavy slot.

## Sources

PDF pages 11 and 12. Armour ratings and the "per adventure" choice are on page 11. Capacity and the highest-bonus rule are on page 12. Q2 in the [roadmap](../roadmap.md).

## Open questions

Q2. Do not ship a penalty of "protection still left" or "original rating" as if page 11 had an example. The phrase there is "undamaged protection value".

## Done when

Slices 1 and 2 have tests. Slice 3's stacking test exists. The skill-penalty test is not written as a passing canon test while Q2 is open.
