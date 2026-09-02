<script lang="ts">
let { path, text = path }: { path: string; text?: string } = $props();
</script>

<button class="type-label facet-field-label" data-type-path={path} type="button">{text}</button>
