# Combat and rerolls

Status: Draft. Not approved.

## Outcome

A fight runs for the number of rounds the section states. A failed round wounds you and does not, by itself, skip the remaining rounds, as long as Vitality stays above 0. Vitality 0 ends the adventure, so later rounds do not roll, unless that section replaces the ending. A fumble adds one Wound to that round's damage when that round already has damage. You can still reach the victory section with failed rounds behind you, if you are alive. Advantage is after other rerolls. Fortune is after other rerolls. The PDF does not order the two-handed reroll against Disadvantage.

## In scope

- One Talent test per round, at the section's penalty. The penalty changes Talent, using the test function from [proposal 01](01-character-tests-fortune.md).
- Failed round: one Wound, before armour. Armour's choice to ignore a Wound is [proposal 03](03-equipment-and-armour.md), not this first fight slice.
- Fumble: if that round deals damage, add one. Page 10 does not say a fumble wounds you when the round dealt none.
- Choose a weapon at the start of the round. Unarmed is an extra -1.
- One-handed allows a shield. Two-handed forbids a shield. Two-handed may reroll the first 6 that round, and the new face replaces the old one.
- Long weapons occupy both hands and do not get that reroll. Any further long-weapon effect is section data, added in the pull request that needs it, under the allowlist in [proposal 06](06-book-format-and-effects.md). The fight slices do not wait for the book-file loader.
- A magical weapon grants Advantage. That grant is a flag on the item, applied here, once items exist.
- Shield reduces the combat penalty by 1, or by 2 against more than one opponent. It is not a flat bonus on every roll.
- Advantage: you may reroll one die after the other rerolls, and the new face replaces the old one. The audit's example of "other rerolls" is the two-handed reroll. Disadvantage: each fighting round you must reroll the first die that shows 1 or 2, and the new face replaces it. That is one die, not both a 1 and a 2. If Advantage and Disadvantage both apply, they cancel.
- Fortune from proposal 01 is also after other rerolls. That fact does not say whether the two-handed reroll happens before Disadvantage.

## Out of scope

- Enemy hit points, or a rule that every round must succeed.
- Armour uses, Invulnerability, and poison that follows a Wound. Those need book effects or later proposals.
- Section 361's five-round fight, the underwater spear, and other Temple fights. Those are data on a book we are not shipping.
- Any implementation of the two-handed reroll together with Disadvantage. Q4 includes which die is first, and the order of those two rerolls. Do not ship a guessed order.

## Current code

`CombatDef` has `rounds`, `dice`, `stat`, an optional `modifier`, and `wound.defeatAtOrBelow`. `rollCombatRound` adds a wound on failure and, if the stat is at or below that threshold, sets `sectionId` to `defeatSection` immediately. Otherwise it goes to `then` after the last round.

`PendingCombat` stores the section id and how many rounds are done. The held fight-over turn in `App.svelte` waits only for the last round, and only in the page.

The Lantern Stair fight is 2 rounds, no modifier, one Vitality on a miss, and it leaves at Vitality 0. That is sample data. Do not treat `defeatAtOrBelow` as the PDF rule.

## Two shapes

**Keep early exit.** Leave `rollCombatRound` as it is and only rename the button. A failed round would still be able to end the fight through `defeatAtOrBelow`. That matches the demo and contradicts page 10.

**Round log, then the page 8 ending.** Each round appends a result and a wound while Vitality stays above 0. The fight goes to `then` after every round if you are still alive. If a Wound drops Vitality to 0, the adventure ends and later rounds are not rolled. A section effect can replace that ending. The effect is data added in the pull request that needs it. It is not a reason to leave the default undecided.

Use the second. Keep `rollCombatRound` for the demo book until that fixture opts into the new fight shape, so current tests keep their meaning.

## Proposed change

- A round result names the weapon, the Talent after penalties, the faces before and after rerolls, and the wounds dealt.
- Rerolls are engine steps, not clicks that poke `faces` from Svelte. The PDF fixes only part of the order. Advantage is after other rerolls. Fortune is after other rerolls. Advantage and Disadvantage cancel when both apply. Do not code "two-handed, then Disadvantage, then Advantage, then Fortune" as if page 11 said that.
- The UI from [proposal 08](08-player-ui.md) asks for the optional Advantage reroll and the Fortune spend when those steps are legal. It does not decide the new face. `Rng` still comes from outside, as `rollDie` does today.
- Slice 1 includes Vitality 0. A failed round above 0 continues. A Wound to 0 ends the adventure. The replacement effect, if a fixture needs one, is an allowlisted field in that same pull request, not a wait on the book-loading slice.

## PR slices

1. Multi-round fight that does not leave early on a failed roll while Vitality stays above 0. Fumble adds one Wound only when that round already deals a Wound. Unit tests, the combat screen, and a reload mid-fight.
2. Weapon choice and unarmed -1, plus shield as a penalty reduction. Still no armour.
3. After Q4 is answered, the two-handed reroll and the Disadvantage reroll, in the order that answer sets. Advantage and Fortune stay after other rerolls, which the PDF already says. One browser test spends Fortune on a shown die and reloads. Do not merge this slice with a guessed order.

## Tests

- Three rounds, fail, succeed, fail, Vitality still above 0: three results exist, and the next section is `then`.
- Double 6 on a failed round adds the fumble Wound. Double 6 on a round that the test somehow deals no damage does not invent a Wound. Page 10 limits the extra damage to damage that round already has.
- Unarmed and a one-handed weapon do not both apply.
- Shield with one opponent reduces the penalty by 1, not by 2. Two opponents reduce it by 2.
- Advantage and Disadvantage together leave the faces from the roll that preceded them. Fortune has not been spent yet, because Fortune is after other rerolls.
- When Disadvantage applies, Fortune is not spent until that replacement face is in. The test does not also require the two-handed reroll to run first.
- A Wound from Vitality 2 to 0 ends the fight. The unrolled later rounds are absent. A failed round that leaves Vitality at 1 still records the next round.
- Demo `rollCombatRound` tests still describe the sample fight, or they move to the new fixture on purpose. They do not silently change.

## Sources

PDF pages 8, 10, and 11. D4 and D6 in the [roadmap](../roadmap.md). Q4 stays open. Section 361 on PDF page 162 is a warning for later book data: it already includes the unarmed penalty and forbids weapon benefits, so a generic unarmed -1 must be suppressible by data.

## Open questions

Q4 blocks slice 3. It covers which die is first, and the order between the two-handed reroll and Disadvantage. Q2 blocks combining this pipeline with armour absorption. Do not invent a die order such as "left die is first", and do not invent "two-handed before Disadvantage", while Q4 is open. Vitality 0 is D4, not an open question.

## Done when

Slice 1's tests pass, the original adventure's fight can be finished with a failed round still on the log, and no Temple section id appears in `src/engine`.
