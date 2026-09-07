<script lang="ts">
import { useSvelteFlow } from '@xyflow/svelte';
import { tick } from 'svelte';
import { playgroundViewportForAnchor } from '$lib/playground/layout';

let { graphKey }: { graphKey: number } = $props();

const { setViewport } = useSvelteFlow();

$effect(() => {
	graphKey;
	void (async () => {
		await tick();
		await setViewport(playgroundViewportForAnchor(), { duration: 0 });
	})();
});
</script>
