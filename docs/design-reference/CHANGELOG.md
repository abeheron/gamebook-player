# Changelog (standalone prototype)

## Status, 8 Nov 2026 00:28: reference-only commit approved by Ares; waiting on Lone Wolf's commit confirmation. Prototype unchanged.

## v0.5 (8 Nov 2026), P01 trying
- Choosing the Naturalist test choice in the reading view now opens a compact test card under that choice. The passage stays visible and its scroll position is kept. The full Test screen is still available via "Open full test view".
- The card and the Test screen share one dice state. The card has the animation, the recorded sound, manual dice, the Fortune re-roll and the matching destination buttons, which unlock only after the result settles.
- Esc or Close shuts the card and puts focus back on the test choice. Reopening it keeps the same result, so closing it doesn't give a free re-roll. A section is ticked only when you actually move to another section.
- Fights still open full screen.
- Browser check of v0.5 passed (parent agent, 8 Nov 2026, in a fresh Chrome incognito window, desktop and 390×844). Confirmed: the card opens inline and the passage stays; repeated R is locked and the roll settles once into the matching destination; the selected-die Fortune re-roll; closing and reopening shows the same result, with focus back on the choice after Esc or Close; the full view shares the state and Back keeps the scroll position; passing goes to 326 and 214 is ticked; fights still open full screen; no overflow. P01 is still Trying, not approved.
- Text-only fix: the sidebar label now reads “prototype v0.5 · P01 trying”.

## v0.4: real recorded die sound (Wuzzy, CC0); sound on by default with a saved opt-out.
## v0.3: filter box sizing, illustrations, dice animation and toggle, synthetic sound, Rules screen; rules wording checked against the doc.
## v0.2.1: one shared tick state for the reading view and the log.
## v0.2: pass/fail destinations, Back to the previous app screen, checkbox centring.
## v0.1: five prototype screens.
