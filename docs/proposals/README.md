# Feature proposals

Status: Draft. Not approved.

These files plan later work. They do not change the app. The order and the open questions are in [the roadmap](../roadmap.md). The archived prototype under [design reference](../design-reference/PRESERVATION.md) is not one of these proposals and is not the PDF audit.

Design P01, the compact skill-test panel, is a separate interaction. It is recorded in [the P01 note](../p01-compact-skill-test.md). Approving that panel does not approve the rules drafts in this folder.

A proposal can split into several pull requests. Those pulls are listed under PR slices. They are not one branch per proposal.

| Proposal | Depends on | What it adds |
| --- | --- | --- |
| [01 Character, tests, and Fortune](01-character-tests-fortune.md) | The current engine | Talent tests, double 1, double 6, skills, Fortune spend and cap |
| [02 Combat and rerolls](02-combat-and-rerolls.md) | 01 | Rounds, fumble, weapon and shield penalties. Not a full reroll sequence |
| [03 Equipment and armour](03-equipment-and-armour.md) | 01, and 02 for the wound step | Carry limit, item bonuses, armour uses |
| [04 Magic](04-magic.md) | 01 and 03 | Test against 10, spell items, the five named spells |
| [05 Recovery and advancement](05-recovery-and-advancement.md) | 01 | Rest and XP only where the section states them. The effect field ships in the same pull |
| [06 Book format and effects](06-book-format-and-effects.md) | Schema slices ship inside 01, 02, and 05. Local load is after those slices | Validator fields with each rule. File loading only at the end |
| [07 Saves, undo, and backups](07-saves-undo-backups.md) | The first `Session` change, which is the Fortune slice of 01 | Versioned saves, export, undo of a reroll |
| [08 Player UI](08-player-ui.md) | The rule slice it shows | Screen changes inside those same pulls, not a final pass |

01 is first because the fight, spells, and prices all use the Talent test. 02 comes before armour absorption so a fight can be true without pretending armour exists. 04 waits on 03 because a spell is an item and some wounds ignore armour. 05 waits on real stats from 01. It does not wait on a finished book loader.

Proposal 06 is one document so Temple section numbers do not leak into `rollCombatRound`. Its schema slices are not a separate project in front of 05, and 05 is not a project in front of those slices. Each rule pull request adds the fields it needs and the validator check for those fields. The only later slice is local book loading, after those fields exist. That ordering has no cycle.
