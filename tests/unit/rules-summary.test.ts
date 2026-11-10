import { describe, expect, it } from "vitest";
import { rulesCredit, rulesSummary } from "../../src/ui/rules-summary";

describe("rules summary", () => {
  it("credits the GNAT core rules and keeps the seven groups", () => {
    expect(rulesCredit).toBe("GNAT core rules by David M. Donachie, CC BY-SA 4.0");
    expect(rulesSummary.map((section) => section.id)).toEqual([
      "stats",
      "skills",
      "tests",
      "fortune",
      "combat",
      "equipment",
      "xp",
    ]);
  });

  it("cites a rules-chapter page on every line and marks Fortune, combat, and XP as not yet", () => {
    for (const section of rulesSummary) {
      expect(section.lines.length).toBeGreaterThan(0);
      for (const line of section.lines) {
        expect(line.page).toMatch(/^pp?\. /);
        expect(line.text).not.toMatch(/Temple|Skull God/);
      }
    }
    for (const id of ["xp"]) {
      const section = rulesSummary.find((entry) => entry.id === id);
      expect(section?.lines.every((line) => line.status === "not-yet")).toBe(true);
    }
    const fortune = rulesSummary.find((section) => section.id === "fortune");
    expect(fortune?.lines[0]).toMatchObject({ status: "in-app", page: "pp. 8–9" });
    expect(fortune?.lines[0]?.text).toContain("Spend 1 Fortune");
    expect(fortune?.lines[1]?.status).toBe("not-yet");
    const combat = rulesSummary.find((section) => section.id === "combat");
    expect(combat?.lines.filter((line) => line.status === "in-app").map((line) => line.page)).toEqual(["p. 8", "p. 10"]);
    expect(combat?.lines.some((line) => line.text.startsWith("A fumble") && line.status === "not-yet")).toBe(true);
  });

  it("lists the ten skills and the basic bonus as rules this build uses", () => {
    const skills = rulesSummary.find((section) => section.id === "skills");
    const names = skills?.lines[0];
    expect(names?.status).toBe("in-app");
    expect(names?.text).toContain("Climbing");
    expect(names?.text).toContain("Tracking");
    expect(names?.page).toBe("pp. 7–8");
    expect(skills?.lines[1]).toMatchObject({ status: "in-app", page: "pp. 7–8" });
    expect(skills?.lines[1]?.text).toContain("+2");
    expect(skills?.lines[1]?.text).toContain("−2");
  });
});
