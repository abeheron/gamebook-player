<script lang="ts">
  import { convertBytes } from "../format/extract-book";
  import { exploredLabel, sectionCount } from "../format/import-book";
  import { prepareBrowserPdf } from "../format/pdf-browser";
  import { draftToBook, type DraftBook } from "../format/structure-book";
  import type { Book, SystemDef } from "../format/types";
  import Review from "./Review.svelte";

  type StepMark = "wait" | "ok" | "fail";

  let {
    cards,
    system,
    existingIds,
    onAdded,
    onContinue,
    onRemove,
  }: {
    cards: {
      id: string;
      title: string;
      author: string;
      system: string;
      sections: number;
      explored: number;
      sectionId: string;
      altCover: boolean;
      removable: boolean;
    }[];
    system: SystemDef;
    existingIds: string[];
    onAdded: (book: Book) => Promise<void>;
    onContinue: (id: string) => void;
    onRemove: (id: string) => Promise<void>;
  } = $props();

  const labels = [
    "Read file locally",
    "Extract text",
    "Structure as sections, choices, tests and fights",
    "Review and correct",
    "Validate against JSON Schema",
    "Check system file (GNAT)",
    "Add to library",
  ];

  let steps = $state<StepMark[]>(labels.map(() => "wait"));
  let failure = $state("");
  let message = $state("No file has been read yet.");
  let busy = $state(false);
  let draft = $state<DraftBook | null>(null);
  let focus = $state(0);
  let reviewKey = $state(0);
  let picker = $state<HTMLInputElement | null>(null);
  let confirming = $state<string | null>(null);
  let trackerOpen = $state(false);
  let readerReady = false;

  const started = $derived(busy || draft !== null || steps.some((mark) => mark !== "wait"));
  /** The step the tracker names: the failed step, the step in progress, or step 7 once every step is done. */
  const stepNow = $derived.by(() => {
    const failed = steps.indexOf("fail");
    if (failed >= 0) return failed;
    const waiting = steps.indexOf("wait");
    return waiting >= 0 ? waiting : labels.length - 1;
  });
  /** Only a step that is under way, such as Review and correct, gets the accent outline. */
  const inProgress = $derived((busy || draft !== null) && !steps.includes("fail"));

  function stop(step: number, error: string): void {
    steps = labels.map((_, index) => (index + 1 < step ? "ok" : index + 1 === step ? "fail" : "wait"));
    failure = error;
    message = `Import stopped at step ${step}.`;
    trackerOpen = true;
    busy = false;
  }

  async function importFile(file: File): Promise<void> {
    if (busy) return;
    busy = true;
    draft = null;
    confirming = null;
    failure = "";
    trackerOpen = false;
    steps = labels.map(() => "wait");
    message = `Reading ${file.name}.`;
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      stop(1, "The file could not be read.");
      return;
    }
    steps = labels.map((_, index) => (index === 0 ? "ok" : "wait"));
    if (!readerReady) {
      prepareBrowserPdf();
      readerReady = true;
    }
    const result = await convertBytes(bytes, file.name, system, async (done) => {
      steps = labels.map((_, index) => (index < done ? "ok" : "wait"));
      // Structuring runs synchronously, so yield once to let the tick paint before it starts.
      if (done === 2) await new Promise((resolve) => setTimeout(resolve, 0));
    });
    if (!result.ok) {
      stop(result.step, result.error);
      return;
    }
    steps = labels.map((_, index) => (index < 3 ? "ok" : "wait"));
    draft = result.draft;
    focus = Math.max(0, result.draft.sections.findIndex((section) => section.flags.length > 0 && !section.checked));
    reviewKey += 1;
    message = "Review and correct.";
    busy = false;
  }

  async function addDraft(): Promise<void> {
    if (!draft || busy) return;
    if (draft.sections.some((section) => section.flags.length > 0 && !section.checked)) return;
    busy = true;
    const built = draftToBook(draft, system);
    if (!built.ok) {
      stop(built.step, built.error);
      return;
    }
    if (existingIds.includes(built.book.id)) {
      stop(7, `“${built.book.title}” is already in the library.`);
      return;
    }
    steps = labels.map((_, index) => (index < 6 ? "ok" : "wait"));
    try {
      await onAdded(built.book);
    } catch {
      stop(7, "The library could not store the book.");
      return;
    }
    steps = labels.map(() => "ok");
    failure = "";
    draft = null;
    message = "Added to the library.";
    busy = false;
  }

  async function confirmRemove(id: string): Promise<void> {
    confirming = null;
    await onRemove(id);
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) void importFile(file);
  }
</script>

