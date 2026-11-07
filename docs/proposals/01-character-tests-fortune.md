# Character, tests, and Fortune

Status: Draft. Not approved.

## Outcome

You can start a character at the PDF's starting stats, take a Talent test that treats double 1 and double 6 correctly, apply a skill modifier to Talent, and spend one Fortune to reroll one die. The first original short adventure can use those rules. The Lantern Stair demo keeps its current sample rules. These drafts do not ask you to remove it.

## In scope

- Starting Talent 9, Vitality 3, and Fortune 3.
- Talent floor 2. Restoration cannot pass the character's current Talent maximum. No coded lifetime Talent cap.
- Fortune hard cap 3. Spend 1 after a roll to reroll one die. Spend again on a later roll, or again after another reroll, as page 8 allows.
- A 2d6 test against Talent. The total succeeds when it is at or under the modified Talent.
- Natural double 1 succeeds. Natural double 6 fails. Those override the total.
- Basic skill present is +2 Talent on that skill's test. A missing skill is -2. Advanced skills can carry a larger bonus later. Absence stays -2.
- The ten skill names from pages 7 and 8, as ids the book can refer to.

## Out of scope

- Weapon choice, shield, ration, 10 gp, and the Talent-for-skill trade. Those are creation details for a later slice of this proposal or for [equipment](03-equipment-and-armour.md).
- Previous-character import.
- Fight rounds, armour, spells, rest, and XP prices.
- Replacing `tests/fixtures/lantern-stair.json`. That file stays. A later product choice can change what the app opens. This proposal does not ask for it.
- Copying Temple section text into the new adventure.

## Current code

`StatDef` stores `initial`, `min`, and `max`. `gnatDemoSystem` sets Talent 1 to 12, and Vitality and Fortune 0 to 3. That file is the demo, not this proposal's sheet.

`rollTest` compares `rollDice` total with `stat + modifier`. `RollRecord` stores faces, total, and `success`. It does not store whether the result was a double.

`adjustStat` clamps to `StatDef.min` and `StatDef.max`. A real Talent sheet cannot use a fake maximum of 12, or a floor of 1, or the clamp will fight page 7.

Fortune has no spend operation. The sheet copy in `Sheet.svelte` says this sample does not spend it. That sentence stays true for the demo.

## Two shapes

**Grow `rollTest`.** Add crit flags and a Fortune argument to the function that already commits the section. The page would have to reroll by calling the whole function again, which also moves you and applies effects twice.

**A roll result the section does not consume yet.** Add a pure function, next to `rollDice`, that returns faces, total, modified Talent, and success, including doubles. `rollTest` becomes a caller of that function. Fortune reroll takes the result and one die index, spends one Fortune, and rolls that die again. The section changes only when you accept the result, which the UI already waits for.

Use the second. It matches `parseDice` and `rollDice`, which are already pure, and it gives [saves](07-saves-undo-backups.md) a result to store. Do not add a rules plugin type. The demo book keeps calling `rollTest` until its own fixture is intentionally left on the old comparison.

## Proposed change

- Teach the system file a Talent floor and a Fortune cap without requiring every stat to have a lifetime max. The demo system file stays as it is.
- Record current and maximum separately once a stat can be damaged. Talent's maximum is what restoration cannot pass. The starting 9 is the first maximum, not a global one.
- Skill bonus is data on the test (`skill` id, or an explicit Talent modifier the book already computed). The engine applies +2 or -2 from the character's skill list. It does not read a skill number out of prose.
- `RollRecord.faces` stays the source for double 1 and double 6. Success is not "total at or under" when the doubles rule applies.
- Modifiers change the Talent used for the comparison. They do not change `DiceRoll.total`.

## PR slices

1. Pure test result, doubles, and Talent floor, with unit tests. This slice does not change `Session` or `SaveRecord`. The demo path can stay untouched.
2. Fortune spend on that result, cap 3, and the Read screen control. The pending roll moves into `GameState`, because a reload must keep the spent point and the new face. This slice bumps `SaveRecord.version`, migrates a version 1 save, and tests that migration, as [proposal 07](07-saves-undo-backups.md) requires. A browser test spends, reloads, and still shows the new face.
3. Skill list and +2 or -2. Extend the original short adventure by one skill test. Any new field is validated in this same pull request.
4. Ship that adventure as a second fixture the tests load. Do not point the opening book at it in this proposal.

Slice 2 includes the UI. Slice 3 includes the sheet lines for skills. Neither waits for [proposal 08](08-player-ui.md) as a later project.

## Tests

- Total 9 against Talent 9 succeeds. Total 10 fails.
- Faces 1 and 1 succeed even when a modifier would make the Talent too low for the total.
- Faces 6 and 6 fail even when the total would pass.
- A +2 skill changes the Talent compared. It does not change the printed dice total.
- A missing skill applies -2 the same way.
- Fortune 1 rerolls the chosen die only. Fortune 0 refuses. Fortune 3 does not become 4 when something would grant a point.
- Restore Talent 9 when the maximum is 9 stays 9. A later maximum of 10 can restore to 10.
- Talent does not fall below 2 through the normal adjust path.
- The Lantern Stair unit tests still pass without doubles, because that fixture does not opt into this rules file.

## Sources

PDF pages 6, 7, 8, and 9. Skill names are on pages 7 and 8. Decisions D1, D2, and D3 in the [roadmap](../roadmap.md).

## Open questions

None of Q1 to Q6 block the slices above. Vitality 0 is already D4. The demo staying in the app is the assumption here, not a question for this review.

Creation trades (one Talent for one basic skill, at most three) are specified on page 6. They are out of the first three slices because the short adventure can start after character creation. They belong in a later slice of this proposal, not in a guess inside `initialState`.

## Done when

The slices you accepted have unit tests. Slice 1 does not change the save schema. Slice 2 is not done without the version bump, the version 1 migration test, and the browser reload. The short adventure fixture is original text. `npm test` passes. The demo fixture is unchanged.
