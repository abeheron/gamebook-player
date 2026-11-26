/**
 * Opens the app with the hidden test hero (Climbing and Linguistics +2, Talent 9) on the start section.
 * The query is not linked anywhere in the app. Players always go through character creation.
 * A reload keeps the query, and an existing save still wins over the fixture.
 */
export const FIXTURE_URL = "/?fixture=demo";

/**
 * Opens The Mist Glade (original sample text) with a hidden hero who has Climbing and Naturalist +2
 * and Talent 9, on a section with a Naturalist test and plain choices beside it (P32). Not linked anywhere.
 */
export const P32_FIXTURE_URL = "/?fixture=p32";

/**
 * Opens The Ash Ravine (original sample text) with the hidden ready-made hero (Talent 9, Vitality 3) (P33).
 * §5 is a three-round fight with no losing section, so a loss is game over. §9 is a fight that does have one,
 * and §17 is a test whose fail costs 3 Vitality. Not linked anywhere.
 */
export const P33_FIXTURE_URL = "/?fixture=p33";

/**
 * Opens The Salt Marsh (original sample text) with a hidden hero who has Climbing and Swimming +2,
 * Talent 9, Vitality 3, and a one-handed weapon (P35): tests before fights, Advantage, Disadvantage
 * with boxes to tick, a skippable test, a bargain, a pass that skips the fight, and a cancel. Not linked anywhere.
 */
export const P35_FIXTURE_URL = "/?fixture=p35";
