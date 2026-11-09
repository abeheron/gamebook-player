# Character sheet and keyword log

Status: approved as P08, P10, P14, P15, and P18, and implemented on this branch. Not merged. P09, P11, P12, and P16 to P23 are not in this change.

## What opened

Character, in the sidebar and on the Full sheet button, opens the existing sheet. It shows the stats, skills, coin pouch, items, keywords, and ticks from the current game. The sample lists the ten GNAT skills. Climbing and Linguistics are a sample choice of the two basic skills a new character starts with. Each is +2. Gold starts at 10gp in an unlimited coin pouch, and the ration is an item. The sheet still says that this book does not define titles.

Keywords & ticks opens a log of those same records. The search box matches the name or id. All, Keywords, and Ticks only hide rows. They do not change the game. The reading view and the log both read `session.state.ticks`. A tick still changes only when a story choice applies it. Opening the log, the character sheet, or the skill-test panel does not tick anything.

Back and Esc return to the previous screen and its scroll. They do not call undo. Esc on the compact skill-test panel still closes that panel first. Esc from the full test screen still returns to the panel. Esc from the log search returns to the previous screen.

Test & fight and Library stay marked not in this build. Rules opens in a later change. See [the rules summary](p12-rules.md).

## Skills, gold, and saves

A test may name one skill. The bonus, or −2 when the character lacks that skill, changes the target before the roll is judged. The compact panel and the result show the skill name and that modifier. A test that names no skill is unchanged. Study the mark names Linguistics, which this character has. Search the crack names Search, which this character lacks.

Saves are version 2. A version 1 save gains the sample's two skills, 10gp, and a ration, including on each undo entry. A version 2 save is not given those again.

## Not in this change

Fortune rerolls, the Talent-for-skill trade, a character creation screen, advanced skills on this sample, saving an unfinished roll across reload, dice animation, sound, manual dice, bookmarks, and illustration controls. The rules do not state a numeric step for an advanced skill, so the sample stores none. A possessed skill can hold a higher bonus than +2. That is only so a later character can, and this one does not.
