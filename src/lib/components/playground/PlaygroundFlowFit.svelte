<script lang="ts">
import { useSvelteFlow } from '@xyflow/svelte';
import { tick } from 'svelte';

let { panelOpen, graphKey }: { panelOpen: boolean; graphKey: number } = $props();

const { fitView } = useSvelteFlow();

$effect(() => {
	panelOpen;
	graphKey;
	void (async () => {
		await tick();
		await fitView({
			padding: 0.18,
			minZoom: 0.72,
			maxZoom: 1,
			duration: 320,
		});
	})();
});
</script>
