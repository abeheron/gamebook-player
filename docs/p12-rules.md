# Rules summary

Status: approved as P12 and implemented on this branch. Not merged.

Rules, in the sidebar and the phone bar, opens a short summary of the GNAT core rules. The words are this app's. Each line cites the rules-chapter page from the audit. The credit is GNAT core rules by David M. Donachie, CC BY-SA 4.0. No book text is included.

The summary is data in `src/ui/rules-summary.ts`. The groups are Stats, Skills, Tests, Fortune, Combat and wounds, Equipment, and XP.

Lines this build already plays have no extra mark: the three starting stats, the ten skill names, +2 or −2 on a named test, roll-under Talent, and items plus a gold amount. Every other line says "Not yet in this app". Fortune, combat, and XP are entirely in that set. Back and Esc return to the previous screen and its scroll.

Library stays marked not in this build. Test and fight opens in a later change. See [the test and fight note](p09-test-and-fight.md). The engine and the save format are unchanged.

## Pages used

| Group | Pages |
| --- | --- |
| Stats | p. 6 |
| Skills | pp. 7–8 |
| Tests | p. 7 |
| Fortune | pp. 8–9 |
| Combat and wounds | pp. 8, 10, and 11 |
| Equipment | p. 12 |
| XP | p. 13 |
