# Design P07: app layout

Status: approved by Ares on 8 Nov 2026, 01:39 (Asia/Jerusalem), and implemented on this branch. Not merged.

This matches the prototype shell. It does not approve P02 to P06, and it does not approve the unfinished parts of P01.

## Theme

The approved reading screen is parchment: paper `#f6f1e7`, panels `#fffdf8`, ink `#1f1b16`, and accent `#8a2f1d`. Story text stays serif. The app does not switch those colours when the operating system is in dark mode. `color-scheme` is light so the page keeps the approved palette. Browser tests load a freshly built server, so an older preview cannot keep the previous dark palette on port 4173.

## Navigation

A later change opens Keywords and ticks. See [the character and log note](p08-character-log.md). The table below is what this layout change itself opened.

Desktop order, then the same order in the bottom bar under 860px:

| Entry | What it opens |
| --- | --- |
| Read | The reading view, including the compact skill test and the full test alternative |
| Character | The existing character sheet. The same destination as Full sheet |
| Test & fight | Not in this build. Fights and skill tests stay on the section that contains them |
| Keywords & ticks | Not in this build. The sheet already lists the keywords and ticks for the current game |
| Library | Not in this build |
| Rules | Not in this build |

Unavailable entries stay in the tab order. They are marked `aria-disabled` and do not open a screen. The current supported entry uses `aria-current="page"`.

The right-hand summary on Read uses the live stats, items, keywords, and ticks. It does not show a simulated save slot. The real save line remains "Saved on this device".

## Left unchanged

P01 still opens one shared test result, returns focus and scroll, and does not roll again when reopened. Fights stay on the full combat panel. Ticks still change only when the story changes. Fortune rerolls, dice animation, sound, manual dice, bookmarks, and the illustration picker are not added.

The archived files under `docs/design-reference/` were not edited.