<section class="library" data-testid="library" aria-labelledby="library-title">
  <h1 id="library-title">Library</h1>
  <p class="sub">Books stay local on this device. A file is read in this browser and is not sent anywhere.</p>
  <div class="tracker" class:open={trackerOpen} role="group" aria-label="Import steps" data-testid="import-tracker">
    <button
      type="button"
      class="tracker-phone"
      data-testid="import-tracker-toggle"
      aria-expanded={trackerOpen}
      aria-controls="import-steps"
      onclick={() => (trackerOpen = !trackerOpen)}
    >
      <span class="tracker-line">
        <span class="now" data-testid="import-step-now">Step {stepNow + 1} of {labels.length} · {labels[stepNow]}</span>
        <span class="chev" aria-hidden="true">▾</span>
      </span>
      <span class="prog" aria-hidden="true" data-testid="import-progress">
        <span style:width="{started ? ((stepNow + 1) / labels.length) * 100 : 0}%"></span>
      </span>
    </button>
    <ol class="steps" id="import-steps" data-testid="import-steps">
      {#each labels as label, index (label)}
        <li
          data-testid="import-step-{index + 1}"
          data-state={steps[index]}
          class:current={inProgress && index === stepNow}
          aria-current={inProgress && index === stepNow ? "step" : undefined}
        >
          <span
            class="s"
            class:ok={steps[index] === "ok"}
            class:fail={steps[index] === "fail"}
            class:cur={inProgress && index === stepNow}
          >{steps[index] === "ok" ? "✓" : steps[index] === "fail" ? "✕" : index + 1}</span>
          <span class="lab">
            {label}
            {#if steps[index] === "fail"}
              <span class="note">{failure}</span>
            {/if}
          </span>
        </li>
      {/each}
    </ol>
    <p class="status" data-testid="import-message" aria-live="polite">{message}</p>
  </div>
  {#if draft}
    {#key reviewKey}
      <Review {draft} {focus} {busy} onChange={(next) => (draft = next)} onFocus={(index) => (focus = index)} onAdd={() => void addDraft()} />
    {/key}
  {:else}
    <div class="grid2">
      <div class="library-list" data-testid="library-list">
        {#if cards.length === 0}
          <p class="note" data-testid="library-empty">No books yet. Import a book file to start.</p>
        {/if}
        {#each cards as card (card.id)}
          <div class="card book" data-testid="library-book-{card.id}">
            <div class="cover" class:alt={card.altCover} aria-hidden="true">{card.title}</div>
            <div>
              <h2>{card.title}</h2>
              <div class="note">{card.author} · {card.system} · {sectionCount(card.sections)}</div>
              <div class="explored">{exploredLabel(card.explored)}</div>
              <div class="bar" aria-hidden="true"><div style:width="{card.sections === 0 ? 0 : (card.explored / card.sections) * 100}%"></div></div>
            </div>
            {#if confirming === card.id}
              <div class="remove-confirm" data-testid="remove-confirm">
                <p>Remove {card.title}? Its saves on this device are deleted too.</p>
                <div class="library-actions">
                  <button type="button" class="btn ghost" data-testid="remove-do" onclick={() => void confirmRemove(card.id)}>Remove</button>
                  <button type="button" class="btn" data-testid="remove-keep" onclick={() => (confirming = null)}>Keep</button>
                </div>
              </div>
            {:else}
              <div class="library-actions">
                <button type="button" class="btn" data-testid="library-continue-{card.id}" onclick={() => onContinue(card.id)}>
                  Continue · §{card.sectionId}
                </button>
                <button type="button" class="btn ghost" disabled>New adventurer</button>
                <button type="button" class="btn ghost" disabled>Save slots</button>
                {#if card.removable}
                  <button type="button" class="btn ghost" data-testid="library-remove-{card.id}" onclick={() => (confirming = card.id)}>
                    Remove from library
                  </button>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
      <aside class="card">
        <h2>Import a book</h2>
        <div
          class="drop"
          role="group"
          aria-label="Drop a book file"
          data-testid="import-drop"
          ondragover={(event) => event.preventDefault()}
          ondrop={onDrop}
        >
          <div class="drop-mark" aria-hidden="true">⇪</div>
          Drop a book file (PDF or EPUB)<br />
          <button type="button" class="btn ghost" data-testid="import-choose" onclick={() => picker?.click()}>Choose a file</button>
          <input
            bind:this={picker}
            data-testid="import-input"
            type="file"
            accept=".pdf,.epub,application/pdf,application/epub+zip"
            onchange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void importFile(file);
              event.currentTarget.value = "";
            }}
          />
        </div>
        <p class="note">A PDF or EPUB is converted on this device, then you review the result before it is added.</p>
      </aside>
    </div>
  {/if}
</section>
