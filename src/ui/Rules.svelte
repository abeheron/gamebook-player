<script lang="ts">
  import { rulesCredit, rulesSummary } from "./rules-summary";
</script>

<div data-testid="rules-view">
  <h1>Rules</h1>
  <p class="note" data-testid="rules-credit">{rulesCredit}</p>
  <p class="note">
    A short summary in this app's words. The page beside each line is the rules chapter. Lines marked below are not what this build plays.
  </p>
  <div class="rules-grid">
    {#each rulesSummary as section (section.id)}
      <section
        class="card"
        class:rule-gap={section.lines.every((line) => line.status === "not-yet")}
        data-testid="rules-{section.id}"
      >
        <h2>{section.title}</h2>
        <ul>
          {#each section.lines as line}
            <li>
              {line.text}
              <span class="rule-page">{line.page}</span>
              {#if line.status === "not-yet"}
                <span class="rule-status">Not yet in this app</span>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</div>
