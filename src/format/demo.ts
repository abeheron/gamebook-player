import rawBook from "../../tests/fixtures/lantern-stair.json";
import rawGlade from "../../tests/fixtures/p32-glade.json";
import rawRavine from "../../tests/fixtures/p33-ravine.json";
import rawMarsh from "../../tests/fixtures/p35-marsh.json";
import { gnatDemoSystem } from "../systems/gnat";
import { validateBook } from "./validate";

export const demoSystem = gnatDemoSystem;
export const demoBook = validateBook(rawBook, demoSystem);
/** Hidden P32 test fixture: original sample text, a Naturalist test with plain choices beside it. */
export const gladeBook = validateBook(rawGlade, demoSystem);
/** Hidden P33 test fixture: original sample text, a fight with no losing section, so a loss is game over. */
export const ravineBook = validateBook(rawRavine, demoSystem);
/**
 * Hidden P35 test fixture: original sample text, tests before fights, Advantage, Disadvantage with
 * boxes to tick, a skippable test, a bargain, a pass that skips the fight, and a cancel.
 */
export const marshBook = validateBook(rawMarsh, demoSystem);
