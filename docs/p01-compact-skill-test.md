# Design P01: compact skill test

Status: approved by Ares on 8 Nov 2026, 00:38 (Asia/Jerusalem), and implemented on this branch. Not merged.

This is the interaction proposal from the design log. It is not [GNAT proposal 01](proposals/01-character-tests-fortune.md). That rules draft stays Draft and is not approved.

Source for the interaction: the specification section "Approved interaction: compact skill tests" at https://cursor.com/canvas/store-b2d856aa-1a49-40dd-b814-d448b58537d4/2455c882-291e-4d35-a897-f1004776642b

The v0.5 HTML mock is a visual reference only. It is not in this repository. The archived v0.4 snapshot under [design reference](design-reference/PRESERVATION.md) was not edited, and its checksum files were not changed.

The book on screen is still The Lantern Stair. The test is "Study the mark" on section 3. No prototype section numbers or modifiers were copied.

## What the app does

A skill-test section shows its passage and a choice. That choice opens one compact panel under the passage. Scroll is not moved. Close or Esc on that panel returns focus to the choice and keeps the scroll position.

Full test is the same panel, larger, in place of the reading column. Back, or Esc from that screen, returns to reading with the compact panel still open and the saved scroll restored.

The roll lives in one `pendingTest` value. The panel and the full view both read it. Closing, reopening, or switching views does not roll again. Only the pass or fail turn that matches the settled faces is shown, and only after the roll exists. A second click does not start another roll or a second transition. The story changes when that turn is taken. Opening and closing the panel do not tick the landing box. The landing tick still happens on the earlier choice that enters the section.

Fights still use the full combat panel. They do not open this skill-test panel.

## Criteria

| Criterion | Result |
| --- | --- |
| Inline panel, passage and scroll kept, desktop and 390px | Met |
| One roll, no destination until the result exists, no double transition | Met. The sample roll is instant because the app has no animation clock |
| Only the matching destination | Met |
| Fortune reroll of a selected die, cost from system data | Not met. See below |
| Panel and full view share one result, Back restores the panel and scroll | Met |
| Close and Esc focus the choice and keep scroll | Met for the compact panel. Esc on the full view is Back, then a second Esc closes the panel |
| Reopen does not grant a new roll | Met for close, reopen, and the full view. A reload before the turn is taken still drops the uncommitted roll, which is the existing save rule |
| Fights unchanged | Met |
| Ticks only on a story transition | Met |
| Focus, labels, polite result | Met. The result has `role="status"` and `aria-live="polite"` |
| Animation, sound, and manual dice follow existing settings | Not met as new behavior. Those settings are not in the app. Nothing was added |

## Fortune

`SystemDef` has no reroll cost. `gnatDemoSystem` shows Fortune and never spends it. The PDF audit records a cost of one Fortune and a cap of 3 for the Temple rules. That audit is not this sample's data, and the GNAT rules drafts are not approved. A cost of 1 was not written into the sample, and no reroll function was added. A reroll cannot spend nothing, and it cannot run twice, because it does not exist.

Adding it would change the save shape and the sample rules. That is a rules change, not a detail of this panel.

## Checks

`npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` cover this branch, including the compact-panel browser tests. Omarchy and the native window were not run for this change.
