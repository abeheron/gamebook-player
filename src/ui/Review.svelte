<script lang="ts">
  import { untrack } from "svelte";
  import type { DraftBook, DraftChoice, DraftSection } from "../format/structure-book";

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

  $effect(() => {
    const index = focus;
    pageIndex = untrack(() => draft.sections)[index]?.pageIndex ?? 0;
  });

  const section = $derived(draft.sections[focus] ?? draft.sections[0]);
  const page = $derived(draft.pages[pageIndex] ?? draft.pages[0]);
  const blocked = $derived(draft.sections.some((entry) => entry.flags.length > 0 && !entry.checked));
  const flagged = $derived(
    draft.sections.flatMap((entry, index) => (entry.flags.length > 0 && !entry.checked ? [index] : [])),
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

<div class="review" data-testid="review">
  <div class="card" role="region" data-testid="review-list" aria-label="Sections">
    <div class="section-list">
      {#each draft.sections as entry, index (index)}
        <button
          type="button"
          class="section-row"
          data-testid="review-section-{index}"
          aria-current={index === focus ? "true" : undefined}
          onclick={() => choose(index)}
        >
          <span>§{entry.number} {entry.title}</span>
          {#if entry.flags.length > 0 && !entry.checked}
            <span class="check-mark" data-testid="review-flag-{index}">CHECK</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
  <div class="card" data-testid="review-source">
    <h2 data-testid="review-page-ref">{page?.ref}</h2>
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
  {#if section}
    <div class="card" data-testid="review-editor">
      {#each section.flags as flag (flag)}
        {#if !section.checked}
          <p class="note" data-testid="review-reason">{flag}</p>
        {/if}
      {/each}
      <label>§ <input data-testid="review-number" value={section.number} oninput={(event) => patch({ number: event.currentTarget.value })} /></label>
      <label>Title <input data-testid="review-title" value={section.title} oninput={(event) => patch({ title: event.currentTarget.value })} /></label>
      <label>Passage <textarea data-testid="review-passage" rows="5" value={section.passage} oninput={(event) => patch({ passage: event.currentTarget.value })}></textarea></label>
      <p class="field-label">Choices</p>
      {#each section.choices as choice, index (index)}
        <div class="choice-edit">
          <input
            data-testid="review-choice-label-{index}"
            value={choice.label}
            oninput={(event) => patchChoice(index, { label: event.currentTarget.value })}
          />
          <span>→ §</span>
          <input
            data-testid="review-choice-to-{index}"
            value={choice.to}
            oninput={(event) => patchChoice(index, { to: event.currentTarget.value })}
          />
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
      <p class="field-label">Test</p>
      <label>Pass → § <input data-testid="review-pass" value={section.passTo} oninput={(event) => patch({ passTo: event.currentTarget.value })} /></label>
      <label>Fail → § <input data-testid="review-fail" value={section.failTo} oninput={(event) => patch({ failTo: event.currentTarget.value })} /></label>
      <p class="field-label">Fight</p>
      <input aria-label="Fight" data-testid="review-fight" value={section.fightName} oninput={(event) => patch({ fightName: event.currentTarget.value })} />
      <label>Rounds <input data-testid="review-rounds" value={section.fightRounds} oninput={(event) => patch({ fightRounds: event.currentTarget.value })} /></label>
      <label>Win → § <input data-testid="review-win" value={section.winTo} oninput={(event) => patch({ winTo: event.currentTarget.value })} /></label>
      <label>Lose → § <input data-testid="review-lose" value={section.loseTo} oninput={(event) => patch({ loseTo: event.currentTarget.value })} /></label>
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
    </div>
  {/if}
</div>
