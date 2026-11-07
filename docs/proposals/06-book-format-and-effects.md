# Book format and effects

Status: Draft. Not approved.

## Outcome

A book file can state the rules the other proposals add, and `validateBook` rejects anything else. You can load one JSON book from the machine. Section exceptions are effects in that file. They are not branches in `rollCombatRound`. Converting all 573 Temple sections is a different project and is not this proposal's done state.

## In scope

- New fields only when a rule proposal needs them, added in that proposal's pull request, and checked here so the allowlist stays one list.
- Keywords stay inventory-independent. Titles are a separate list that may be marked as carrying to another adventure. Keywords are not assumed to carry.
- Ticks stay counters. A section says when the counter changes. Seeing a choice is not the same as entering the section. The audit's section 14 note is the reason: entry and "the choice is visible" are different.
- Local load through a file the player picks. The file is untrusted. It goes through `validateBook`. It is not evaluated.
- An effect allowlist that can name: adjust current, adjust maximum, add or remove item, grant or spend Fortune, set or clear a flag, add XP, start a fight override such as "do not also add unarmed -1", and replace the Vitality 0 ending.
- The original short adventure as a fixture under `tests/fixtures/`, original words, no Temple sentences.

## Out of scope

- Shipping Temple text, art, or a 573-section file.
- A second rulebook import, Project Aon XML, ink, or Twine.
- YAML, until a real editing workflow exists. JSON is what `validateBook` already accepts.
- An expression language. Conditions stay objects, as they are now. Do not add `eval` or a string parser for `has("lantern")`.
- Hard-coding section 31, 71, 227, 361, 388, 487, 509, 530, 552, 563, or 573.

## Current code

`validateSystem` and `validateBook` reject unknown keys. `Section` has body, and exactly one of choices, a test, or a combat. `Effect` is `addItem`, `removeItem`, `gainKeyword`, `tick`, and `adjustStat`. `Book.rights` is required. The demo book is compiled in through `src/format/demo.ts`. There is no file picker.

`ticksOnSection` in `src/ui/wording.ts` only displays ticks that a choice effect mentions. It is not a rules check.

## Two shapes

**Section-id switches.** `if (section.id === "361")` inside the engine. Fast for one book, and it makes every other book carry Temple. It also fails the trust rule, because a loaded file could use those ids to reach code paths you thought were private.

**Allowlisted effects.** The section JSON includes `onEnter`, `onWound`, or `insteadOfDefeat` from a closed set. The validator rejects unknown ops. The engine runs the op the same way `applyEffects` does. A fight option such as "unarmed penalty already included" is a boolean on that combat object, not a section number.

Use the second. It is the same boundary as today's unknown-key errors.

## Proposed change

- Grow `Effect` and `CombatDef` in the same pull request that implements the rule. Update [format.md](../format.md) in that pull request so the doc matches the code.
- `demoBook` remains the built-in book. A loaded book is another `Book` after validation, stored only as the player's data, not committed.
- Book-specific spells and items use effect ids that are already on the allowlist. A new mechanic needs a new op and a test. It does not need a new function named after a Temple section.
- The short adventure's `rights` text says it is original and names no license you have not chosen.

## PR slices

These slices are the format part of other proposals, not a blocked month of schema work.

1. With [proposal 01](01-character-tests-fortune.md), accept skill ids and a test that records doubles. Reject a string of JavaScript in a new field.
2. With [proposal 02](02-combat-and-rerolls.md), accept per-combat flags the fight needs, including "unarmed penalty already included", without referencing section 361.
3. With [proposal 05](05-recovery-and-advancement.md), accept a restore effect that states its amount, and an optional replacement for the Vitality 0 ending.
4. A file picker that loads JSON, shows `BookValidationError` to the player, and does not write the book into the repo. Browser test with a tiny original file and with a file that has an unknown key.

## Tests

- Unknown effect op fails validation.
- A combat flag the schema knows is accepted. A section id alone does not turn on that flag.
- Tick on entry fires once when you enter, not when the choice is merely in the list.
- Loaded JSON with `rights` missing fails. Loaded JSON that passes plays with the same engine as the fixture.
- The repository tree does not gain Temple prose. A test can be a file-content check on `tests/fixtures/` if you want that guard, using a phrase you choose, not a quote from the book.

## Sources

PDF pages 12 and 14 for keywords, titles, and ticks. The audit's book-specific list (sections 31, 71, 73, 92, 227, 228, 229, 296, 361, 388, 487, 509, 530, 552, 563, 565, and 573) is the set of reasons the allowlist must be able to express exceptions. It is not a backlog of hardcoded fights. The audit's closing recommendation is the reason the full conversion stays separate.

## Open questions

None of Q1 to Q7 are decided here. Q5 and Q6 change which effects are legal to author. Until they are answered, the allowlist does not include a resurrection op or a Vitality clamp the PDF does not state.

Q8 decides whether the loaded-book screen replaces the demo or sits beside it.

## Done when

The short adventure validates. A hostile JSON file does not run code. No engine function contains a Temple section number. The full book is still absent from the repo.
