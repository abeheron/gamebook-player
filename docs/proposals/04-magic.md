# Magic

Status: Draft. Not approved.

## Outcome

You can cast from a spell item by testing against 10. Success consumes the item and applies the spell effect the item names. Failure lets you destroy the item with no effect, or take one Wound that armour cannot ignore and keep the item. The five spells named on PDF page 9 behave as that page states. Occult does not change the target 10 unless you answer Q1.

## In scope

- No memorised spell list. If you do not hold the item, you cannot cast.
- The test is against 10. It is not a Talent test with a skill modifier, until Q1 says otherwise. Doubles are not described on page 9. Do not copy the Talent double rule onto this test unless you decide that separately. The page does not say it.
- Dispel and Flight work only when the section offers them.
- Fireball, Heal, and Invulnerability can be used when you hold them, subject to their effects. Fireball wins the current round against a group. Heal gives +1 Vitality. Invulnerability, after a failed Fight test, ignores the Wounds from that test.
- A book spell that is not one of those five, such as the Swim spell the audit found, is book data. It is not added to the core five.

## Out of scope

- Occult as a casting bonus, item bonuses on the casting test, and any other modifier, while Q1 is open.
- A flight ring that skips the test. The audit found that on section 487. It is a book effect with charges, for [proposal 06](06-book-format-and-effects.md).
- Combat rewrite beyond "this round is won" and "these Wounds are ignored".
- Generating spell text.

## Current code

There is no spell type. `TestDef` always compares against a character stat. A test against 10 cannot be represented honestly by pointing `stat` at Talent.

`addItem` cannot mark an item as a spell, and nothing consumes an item as the consequence of a roll.

## Two shapes

**Reuse `TestDef` with a fake stat.** Store a stat called `cast` whose value is always 10. Skill code from proposal 01 might then add Occult by accident, which is the mistake page 9 does not authorize.

**A cast action with a fixed target.** The action names the item, rolls 2d6, and succeeds when the total is at or under 10. The engine refuses to add a skill modifier while Q1 is open. The item's spell id selects a small allowlist: `dispel`, `fireball`, `flight`, `heal`, `invulnerability`. Any other effect is added to that allowlist in the pull request that needs it. The book-file loader is not a prerequisite.

Use the second. The fixed target stays visible in the code as 10, not as a stat you can train.

## Proposed change

- `GameState` does not gain a memorised-spell list.
- Success removes the item, then applies the spell effect. Heal's effect is +1 Vitality. Page 9 does not state the ceiling. Q6 does. Do not implement Heal until Q6 is answered. Do not copy Talent's "cannot exceed maximum" sentence onto Heal in the meantime.
- Failure shows two choices. Destroy the item and do nothing else. Or take one Wound that skips armour uses, and keep the item.
- Fireball sets the current round's outcome to a win against a group. It does not delete the rest of the fight.
- Invulnerability applies to the Wounds of the failed Fight test just resolved. It does not grant a permanent ignore.

## PR slices

1. The fixed-10 roll, consume on success, and the failure choice. The test item can apply a single allowlisted effect that is not one of the five named spells. No Occult. No Heal.
2. Heal, Fireball, and Invulnerability, after Q6 is answered for Heal, and after proposal 02 has a round to win. Dispel and Flight only appear on a section that offers them.
3. Browser test for the failure choice, including reload after you keep the spell and take the Wound.

## Tests

- A total of 10 succeeds. A total of 11 fails. Talent 9 and Occult do not appear in the comparison.
- Success removes the item. A second cast without the item does not run.
- Failure, choose destroy: item gone, no spell effect, no Wound.
- Failure, choose Wound: item remains, Vitality drops by 1, armour uses do not drop.
- Fireball on a group round records a win for that round and leaves later rounds in place.
- Invulnerability after a failed round records the Wounds as ignored.
- A section that does not offer Flight rejects a Flight cast.

## Sources

PDF page 9. D5 in the [roadmap](../roadmap.md). Q1 and Q6. The Swim spell and the two-charge ring are audit notes on PDF pages 173 and 213. They illustrate book data. They are not core spells.

## Open questions

Q1 blocks every casting modifier. Q6 blocks Heal. The mock's test against 10 is not an extra rule beyond page 9.

## Done when

Slice 1 tests pass without an Occult modifier. Heal is absent or explicitly waiting on Q6. No Temple prose is in the fixture.
