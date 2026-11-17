<script lang="ts">
  import { untrack } from "svelte";
  import { sectionCount } from "../format/import-book";
  import {
    flaggedNotice,
    listLabel,
    placeFlags,
    sourcePageHeading,
    type DraftBook,
    type DraftChoice,
    type DraftSection,
  } from "../format/structure-book";

  let {
    draft,
    focus,
    busy,
    onChange,
    onFocus,
    onAdd,
  }: {
    draft: DraftBook;
    focus: number;
    busy: boolean;
    onChange: (next: DraftBook) => void;
    onFocus: (index: number) => void;
    onAdd: () => void;
  } = $props();

  let pageIndex = $state(0);
  let testOpened = $state(false);
  let fightOpened = $state(false);
  let seenFocus = -1;

  $effect(() => {
    const index = focus;
    pageIndex = untrack(() => draft.sections)[index]?.pageIndex ?? 0;
    if (index === seenFocus) return;
    seenFocus = index;
    testOpened = false;
    fightOpened = false;
  });

  const section = $derived(draft.sections[focus] ?? draft.sections[0]);
  const page = $derived(draft.pages[pageIndex] ?? draft.pages[0]);
  const flags = $derived(section ? placeFlags(section) : undefined);
  const stillFlagged = $derived(draft.sections.filter((entry) => entry.flags.length > 0 && !entry.checked).length);
  const blocked = $derived(stillFlagged > 0);
  const flagged = $derived(
    draft.sections.flatMap((entry, index) => (entry.flags.length > 0 && !entry.checked ? [index] : [])),
  );
  const showTest = $derived(
    Boolean(section && (testOpened || section.sawTest || section.testLabel || section.passTo || section.failTo)),
  );
  const showFight = $derived(
    Boolean(section && (fightOpened || section.sawFight || section.fightName || section.fightRounds || section.winTo || section.loseTo)),
  );

  function choose(index: number): void {
    onFocus(index);
  }

  function patch(partial: Partial<DraftSection>): void {
    onChange({
      ...draft,
      sections: draft.sections.map((entry, index) => (index === focus ? { ...entry, ...partial } : entry)),
    });
  }

  function patchChoice(index: number, partial: Partial<DraftChoice>): void {
    if (!section) return;
    patch({
      choices: section.choices.map((choice, choiceIndex) => (choiceIndex === index ? { ...choice, ...partial } : choice)),
    });
  }

  function moveFlagged(direction: -1 | 1): void {
    const earlier = flagged.filter((index) => (direction < 0 ? index < focus : index > focus));
    const next = direction < 0 ? earlier[earlier.length - 1] : earlier[0];
    if (next !== undefined) choose(next);
  }
</script>

