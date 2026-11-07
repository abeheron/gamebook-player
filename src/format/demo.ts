import rawBook from "../../tests/fixtures/lantern-stair.json";
import { gnatDemoSystem } from "../systems/gnat";
import { validateBook } from "./validate";

export const demoSystem = gnatDemoSystem;
export const demoBook = validateBook(rawBook, demoSystem);
