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
  let readerReady = false;

  function stop(step: number, error: string): void {
    steps = labels.map((_, index) => (index + 1 < step ? "ok" : index + 1 === step ? "fail" : "wait"));
    failure = error;
    message = `Import stopped at step ${step}.`;
    busy = false;
  }

  async function importFile(file: File): Promise<void> {
    if (busy) return;
    busy = true;
    draft = null;
    confirming = null;
    failure = "";
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
    const result = await convertBytes(bytes, file.name, system);
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
  {#if draft}
    {#key reviewKey}
      <Review {draft} {focus} {busy} onChange={(next) => (draft = next)} onFocus={(index) => (focus = index)} onAdd={() => void addDraft()} />
    {/key}
  {/if}
  <div class="grid2">
    <div class="library-list">
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
      <ol class="steps" data-testid="import-steps">
        {#each labels as label, index (label)}
          <li data-testid="import-step-{index + 1}" data-state={steps[index]}>
            <span class="s" class:ok={steps[index] === "ok"} class:fail={steps[index] === "fail"}>{steps[index] === "ok" ? "✓" : steps[index] === "fail" ? "✕" : index + 1}</span>
            <span>
              {label}
              {#if steps[index] === "fail"}
                <span class="note">{failure}</span>
              {/if}
            </span>
          </li>
        {/each}
      </ol>
      <p class="note" data-testid="import-message" aria-live="polite">{message}</p>
    </aside>
  </div>
</section>
