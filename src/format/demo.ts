import rawBook from "../../tests/fixtures/lantern-stair.json";
import rawGlade from "../../tests/fixtures/p32-glade.json";
import rawRavine from "../../tests/fixtures/p33-ravine.json";
import { gnatDemoSystem } from "../systems/gnat";
import { validateBook } from "./validate";

export const demoSystem = gnatDemoSystem;
export const demoBook = validateBook(rawBook, demoSystem);
/** Hidden P32 test fixture: original sample text, a Naturalist test with plain choices beside it. */
export const gladeBook = validateBook(rawGlade, demoSystem);
/** Hidden P33 test fixture: original sample text, a fight with no losing section, so a loss is game over. */
export const ravineBook = validateBook(rawRavine, demoSystem);
