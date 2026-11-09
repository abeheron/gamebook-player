# Character sheet and keyword log

Status: approved as P08, P10, P14, P15, and P18, and implemented on this branch. Not merged. P09, P11, P12, and P16 to P23 are not in this change.

## What opened

Character, in the sidebar and on the Full sheet button, opens the existing sheet. It shows the stats defined by the loaded system, plus items, keywords, and ticks from the current game. The Lantern Stair system defines Talent, Vitality, and Fortune. It does not define skills, titles, or money, and the sheet says so instead of inventing them.

Keywords & ticks opens a log of those same records. The search box matches the name or id. All, Keywords, and Ticks only hide rows. They do not change the game. The reading view and the log both read `session.state.ticks`. A tick still changes only when a story choice applies it. Opening the log, the character sheet, or the skill-test panel does not tick anything.

Back and Esc return to the previous screen and its scroll. They do not call undo. Esc on the compact skill-test panel still closes that panel first. Esc from the full test screen still returns to the panel. Esc from the log search returns to the previous screen.

Test & fight, Library, and Rules stay marked not in this build.

## Not in this change

Fortune rerolls, saving an unfinished roll across reload, dice animation, sound, manual dice, bookmarks, and illustration controls. No engine rule and no save format changed.
