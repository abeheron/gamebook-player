# Feature proposals

Status: Draft. Not approved.

These files plan later work. They do not change the app. The order and the open questions are in [the roadmap](../roadmap.md).

A proposal can split into several pull requests. Those pulls are listed under PR slices. They are not one branch per proposal.

| Proposal | Depends on | What it adds |
| --- | --- | --- |
| [01 Character, tests, and Fortune](01-character-tests-fortune.md) | The current engine | Talent tests, double 1, double 6, skills, Fortune spend and cap |
| [02 Combat and rerolls](02-combat-and-rerolls.md) | 01 | Rounds, fumble, weapon and shield penalties, reroll order |
| [03 Equipment and armour](03-equipment-and-armour.md) | 01, and 02 for wound choice | Carry limit, item bonuses, armour uses |
| [04 Magic](04-magic.md) | 01 and 03 | Test against 10, spell items, the five named spells |
| [05 Recovery and advancement](05-recovery-and-advancement.md) | 01, and 06 for section amounts | Rest and XP only where the section states them |
| [06 Book format and effects](06-book-format-and-effects.md) | The slices of 01 to 05 that add fields | Validator, local load, book effects that are not engine branches |
| [07 Saves, undo, and backups](07-saves-undo-backups.md) | Any slice that changes `Session` | Versioned saves, export, undo of a reroll |
| [08 Player UI](08-player-ui.md) | The rule slice it shows | Screen changes inside those same pulls, not a final pass |

01 is first because the fight, spells, and prices all use the Talent test. 02 comes before armour absorption so a fight can be true without pretending armour exists. 04 waits on 03 because a spell is an item and some wounds ignore armour. 05 waits on real stats, and on 06 for amounts that belong to a section. 06 is the shared data boundary. It grows inside the other pulls. It is a separate document so Temple section numbers do not leak into `rollCombatRound`.
