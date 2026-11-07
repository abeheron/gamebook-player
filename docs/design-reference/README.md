# Gamebook Player: prototype screens

Open `index.html` directly in any browser. There's no build step, no network use, and nothing to install. Everything is in one file with inline CSS and JS and uses system fonts.

**Everything you see is illustrative demo data.** That covers the section text, section numbers (214, 232, 118, 326, 47), stats in use, rolls, item names, keyword names, tick counts and titles. None of it is text or rules from *Temple of the Skull God*. Import, saves and bookmarks are simulated. Section navigation only moves between a handful of demo stub sections. Nothing is read, written or sent.

## Screens (keys 1–6; 6 = Rules, a sidebar on desktop, a bottom tab bar under 860px)
1. **Read**: section prose in a long-form serif, a section tickbox, choices with targets, a test choice, a choice locked behind a keyword, and a quick sheet.
2. **Character**: Talent, Vitality and Fortune; skills (+2 if you have one, −2 if not); titles; inventory with tags and a heavy-item meter (2 × max Vitality); disabled placeholders for Rest and XP.
3. **Test & fight**: a working simulated roll of 2d6 ≤ Talent ± mod, where double 1 passes and double 6 fails. You can spend Fortune to re-roll a die you select. There's a fixed-rounds fight (fail = 1 Wound, fumble = +1 Wound) and a manual "My dice" entry mode. Press R to roll.
4. **Keywords & ticks**: a filterable log with keywords and per-section tick counters (some sections have several boxes).
5. **Library**: the book card with progress and an import panel. The import animates fake validation steps only.

`previews/*.png` and `contact-sheet.png` are drawn in code with Pillow (`render_previews.py`). They are close copies of the HTML, **not browser screenshots**.

## v0.5: compact test panel (P01, trying)
See `CHANGELOG.md` and `design-decisions.md`. Snapshots are in `versions/` and are read-only, each with a `SHA256SUMS` file. 93 scripted checks pass.
- Browser check of v0.5 passed (parent agent, 8 Nov 2026, in a fresh Chrome incognito window, desktop and 390×844). Confirmed: the card opens inline and the passage stays; repeated R is locked and the roll settles once into the matching destination; the selected-die Fortune re-roll; closing and reopening shows the same result, with focus back on the choice after Esc or Close; the full view shares the state and Back keeps the scroll position; passing goes to 326 and 214 is ticked; fights still open full screen; no overflow. P01 is still Trying, not approved.
- Text-only fix: the sidebar label now reads “prototype v0.5 · P01 trying”.

## v0.2 changes (review by Ares)
- **Test/fight destinations:** after a roll, the matching button unlocks: "Pass → turn to 326" or "Fail → turn to 47". It updates when you spend Fortune on a re-roll. A fight unlocks "Fight over → turn to 326" only after all 3 rounds. At Vitality 0 the button stays disabled, because the book's defeat rule is not modelled. Clicking a destination clears the dice and opens the demo section, with an "Arrived from" note. Switching modes or pressing Reset clears any old result. All destinations are demo.
- **Back to the previous screen:** each screen shows "← Back to reading / test / …", and Esc does the same. It returns you to where you were, with your scroll position and the screen's state kept. It keeps up to 10 screens. On first load there's no history, so no button shows. The browser's Back button is not wired up; the address bar just shows the current screen.
- **Back is not story rewind:** Back only moves between app screens. Story rewind stays off (honest mode), and the reading view says so.
- **Checkboxes:** redrawn in CSS so the tick sits centred in every box size on desktop and phone. Ticked boxes are filled. Tickboxes are set by the engine and are read-only, so they are labelled images (for example "Section tickbox: ticked" or "2 of 3 boxes ticked") rather than controls you can tap or press.
- **One shared tick state:** the reading view and the log both read from a single `TICKS` record. Leaving section 214 ticks it in both places, and it never goes past the box's maximum. Reloading the page resets both. The dice Reset button doesn't touch ticks. Tick rows in the log are sorted by section number.

## v0.3 changes (review by Ares)
- **Filter box:** now grows, with a minimum width of 20rem (up to 28rem) or the full row on narrow screens, so the whole placeholder fits.
- **Illustrations:** section 214 (labelled "Scanned") and section 326 (labelled "AI-generated") show **placeholder SVG diagrams drawn for this prototype**. They aren't scans or AI images; the provenance labels are marked "demo label". You can choose **Inline / Link only / Hidden**. Either the image or the link opens a full-size view; Esc, the Close button or clicking the backdrop closes it, and focus goes back to what opened it. While it's open, Tab stays on Close and number keys are ignored. Sections with no image show no empty space and no picker.
- **Dice animation:** the final faces are decided first, the dice tumble for 750 ms, then the result is applied once. While the dice are rolling, these are disabled: Roll, R, Fortune re-roll, destination buttons, mode and dice-source switches, and Reset. Leaving the Test screen mid-roll applies the result straight away. A re-roll animates only the selected die. "My dice" tumbles and then lands on the values you typed. "Animate rolls" off means instant, applied in the same click. It defaults to off when the OS asks for reduced motion, and you can still turn it on.
- **Sound:** replaced in v0.4, see below.
- **Saved settings:** illustration display, animation and sound are saved in `localStorage` under `gbp-prefs` if the browser allows it. Since v0.4, only settings you actually change are stored.
- **Rules screen (6th, key 6):** a summary of what the design doc lists for this book, plus a dashed card of rules the doc doesn't specify. That card also lists the demo-only choices on the Test screen: a re-roll costs 1 Fortune, the fight is fixed at 3 rounds at −2, and rolling stops at Vitality 0. Checked word for word against the design doc on 7 Nov 2026, 21:30 (Asia/Jerusalem); the doc's rules table hadn't changed. It's in the sidebar and the mobile tab bar, and Back works from it.

