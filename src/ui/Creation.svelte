<script lang="ts">
  import type { Character, SystemDef } from "../format/types";
  import {
    FREE_SKILLS,
    MAX_TRADES,
    WEAPONS,
    baseTalent,
    beginReason,
    buildCharacter,
    chooseWeapon,
    emptyDraft,
    setShield,
    skillsFull,
    talentFor,
    toggleSkill,
    tradesIn,
    undoLastTrade,
  } from "../engine/creation";
  import { WEAPON_TEXT, weaponSummary } from "./wording";

  let { system, startSection, onBegin }: { system: SystemDef; startSection: string; onBegin: (character: Character) => void } = $props();

  /** Approved one-line descriptions. */
  const SKILL_LINES: Record<string, string> = {
    climbing: "Climbing, balancing and athletics",
    diplomacy: "Negotiating with others",
    larceny: "Locks, traps, sleight of hand",
    linguistics: "Translating dead languages",
    naturalist: "Plants and animals",
    occult: "The supernatural and spellcasting",
    search: "Finding hidden things",
    stealth: "Sneaking and hiding",
    swimming: "Swimming and fighting in water",
    tracking: "Following trails, finding people",
  };

  let draft = $state(emptyDraft());

  const trades = $derived(tradesIn(draft));
  const full = $derived(skillsFull(draft));
  const start = $derived(baseTalent(system));
  const talent = $derived(talentFor(system, draft));
  const reason = $derived(beginReason(system, draft));
  const canShield = $derived(draft.weapon === "one-handed");
  const vitality = $derived(system.stats.find((stat) => stat.id === "vitality"));
  const fortune = $derived(system.stats.find((stat) => stat.id === system.fortuneStat));

  function label(id: string): string {
    return system.skills.find((skill) => skill.id === id)?.label ?? id;
  }

  function cost(id: string): string {
    const index = draft.picked.indexOf(id);
    if (index >= 0) return index >= FREE_SKILLS ? "−1 Talent" : "Free";
    if (draft.picked.length < FREE_SKILLS) return "Free";
    return full ? "" : "−1 Talent";
  }

  function begin(): void {
    const character = buildCharacter(system, $state.snapshot(draft));
    if (character) onBegin(character);
  }
</script>

