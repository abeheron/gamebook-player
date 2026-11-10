<script lang="ts">
  import { isSampleArtId } from "../format/sample-art";

  let { id, alt }: { id: string; alt: string } = $props();
</script>

{#if isSampleArtId(id) && id === "lantern"}
  <svg viewBox="0 0 640 300" role="img" aria-label={alt}>
    <rect width="640" height="300" fill="#efe6d6" />
    <line x1="320" y1="28" x2="320" y2="78" stroke="#5c5348" stroke-width="4" />
    <path d="M292 78 h56 l-8 18 h-40 z" fill="#8a2f1d" />
    <rect x="246" y="96" width="148" height="150" rx="16" fill="#fffdf8" stroke="#8a2f1d" stroke-width="6" />
    <rect x="278" y="124" width="84" height="96" rx="6" fill="#f3d27a" stroke="#5c5348" stroke-width="3" />
    <path d="M320 136 c10 16 10 28 0 44 c-10 -16 -10 -28 0 -44 z" fill="#8a2f1d" />
    <text x="16" y="28" font-family="sans-serif" font-size="14" fill="#5c5348">SAMPLE ART</text>
  </svg>
{:else if id === "moth"}
  <svg viewBox="0 0 640 300" role="img" aria-label={alt}>
    <rect width="640" height="300" fill="#e7e1d3" />
    <ellipse cx="250" cy="150" rx="90" ry="46" fill="#fffdf8" stroke="#5c5348" stroke-width="4" />
    <ellipse cx="390" cy="150" rx="90" ry="46" fill="#fffdf8" stroke="#5c5348" stroke-width="4" />
    <ellipse cx="320" cy="150" rx="18" ry="40" fill="#8a2f1d" />
    <circle cx="320" cy="104" r="10" fill="#1f1b16" />
    <path d="M320 94 q-18 -28 -8 -40" stroke="#1f1b16" stroke-width="3" fill="none" />
    <path d="M320 94 q18 -28 8 -40" stroke="#1f1b16" stroke-width="3" fill="none" />
    <text x="16" y="28" font-family="sans-serif" font-size="14" fill="#5c5348">SAMPLE ART</text>
  </svg>
{/if}
