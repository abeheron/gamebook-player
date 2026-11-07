# Gamebook Player — design decisions and proposals

Status as of 8 Nov 2026, 00:28 (Asia/Jerusalem). The v0.5 browser check passed (Chrome incognito, desktop and 390×844). Ares approved a reference-only commit at 00:28; it's waiting on Lone Wolf's commit confirmation, and nothing is committed yet. No runtime changes or merge are authorised. Prototype: standalone `index.html` (not repository code).
Source design doc: https://cursor.com/canvas/store-b2d856aa-1a49-40dd-b814-d448b58537d4/2455c882-291e-4d35-a897-f1004776642b

## Agreed working approach
- Design proposals, numbered snapshots and the change log live in the Library Page "Gamebook Player — design proposals": https://cursor.com/canvas/store-b2d856aa-1a49-40dd-b814-d448b58537d4/d44a727e-3afe-4765-8010-21640536e68f
- Approved decisions, assets and prototype source go to GitHub next to the implementation. The parent agent coordinates that through Lone Wolf.

## Ares's decisions
| Item | Status | Note |
|---|---|---|
| Real recorded die sound (Wuzzy, CC0) | Accepted ("yeah nice") | The only element explicitly accepted so far |
| Rolling sound on by default | Requested by Ares, done in v0.4 | A saved opt-out is respected |
| Reference-only commit to GitHub | Approved by Ares at 00:28 ("Ok then commit the reference files only") | Waiting on Lone Wolf's commit confirmation |
| Start with the compact test panel (P01) | Requested by Ares | Being tried in v0.5, browser check passed; still not approved |

## Requested by Ares and implemented (not a visual approval)
| Request | Version |
|---|---|
| Go straight to the pass/fail section after a test or fight | v0.2 |
| Easy Back to the previous app screen | v0.2 |
| Checkboxes and ticks centred | v0.2 (tick sync fix v0.2.1) |
| Filter box not cropped | v0.3 |
| Illustration area (inline or link; Ares undecided) | v0.3 |
| Dice roll animation with an on/off setting | v0.3 |
| Rolling sound with a setting | v0.3 (synthetic), replaced with a recording in v0.4 |
| Rules summary screen | v0.3 (wording checked against the doc) |

## Proposals
| ID | Proposal | Status |
|---|---|---|
| P01 | Compact skill-test panel in the reading view | Trying (v0.5) |
| P02 | Clear consequences shown on choices | Proposed |
| P03 | Character drawer | Proposed |
| P04 | Reading controls | Proposed |
| P05 | Inline illustrations as the default | Proposed |
| P06 | Contextual rules | Proposed |

Only P01 has been built. P02–P06 have no implementation.

## Version log
| Version | What changed | Snapshot |
|---|---|---|
| v0.1 | Five screens | `versions/v0.1/index.html` (HTML only; backup taken before the v0.2 edits). sha256 `490b0acb…2a57` |
| v0.2 | Pass/fail destinations, Back, checkbox fix | No separate snapshot |
| v0.2.1 | v0.2 plus a single shared tick state | `versions/v0.2.1/index.html` (HTML only; backup taken before the v0.3 edits). sha256 `d0d342ba…4eea` |
| v0.3 | Filter box, illustrations, dice animation, synthetic sound, Rules screen, rules wording correction | No separate snapshot (edited in place) |
| v0.4 | Real recorded die sound, sound on by default | `versions/v0.4/` full set, with `SHA256SUMS`. index sha256 `c8d13de2…dd65` |
| v0.5 | P01 compact test panel (trying), checked in a browser | `versions/v0.5/` full set with `SHA256SUMS`; also `v0.5-prototype.html` |

Previews for v0.1–v0.3 were never kept and can't be recovered.

## Licensing and credits
- Dice sound: "Wooden dice on wodden table roll" by Wuzzy, file `Holzwürfel_auf_Holztisch_3.flac`. Licence CC0. Source page: https://opengameart.org/content/wooden-dice-on-wodden-table-roll. Edited: first 1.0 s, fades, mono, limiter, MP3 at 96 kbps.
- The GNAT rules are by David M. Donachie, CC BY-SA 4.0, as stated in the design doc. The Rules screen paraphrases them.
- All section text, art, items and numbers are placeholders for the demo. There is no book text or art.
