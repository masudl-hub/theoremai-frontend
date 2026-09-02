<script lang="ts">
import { type CloudSpec, cloudParade, skyStipple } from '$lib/data/clouds';

let {
	band = 'absolute inset-x-0 top-[10%] bottom-[10%] z-0 select-none overflow-visible text-black',
	clouds = cloudParade,
	stipple = true,
}: {
	band?: string;
	clouds?: CloudSpec[];
	stipple?: boolean;
} = $props();

const sizeClass: Record<string, string> = {
	sm: 'text-[8px] md:text-[10px]',
	md: 'text-[9px] md:text-[12px]',
	lg: 'text-[10px] md:text-[14px]',
	xl: 'text-[11px] md:text-[15px]',
};
</script>

{#if stipple}
	<pre
		class="ascii pointer-events-none absolute inset-x-0 top-[4%] z-0 select-none px-6 text-[9px] leading-[2.2] text-black opacity-[0.07] md:top-[6%] md:px-12 md:text-[11px] md:leading-[2.4]"
		aria-hidden="true"
	>{skyStipple}</pre>
{/if}

<div class="pointer-events-none {band}" aria-hidden="true">
	{#each clouds as cloud (cloud.id)}
		<pre
			data-cloud-id={cloud.id}
			class="ascii cloud-drift absolute leading-[1.05] {sizeClass[cloud.size]}"
		>{cloud.art}</pre>
	{/each}
</div>