<div class="creation" data-testid="creation">
  <h1>New character</h1>
  <p class="sub">Pick two skills and a weapon. You can give up 1 Talent for each extra skill, up to three times.</p>
  <div class="create">
    <section class="picks" aria-label="Choices" data-testid="create-picks">
      <div class="card" data-testid="create-skills">
        <div class="head">
          <h2 id="create-h-skills">Skills</h2>
          <div class="counter" aria-live="polite" data-testid="create-counter">
            <b>{Math.min(draft.picked.length, FREE_SKILLS)} of {FREE_SKILLS}</b> free · Trades <b>{trades} of {MAX_TRADES}</b><span
              class="trades"
              aria-hidden="true"
            >
              {#each Array.from({ length: MAX_TRADES }, (_, index) => index) as index (index)}
                <i class:on={index < trades}></i>
              {/each}
            </span>
          </div>
        </div>
        <p class="note">
          A skill you have adds +2 to its tests. Without it you test at −2. Your first two are free; each extra one costs 1 Talent.
        </p>
        <ul class="skills" aria-labelledby="create-h-skills">
          {#each system.skills as skill (skill.id)}
            {@const on = draft.picked.includes(skill.id)}
            <li>
              <button
                type="button"
                class="skill"
                aria-pressed={on}
                disabled={!on && full}
                data-testid="create-skill-{skill.id}"
                onclick={() => (draft = toggleSkill(system, draft, skill.id))}
              >
                <span class="box" class:t={on} aria-hidden="true"></span>
                <span><span class="nm">{skill.label}</span><span class="ds">{SKILL_LINES[skill.id] ?? ""}</span></span>
                <span class="cost" data-testid="create-cost-{skill.id}">{cost(skill.id)}</span>
              </button>
            </li>
          {/each}
        </ul>
        <div class="undo-row">
          <button type="button" class="btn ghost" data-testid="create-undo" disabled={trades === 0} onclick={() => (draft = undoLastTrade(draft))}>
            Undo last trade
          </button>
          <span class="note">Or untick an extra skill to get its Talent back.</span>
        </div>
      </div>
      <div class="card" data-testid="create-weapon">
        <h2 id="create-h-weapon">Weapon</h2>
        <p class="note">Choose one. You can find other weapons later.</p>
        <div class="weapons" role="radiogroup" aria-labelledby="create-h-weapon">
          {#each WEAPONS as weapon (weapon)}
            <button
              type="button"
              role="radio"
              class="weapon"
              aria-checked={draft.weapon === weapon}
              data-testid="create-weapon-{weapon}"
              onclick={() => (draft = chooseWeapon(draft, weapon))}
            >
              <span class="nm"><span class="radio" aria-hidden="true"></span>{WEAPON_TEXT[weapon].name}</span>
              <span class="ds">{WEAPON_TEXT[weapon].line}</span>
            </button>
          {/each}
        </div>
        <label class="shield" class:off={!canShield}>
          <input
            type="checkbox"
            data-testid="create-shield"
            disabled={!canShield}
            checked={draft.shield}
            onchange={(event) => (draft = setShield(draft, event.currentTarget.checked))}
          />
          <span data-testid="create-shield-text">
            {canShield
              ? "Take a shield (optional). It lowers a fight penalty by 1, or by 2 against several foes."
              : "Shield: only with a one-handed weapon."}
          </span>
        </label>
      </div>
      <div class="card" data-testid="create-kit">
        <h2>Starting kit</h2>
        <p class="note">Every new character gets this.</p>
        <div class="kit"><span class="chip">1 ration</span><span class="chip">10 gp</span></div>
      </div>
    </section>
    <div class="rail">
      <aside class="card summary" aria-label="Your character" data-testid="create-summary">
        <h2>Your character</h2>
        <div class="statline">
          <div class="stat" class:changed={trades > 0} data-testid="create-talent-stat">
            <span>Talent</span>
            <b data-testid="create-talent">{talent}</b>
            <span class="delta" data-testid="create-talent-note">{trades > 0 ? `Started at ${start}` : ""}</span>
          </div>
          <div class="stat">
            <span>Vitality</span>
            <span class="fortune-figure"><b>{vitality?.initial ?? 0}</b> <span class="max">/ {vitality?.initial ?? 0}</span></span>
            <span class="delta"></span>
          </div>
          <div class="stat fortune" role="group" aria-label="Fortune {fortune?.initial ?? 0} of {fortune?.max ?? 0}">
            <span aria-hidden="true">Fortune</span>
            <span class="fortune-figure" aria-hidden="true"><b>{fortune?.initial ?? 0}</b> <span class="max">/ {fortune?.max ?? 0}</span></span>
            <span class="fortune-pips" aria-hidden="true">
              {#each Array.from({ length: fortune?.max ?? 0 }, (_, index) => index) as index (index)}
                <i class:on={index < (fortune?.initial ?? 0)}></i>
              {/each}
            </span>
          </div>
        </div>
        <dl class="kv">
          <dt>Skills</dt>
          <dd>
            <div class="chips" data-testid="create-summary-skills">
              {#each draft.picked as id, index (id)}
                <span class="chip" class:traded={index >= FREE_SKILLS}>{label(id)} +{system.basicSkillBonus}</span>
              {:else}
                <span class="note">None yet</span>
              {/each}
            </div>
          </dd>
          <dt>Weapon</dt>
          <dd data-testid="create-summary-weapon">
            {draft.weapon ? weaponSummary(draft.weapon, draft.shield) : "Not chosen"}
          </dd>
          <dt>Kit</dt>
          <dd>1 ration · 10 gp</dd>
        </dl>
      </aside>
      <div class="card begin" data-testid="create-begin-card">
        <p class="reason" class:ready={reason.ready} id="create-reason" aria-live="polite" data-testid="create-reason">{reason.text}</p>
        <button type="button" class="btn" data-testid="create-begin" aria-describedby="create-reason" disabled={!reason.ready} onclick={begin}>
          Begin adventure <span class="to">→ §{startSection}</span>
        </button>
      </div>
    </div>
  </div>
</div>
