<script lang="ts">
import type { Snippet } from 'svelte';

let {
	title,
	open = false,
	children,
}: {
	title: string;
	open?: boolean;
	children: Snippet;
} = $props();
</script>

<details class="facet-fold" {open}>
	<summary class="facet-fold__summary">{title}</summary>
	<div class="facet-fold__body">
		{@render children()}
	</div>
</details>
