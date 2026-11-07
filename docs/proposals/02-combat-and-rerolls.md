# Combat and rerolls

Status: Draft. Not approved.

## Outcome

A fight runs for the number of rounds the section states. A failed round wounds you and does not, by itself, skip the remaining rounds. A fumble adds one Wound to that round's damage when that round already has damage. You can still reach the victory section with failed rounds behind you, if you are alive. Rerolls from a weapon, from Advantage, and from Disadvantage happen in the PDF's order, and Fortune is after them.

## In scope

- One Talent test per round, at the section's penalty. The penalty changes Talent, using the test function from [proposal 01](01-character-tests-fortune.md).
- Failed round: one Wound, before armour. Armour's choice to ignore a Wound is [proposal 03](03-equipment-and-armour.md), not this first fight slice.
- Fumble: if that round deals damage, add one. Page 10 does not say a fumble wounds you when the round dealt none.
- Choose a weapon at the start of the round. Unarmed is an extra -1.
- One-handed allows a shield. Two-handed forbids a shield. Two-handed may reroll the first 6 that round, and the new face replaces the old one.
- Long weapons occupy both hands and do not get that reroll. Their other effects come from section text, which is [proposal 06](06-book-format-and-effects.md).
- A magical weapon grants Advantage. That grant is a flag on the item, applied here, once items exist.
- Shield reduces the combat penalty by 1, or by 2 against more than one opponent. It is not a flat bonus on every roll.
- Advantage: you may reroll one die after the other rerolls, and keep the new face. Disadvantage: you must reroll the first 1, or the first 1 and 2, each round, and keep the new face. If both apply, they cancel.
- Fortune spend from proposal 01 runs after those rerolls.

## Out of scope

- Enemy hit points, or a rule that every round must succeed.
- Armour uses, Invulnerability, and poison that follows a Wound. Those need book effects or later proposals.
- Section 361's five-round fight, the underwater spear, and other Temple fights. Those are data on a book we are not shipping.
- A die-order rule for Q4. Two-handed and Disadvantage slices do not merge until you answer it.

## Current code

`CombatDef` has `rounds`, `dice`, `stat`, an optional `modifier`, and `wound.defeatAtOrBelow`. `rollCombatRound` adds a wound on failure and, if the stat is at or below that threshold, sets `sectionId` to `defeatSection` immediately. Otherwise it goes to `then` after the last round.

`PendingCombat` stores the section id and how many rounds are done. The held fight-over turn in `App.svelte` waits only for the last round, and only in the page.

The Lantern Stair fight is 2 rounds, no modifier, one Vitality on a miss, and it leaves at Vitality 0. That is sample data. Do not treat `defeatAtOrBelow` as the PDF rule.

## Two shapes

**Keep early exit.** Leave `rollCombatRound` as it is and only rename the button. A failed round would still be able to end the fight through `defeatAtOrBelow`. That matches the demo and contradicts page 10.

**Round log, then a separate survival check.** Each round appends a result and a wound. The fight goes to `then` only after every round, and only if Vitality is still above 0, or a book effect replaced the default ending. Vitality 0 uses the default ending from page 8, unless the section carries an effect from proposal 06.

Use the second. Keep `rollCombatRound` for the demo book until that fixture opts into the new fight shape, so current tests keep their meaning.

## Proposed change

- A round result names the weapon, the Talent after penalties, the faces before and after rerolls, and the wounds dealt.
- Reroll steps are an ordered list the engine applies, not clicks that poke `faces` from Svelte. Proposed order, from pages 8, 10, and 11: two-handed first 6, then Disadvantage's mandatory reroll, then Advantage's optional reroll, then Fortune. Advantage and Disadvantage cancel before any of those rerolls.
- The UI from [proposal 08](08-player-ui.md) asks for the optional Advantage reroll and the Fortune spend. It does not decide the new face. `Rng` still comes from outside, as `rollDie` does today.
- Q7 is not decided. The first fight slice can ship the "failed round continues" rule without a mid-fight Vitality 0 case. The Vitality 0 case waits.

## PR slices

1. Multi-round fight that does not leave early on a failed roll while Vitality stays above 0. Fumble adds one Wound only when that round already deals a Wound. Unit tests, the combat screen, and a reload mid-fight.
2. Weapon choice and unarmed -1, plus shield as a penalty reduction. Still no armour.
3. After you answer Q4, two-handed and Disadvantage rerolls, then Advantage, then Fortune. One browser test spends Fortune on a shown die and reloads.

## Tests

- Three rounds, fail, succeed, fail, Vitality still above 0: three results exist, and the next section is `then`.
- Double 6 on a failed round adds the fumble Wound. Double 6 on a round that the test somehow deals no damage does not invent a Wound. Page 10 limits the extra damage to damage that round already has.
- Unarmed and a one-handed weapon do not both apply.
- Shield with one opponent reduces the penalty by 1, not by 2. Two opponents reduce it by 2.
- Advantage and Disadvantage together leave the faces from the original roll, before Fortune.
- Fortune cannot reroll before the mandatory Disadvantage reroll in the scripted order.
- Demo `rollCombatRound` tests still describe the sample fight, or they move to the new fixture on purpose. They do not silently change.

## Sources

PDF pages 8, 10, and 11. D4 and D6 in the [roadmap](../roadmap.md). Q4 and Q7 stay open. Section 361 on PDF page 162 is a warning for later book data: it already includes the unarmed penalty and forbids weapon benefits, so a generic unarmed -1 must be suppressible by data.

## Open questions

Q4 blocks slice 3. Q7 blocks the Vitality 0 mid-fight behavior. Q2 blocks combining this pipeline with armour absorption. Do not invent a die order such as "left die is first" inside the engine while Q4 is open.

## Done when

Slice 1's tests pass, the original adventure's fight can be finished with a failed round still on the log, and no Temple section id appears in `src/engine`.
