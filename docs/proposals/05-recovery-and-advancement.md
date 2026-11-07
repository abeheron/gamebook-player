# Recovery and advancement

Status: Draft. Not approved.

## Outcome

Vitality 0 ends the adventure by the default on PDF page 8, unless the section you are in carries a book effect that replaces that ending. Rest and rations heal only what that section states. Between adventures, or at a Rest that allows it, you can spend XP at the page 13 prices. One XP award of one or more points grants one Fortune, up to the cap of 3.

## In scope

- A default game-over when Vitality hits 0 and the section has no replacement effect.
- Rest is not a button on the sheet. A section effect may restore Talent, Vitality, or both, by the amount that section states.
- XP fields on the character: unspent points, and the purchases page 13 names.
- +1 Talent costs the current Talent in XP. +1 Vitality costs twice the current Vitality. +1 to a skill bonus costs the existing bonus. A new basic skill costs 2 XP.
- Buying a point in a damaged stat raises the maximum only, not the current value. The price input to that sentence is Q3.
- Fortune +1 when an award gives one or more XP. A second point of that same award does not grant a second Fortune.

## Out of scope

- A universal "rest heals all" action. The audit's examples disagree with each other: a paid meal, a night's rest, and a ration each state their own result.
- Resurrection reuse. Q5. The grant can be represented as a book flag once you decide what it means. Until then, no flag pretends to be canon.
- A global Talent or Vitality ceiling. Page 13 says there is none. Fortune stays capped at 3.
- The 200 gp service price as an engine constant. If a section charges it, the section's effect says 200.

## Current code

`adjustStat` changes a single number and clamps it. There is no separate current and maximum, except the demo's `StatDef.max`, which is a clamp on that one number. Vitality 0 in the sample fight jumps to `defeatSection`. That is not the page 8 ending, and it is not a resurrection check.

There is no XP field and no Fortune grant.

## Two shapes

**One number per stat.** Keep storing Vitality as one integer. "Maximum" is `StatDef.max`. A damaged-stat purchase cannot raise only the maximum, because there is no second number. The demo can stay like this. A GNAT character cannot.

**Current and maximum.** `GameState` stores both for Talent and Vitality. Wounds reduce current. Purchases and some story effects raise maximum. Restoration raises current, and cannot pass maximum once the effect says so. Fortune stays a single number with cap 3, because page 9 caps the points you have, not a separate maximum you buy.

Use the second for any character on the PDF rules. Do not migrate the Lantern Stair demo onto it until Q8. `canRestore` must reject a mixed shape rather than guess which number is which. That is [proposal 07](07-saves-undo-backups.md).

## Proposed change

- Default ending is a session flag or a terminal section the book names, not a hard-coded Temple section.
- A restore effect names the stat and the amount. If the effect says "not above maximum", the engine clamps. If the effect does not say that, Q6 blocks the clamp. Do not copy Talent's sentence onto Vitality in secret.
- XP spend checks the price, subtracts XP, and changes maximum or the skill bonus. It does not heal current Vitality as a side effect.
- An XP award effect adds the points and, if the award is at least 1, calls the Fortune grant from [proposal 01](01-character-tests-fortune.md) once.

## PR slices

1. Current and maximum for a new character type, with the demo character left on one number. Tests that a Wound does not lower the maximum.
2. Default ending at Vitality 0, overridable by a section effect that proposal 06 can already validate. No resurrection behavior beyond "the effect runs instead".
3. XP prices for an undamaged stat, a new basic skill at 2, and one Fortune per award. The damaged-stat price is not in this slice.
4. After Q3, the damaged-stat purchase. After Q5, a resurrection effect someone can place on a section. After Q6, restore effects that were waiting.

## Tests

- Vitality 1, then one Wound, reaches the default ending if the section has no effect. The same Wound on a section with a replacement effect does not.
- Rest effect "Talent +1" does not also raise Vitality.
- Two different sections can heal different amounts. Nothing in the engine fills in a default amount.
- Undamaged Talent 9 costs 9 XP to raise the maximum to 10. Current stays whatever it was if the purchase is defined as maximum-only. For an undamaged stat, current and maximum match, so both read 10 after the purchase.
- An award of 3 XP adds 3 XP and 1 Fortune. A second award of 1 XP adds 1 Fortune more, until the cap.
- A purchase with too little XP changes nothing.

## Sources

PDF pages 8 and 13. Examples that show why rest is not global: section 31 on page 30, section 565 on page 246, section 92 on page 55, section 509 on page 222, section 552 on page 241, section 573 on page 250. Those examples are not fixtures. D1 and D4 in the [roadmap](../roadmap.md).

## Open questions

Q3, Q5, Q6, and Q7. Q7 matters if a fight and the default ending can both claim the moment Vitality hits 0. This proposal owns the ending. [Proposal 02](02-combat-and-rerolls.md) owns whether later rounds still roll. They should not answer Q7 differently.

## Done when

Slices 1 to 3 have tests. Slices that wait on Q3, Q5, or Q6 are still marked waiting in this file. No price uses a depleted stat while Q3 is open.
