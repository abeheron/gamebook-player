<script lang="ts">
  import { importBookText } from "../format/import-book";
  import type { Book, SystemDef } from "../format/types";

  type StepMark = "wait" | "ok" | "fail";

  let {
    cards,
    system,
    existingIds,
    onAdded,
    onContinue,
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
    }[];
    system: SystemDef;
    existingIds: string[];
    onAdded: (book: Book) => Promise<void>;
    onContinue: (id: string) => void;
  } = $props();

  const labels = ["Read file locally", "Validate against JSON Schema", "Check system file (GNAT)", "Add to library"];

  let steps = $state<StepMark[]>(["wait", "wait", "wait", "wait"]);
  let failedStep = $state<number | null>(null);
  let errors = $state<string[]>([]);
  let message = $state("No file has been read yet.");
  let busy = $state(false);
  let picker = $state<HTMLInputElement | null>(null);

  async function importFile(file: File): Promise<void> {
    if (busy) return;
    busy = true;
    steps = ["wait", "wait", "wait", "wait"];
    failedStep = null;
    errors = [];
    message = `Reading ${file.name}.`;
    let text = "";
    try {
      text = await file.text();
    } catch {
      steps = ["fail", "wait", "wait", "wait"];
      failedStep = 1;
      errors = ["The file could not be read."];
      message = errors[0] ?? "";
      busy = false;
      return;
    }
    const result = importBookText(text, system, existingIds);
    if (!result.ok) {
      steps = ([1, 2, 3, 4] as const).map((number) =>
        number < result.step ? "ok" : number === result.step ? "fail" : "wait",
      );
      failedStep = result.step;
      errors = result.errors;
      message = result.errors.join(" ");
      busy = false;
      return;
    }
    try {
      await onAdded(result.book);
    } catch {
      steps = ["ok", "ok", "ok", "fail"];
      failedStep = 4;
      errors = ["The library could not store the book."];
      message = errors[0] ?? "";
      busy = false;
      return;
    }
    steps = ["ok", "ok", "ok", "ok"];
    failedStep = null;
    errors = [];
    message = `${file.name} added to the library.`;
    busy = false;
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
  <div class="grid2">
    <div class="library-list">
      {#each cards as card (card.id)}
        <div class="card book" data-testid="library-book-{card.id}">
          <div class="cover" class:alt={card.altCover} aria-hidden="true">{card.title}</div>
          <div>
            <h2>{card.title}</h2>
            <div class="note">{card.author} · {card.system} · {card.sections} sections</div>
            <div class="explored">Explored {card.explored} sections</div>
            <div class="bar" aria-hidden="true"><div style:width="{card.sections === 0 ? 0 : (card.explored / card.sections) * 100}%"></div></div>
            <div class="library-actions">
              <button type="button" class="btn" data-testid="library-continue-{card.id}" onclick={() => onContinue(card.id)}>
                Continue · §{card.sectionId}
              </button>
              <button type="button" class="btn ghost" disabled>New adventurer</button>
              <button type="button" class="btn ghost" disabled>Save slots</button>
            </div>
          </div>
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
        Drop a book file (YAML or JSON)<br />
        <button type="button" class="btn ghost" data-testid="import-choose" onclick={() => picker?.click()}>Choose a file</button>
        <input
          bind:this={picker}
          data-testid="import-input"
          type="file"
          accept=".json,.yaml,.yml,application/json,text/yaml"
          onchange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void importFile(file);
            event.currentTarget.value = "";
          }}
        />
      </div>
      <ol class="steps" data-testid="import-steps">
        {#each labels as label, index (label)}
          <li data-testid="import-step-{index + 1}" data-state={steps[index]}>
            <span class="s" class:ok={steps[index] === "ok"}>{steps[index] === "ok" ? "✓" : index + 1}</span>
            <span>
              {label}
              {#if failedStep === index + 1}
                {#each errors as error (error)}
                  <span class="note">{error}</span>
                {/each}
              {/if}
            </span>
          </li>
        {/each}
      </ol>
      <p class="note" data-testid="import-message" aria-live="polite">{message}</p>
    </aside>
  </div>
</section>