## v0.4: real dice sound (review by Ares)
- **Recording:** “Wooden dice on wodden table roll” by **Wuzzy**, file `Holzwürfel_auf_Holztisch_3.flac`. The source page describes it as the author rolling a wooden die on a wooden table, recorded with a Philips SBC MD110 microphone. It's a real recording, not synthesized and not AI-made.
  - Source: https://opengameart.org/content/wooden-dice-on-wodden-table-roll
  - File: https://opengameart.org/sites/default/files/Holzw%C3%BCrfel_auf_Holztisch_3.flac
  - Licence: **CC0** (public domain, as stated on the OpenGameArt page, checked 7 Nov 2026). Credit is given anyway, in the app next to the sound toggle and here.
- **Edits:** original 1.366 s, 44.1 kHz stereo FLAC. Kept the first 1.0 s, which has the main bounces; the tail is quiet. Added a 5 ms fade-in and a 180 ms fade-out, mixed to mono, added a gentle limiter (peak −1.5 dBFS, RMS −26 dB), and encoded as MP3 at 96 kbps. The result is 13 KB, with a decoded length of 1.045 s. No pitch or speed change.
  - `audio/dice-roll.mp3` is the exact file embedded in `index.html` as base64, so there's still no network or file dependency.
  - `audio/dice-roll-preview.wav` (1.000 s) is for listening on its own.
- **Playback:**
  - The clip only plays from a roll or re-roll (a click or R). Nothing plays on load.
  - Each new roll stops the previous clip, so sounds never overlap.
  - The clip runs about 0.3 s past the 750 ms animation, as a die would.
  - Reset, mode switch or turning sound off stops it. Leaving the screen mid-roll lets it finish.
  - Instant rolls play it too and are never held up by it.
  - It uses Web Audio, falls back to an HTML audio element, and shows "Sound unavailable in this browser" if both fail.
- **Sound on by default:**
  - Rolling sound is **on** unless you've turned it off. Only the settings you change are now stored, so turning it off is remembered.
  - A `sound:false` saved by an earlier version is respected, because the app can't tell whether it was chosen on purpose.

## Source trace (design doc "Gamebook Player: app idea", read 7 Nov 2026)
- The MVP shows only what this book needs: stats, skills, keywords and titles, tickboxes, inventory, money. The prototype adds no map, notes or campaigns, since the doc lists those as "Later".
- Talent 9, Vitality 3, Fortune 3 (max 3). Test is 2d6 ≤ Talent ± mod with double-1 crit and double-6 fumble. Skills are ±2. Fight is N rounds at −X. Fortune re-rolls a die. Armour ignores N wounds. Scrolls test vs 10 and are consumed. The heavy limit is 2 × max Vitality.
- 573 sections plus the 574 reference list; titles carry between books; ticks are counters.
- Dice support re-rolls and manual entry; there is autosave and bookmarks; honest mode and rewind mode exist.
- "Bathe in the lake → 232", "Naturalist test → 326" and "if ticked → 220" come from the doc's own data-format sample. Here they're used only as demo wiring.
- Imports stay local. The AI converter is optional and later, so it isn't shown.

## Decisions and assumptions
- The look is restrained and editorial: warm paper, ink, and one oxblood accent. The serif is for reading and the sans for mechanics. Dark mode follows the OS setting.
- Mechanics always show their formula, so a roll is never a black box.
- Not modelled: Advantage/Disadvantage, weapon/shield bonuses, armour use, rest, XP spending, save slots, rewind mode. The roll targets in the fight (Talent 9 − 2) are demo values.
- Verified: the JS syntax check, plus 93 scripted checks in jsdom (`state-test.jsdom.js`; run it from a folder with jsdom installed, e.g. `/tmp/jt`). They cover navigation and Back, destinations, re-roll flips, clearing old results, fight completion, Vitality 0, tick sync, illustrations and the full-size view, saved settings, animation locking and settling, manual dice, and missing Web Audio. Audio checks: the embedded bytes match the MP3; ffprobe reads it (MP3, mono, 44.1 kHz, 1.045 s); the waveform still shows the bounce pattern; and, with a mocked AudioContext, it decodes once, plays only on a roll, stops before the next roll, respects saved settings and handles a missing audio API. Not verified: visual rendering in a real browser, whether the sound is actually audible and natural (nobody has listened to it), animation smoothness, and reduced-motion detection (jsdom has no matchMedia). The PNG previews are drawn in code, not screenshots.
