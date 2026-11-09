import rawSystem from "./demo.json";
import { validateSystem } from "../../format/validate";

/** The only system shipped with this foundation. Skill names and the basic bonus are included. The rest of GNAT is deferred. */
export const gnatDemoSystem = validateSystem(rawSystem);
