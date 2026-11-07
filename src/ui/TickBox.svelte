<script lang="ts">
  let { ticked, label, small = false }: { ticked: boolean; label: string; small?: boolean } = $props();
</script>

<span
  class="box"
  class:sm={small}
  class:t={ticked}
  role="img"
  aria-label="{label}: {ticked ? "ticked" : "not ticked"}"
></span>
