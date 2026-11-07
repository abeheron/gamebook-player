import rawSystem from "./demo.json";
import { validateSystem } from "../../format/validate";

/** The only system shipped with this foundation. Full GNAT rules are deferred. */
export const gnatDemoSystem = validateSystem(rawSystem);
