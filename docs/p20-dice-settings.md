# Dice animation and sound

Status: approved as P20 and P21, and implemented on this branch. Not merged.

Animate rolls and Rolling sound are the two checkboxes on the Test & fight screen, with the Wuzzy credit beside them. That is the control row from the v0.5 prototype. The compact panel does not repeat it.

Animation is on unless the player turned it off, or this is the first visit and the system asks for reduced motion. A stored choice wins over that default. While a roll is animated, the dice use the prototype wobble, the current fight round uses the existing rolling pulse, and the pass, fail, or fight-over action stays unavailable. The faces that count are chosen before the wobble. The pulse does not run when reduced motion is on, even if animation was turned on. An instant roll skips the wobble and the pulse.

The sound is on until the player turns it off. That choice is remembered. The clip plays from a roll click, not when the page opens. It is “Wooden dice on wooden table roll” by Wuzzy, CC0, https://opengameart.org/content/wooden-dice-on-wodden-table-roll.

The toggles live in `localStorage` under `gbp-prefs`. Only a checkbox the player has changed is stored. The game save is unchanged, so its version was not bumped.