{#snippet fieldFlags(messages: string[])}
  {#each messages as flag (flag)}
    {#if section && !section.checked}
      <p class="flag-msg" data-testid="review-reason">{flag}</p>
    {/if}
  {/each}
{/snippet}

<div class="review" data-testid="review">
  <div class="card" role="region" data-testid="review-list" aria-label="Sections">
    <div class="review-tally" data-testid="review-tally">
      <span>{sectionCount(draft.sections.length)}</span>
      <span data-testid="review-still">{stillFlagged} still flagged</span>
    </div>
    <div class="section-list">
      {#each draft.sections as entry, index (index)}
        <button
          type="button"
          class="section-row"
          data-testid="review-section-{index}"
          aria-current={index === focus ? "true" : undefined}
          onclick={() => choose(index)}
        >
          <span class="section-lead">{listLabel(entry.number, entry.passage)}</span>
          {#if entry.flags.length > 0 && !entry.checked}
            <span class="check-mark" data-testid="review-flag-{index}">CHECK</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
  <div class="card" data-testid="review-source">
    <h2 data-testid="review-page-ref">{page ? sourcePageHeading(page.ref, draft.source) : ""}</h2>
    <pre class="source-text">{page?.text}</pre>
    <div class="library-actions">
      <button type="button" class="btn ghost" data-testid="review-prev-page" disabled={pageIndex <= 0} onclick={() => (pageIndex -= 1)}>
        Previous page
      </button>
      <button
        type="button"
        class="btn ghost"
        data-testid="review-next-page"
        disabled={pageIndex >= draft.pages.length - 1}
        onclick={() => (pageIndex += 1)}
      >
        Next page
      </button>
    </div>
  </div>
  {#if section && flags}
    <div class="card" data-testid="review-editor">
      <label>Section number <input data-testid="review-number" value={section.number} oninput={(event) => patch({ number: event.currentTarget.value })} /></label>
      {@render fieldFlags(flags.number)}
      <label>Title <input data-testid="review-title" value={section.title} oninput={(event) => patch({ title: event.currentTarget.value })} /></label>
      <label>Passage <textarea data-testid="review-passage" rows="5" value={section.passage} oninput={(event) => patch({ passage: event.currentTarget.value })}></textarea></label>
      {@render fieldFlags(flags.passage)}
      <p class="field-label">Choices</p>
      {@render fieldFlags(flags.other)}
      {#each section.choices as choice, index (index)}
        <div class="choice-block">
          <div class="choice-edit">
            <input
              class="choice-text"
              data-testid="review-choice-label-{index}"
              value={choice.label}
              oninput={(event) => patchChoice(index, { label: event.currentTarget.value })}
            />
            <div class="dest-field">
              <span aria-hidden="true">→ §</span>
              <input
                data-testid="review-choice-to-{index}"
                aria-label={`→ §${choice.to}`}
                value={choice.to}
                oninput={(event) => patchChoice(index, { to: event.currentTarget.value })}
              />
            </div>
          </div>
          {@render fieldFlags(flags.choices[index] ?? [])}
        </div>
      {/each}
      <button
        type="button"
        class="btn ghost"
        data-testid="review-add-choice"
        onclick={() => patch({ choices: [...section.choices, { label: "", to: "" }] })}
      >
        Add a missed choice
      </button>
      <div class="mech">
        <p class="field-label">Test</p>
        {#if showTest}
          {@render fieldFlags(flags.test)}
          <div class="dest-field named">
            <span>Pass → §</span>
            <input
              data-testid="review-pass"
              aria-label={`Pass → §${section.passTo}`}
              value={section.passTo}
              oninput={(event) => patch({ passTo: event.currentTarget.value })}
            />
          </div>
          {@render fieldFlags(flags.pass)}
          <div class="dest-field named">
            <span>Fail → §</span>
            <input
              data-testid="review-fail"
              aria-label={`Fail → §${section.failTo}`}
              value={section.failTo}
              oninput={(event) => patch({ failTo: event.currentTarget.value })}
            />
          </div>
          {@render fieldFlags(flags.fail)}
        {:else}
          <p data-testid="review-test-none">None on this section.</p>
          <button type="button" class="btn ghost" data-testid="review-add-test" onclick={() => (testOpened = true)}>Add a test</button>
        {/if}
      </div>
      <div class="mech">
        <p class="field-label">Fight</p>
        {#if showFight}
          {@render fieldFlags(flags.fight)}
          <label>Fight <input data-testid="review-fight" value={section.fightName} oninput={(event) => patch({ fightName: event.currentTarget.value })} /></label>
          <label>Rounds <input data-testid="review-rounds" value={section.fightRounds} oninput={(event) => patch({ fightRounds: event.currentTarget.value })} /></label>
          <label>Penalty <input data-testid="review-penalty" value={section.fightPenalty} oninput={(event) => patch({ fightPenalty: event.currentTarget.value })} /></label>
          <div class="dest-field named">
            <span>Win → §</span>
            <input
              data-testid="review-win"
              aria-label={`Win → §${section.winTo}`}
              value={section.winTo}
              oninput={(event) => patch({ winTo: event.currentTarget.value })}
            />
          </div>
          {@render fieldFlags(flags.win)}
          <div class="dest-field named">
            <span>Lose → §</span>
            <input
              data-testid="review-lose"
              aria-label={`Lose → §${section.loseTo}`}
              value={section.loseTo}
              oninput={(event) => patch({ loseTo: event.currentTarget.value })}
            />
          </div>
          {@render fieldFlags(flags.lose)}
        {:else}
          <p data-testid="review-fight-none">None on this section.</p>
          <button type="button" class="btn ghost" data-testid="review-add-fight" onclick={() => (fightOpened = true)}>Add a fight</button>
        {/if}
      </div>
      <div class="library-actions">
        <button type="button" class="btn ghost" data-testid="review-prev-flagged" disabled={!flagged.some((index) => index < focus)} onclick={() => moveFlagged(-1)}>
          Previous flagged
        </button>
        <button type="button" class="btn ghost" data-testid="review-next-flagged" disabled={!flagged.some((index) => index > focus)} onclick={() => moveFlagged(1)}>
          Next flagged
        </button>
        <button type="button" class="btn ghost" data-testid="review-mark" onclick={() => patch({ checked: true })}>Mark as checked</button>
      </div>
      <button type="button" class="btn" data-testid="review-add" disabled={blocked || busy} onclick={onAdd}>Add to library</button>
      {#if blocked}
        <p class="note" data-testid="review-unavailable">{flaggedNotice(stillFlagged)}</p>
      {/if}
    </div>
  {/if}
</div>
