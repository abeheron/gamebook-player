export type RuleStatus = "in-app" | "not-yet";

export interface RuleLine {
  text: string;
  /** Rules-chapter page, not a book section. */
  page: string;
  status: RuleStatus;
}

export interface RuleSection {
  id: string;
  title: string;
  lines: RuleLine[];
}

export const rulesCredit = "GNAT core rules by David M. Donachie, CC BY-SA 4.0";

/**
 * Short summary in this app's words. Pages are the rules chapter cited by the audit.
 * Book prose is not included.
 */
export const rulesSummary: readonly RuleSection[] = [
  {
    id: "stats",
    title: "Stats",
    lines: [
      {
        text: "The stats are Talent, Vitality, and Fortune. A new character starts at Talent 9, Vitality 3, and Fortune 3.",
        page: "p. 6",
        status: "in-app",
      },
      {
        text: "Creation also includes a weapon, a shield only with a one-handed weapon, and up to three trades of one Talent for one extra basic skill.",
        page: "p. 6",
        status: "not-yet",
      },
    ],
  },
  {
    id: "skills",
    title: "Skills",
    lines: [
      {
        text: "The ten skills are Climbing, Diplomacy, Larceny, Linguistics, Naturalist, Occult, Search, Stealth, Swimming, and Tracking.",
        page: "pp. 7–8",
        status: "in-app",
      },
      {
        text: "On a test that names a skill, a basic skill you have is +2. A skill you lack is −2.",
        page: "pp. 7–8",
        status: "in-app",
      },
      {
        text: "An advanced skill can have a larger bonus. Lacking that skill is still −2.",
        page: "pp. 7–8",
        status: "not-yet",
      },
    ],
  },
  {
    id: "tests",
    title: "Tests",
    lines: [
      {
        text: "Roll 2d6. The roll succeeds when the total is at or under Talent after modifiers. Modifiers change the target, not the dice.",
        page: "p. 7",
        status: "in-app",
      },
      {
        text: "A natural double 1 always succeeds. A natural double 6 always fails.",
        page: "p. 7",
        status: "not-yet",
      },
      {
        text: "Restored Talent cannot pass its maximum. Talent does not go below 2.",
        page: "p. 7",
        status: "not-yet",
      },
    ],
  },
  {
    id: "fortune",
    title: "Fortune",
    lines: [
      {
        text: "Spend 1 Fortune after a roll to reroll one die. You may spend again, and Fortune comes after other rerolls.",
        page: "pp. 8–9",
        status: "not-yet",
      },
      {
        text: "Fortune does not return by itself. An award of one or more XP gives one Fortune, not one per point. The cap is 3.",
        page: "pp. 8–9",
        status: "not-yet",
      },
    ],
  },
  {
    id: "combat",
    title: "Combat and wounds",
    lines: [
      {
        text: "A Wound reduces Vitality by one. Vitality at zero ends the adventure, unless that passage says otherwise.",
        page: "p. 8",
        status: "not-yet",
      },
      {
        text: "Each fight round is a Talent test at the stated penalty. A failed round is one Wound. A fumble adds one Wound only when that round already causes one. Finish the rounds and survive to win.",
        page: "p. 10",
        status: "not-yet",
      },
      {
        text: "Fighting unarmed is an extra −1. A shield lowers the combat penalty by 1, or by 2 against more than one opponent.",
        page: "pp. 10–11",
        status: "not-yet",
      },
      {
        text: "Light, Medium, and Heavy armour have protection 1, 2, and 3. You may ignore that many individual wounds in an adventure. It is not subtracted every round.",
        page: "p. 11",
        status: "not-yet",
      },
    ],
  },
  {
    id: "equipment",
    title: "Equipment",
    lines: [
      {
        text: "The sheet can list ordinary items, and gold is a number in the coin pouch.",
        page: "p. 12",
        status: "in-app",
      },
      {
        text: "Ordinary items are not counted against a limit. The coin pouch has no capacity. Heavy items, including every weapon, shield, and armour, are limited to twice maximum Vitality.",
        page: "p. 12",
        status: "not-yet",
      },
      {
        text: "Treasure is sold where the book allows and is not spent as coins. If several items bonus the same skill, only the highest applies.",
        page: "p. 12",
        status: "not-yet",
      },
    ],
  },
  {
    id: "xp",
    title: "XP",
    lines: [
      {
        text: "One Talent costs your current Talent in XP. One Vitality costs twice your current Vitality. A new basic skill costs 2 XP. Raising a skill costs its current bonus in XP.",
        page: "p. 13",
        status: "not-yet",
      },
      {
        text: "You spend XP between adventures or at a Rest. Raising a damaged stat raises the maximum only. No overall Talent or Vitality cap is stated.",
        page: "p. 13",
        status: "not-yet",
      },
    ],
  },
];
