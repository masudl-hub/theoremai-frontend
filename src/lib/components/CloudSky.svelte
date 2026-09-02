<script lang="ts">
import { type CloudSpec, cloudParade, skyStipple } from '$lib/data/clouds';

let {
	band = 'cloud-band-default absolute inset-x-0 z-0 select-none overflow-visible text-black',
	clouds = cloudParade,
	stipple = true,
}: {
	band?: string;
	clouds?: CloudSpec[];
	stipple?: boolean;
} = $props();

const sizeClass: Record<string, string> = {
	sm: 'cloud-size-sm',
	md: 'cloud-size-md',
	lg: 'cloud-size-lg',
	xl: 'cloud-size-xl',
};
</script>

{#if stipple}
	<pre
		class="ascii cloud-stipple pointer-events-none absolute inset-x-0 z-0 select-none px-6 text-black md:px-12"
		aria-hidden="true"
	>{skyStipple}</pre>
{/if}

<div class="pointer-events-none {band}" aria-hidden="true">
	{#each clouds as cloud (cloud.id)}
		<pre
			data-cloud-id={cloud.id}
			class="ascii cloud-drift cloud-size-base absolute {sizeClass[cloud.size]}"
		>{cloud.art}</pre>
	{/each}
</div>

<style>
.cloud-band-default {
	top: 10%;
	bottom: 10%;
}

.cloud-stipple {
	top: 4%;
	font-size: 9px;
	line-height: 2.2;
	opacity: 0.07;
}

@media (min-width: 768px) {
	.cloud-stipple {
		top: 6%;
		font-size: 11px;
		line-height: 2.4;
	}
}

.cloud-size-base {
	line-height: 1.05;
}

.cloud-size-sm {
	font-size: 8px;
}

.cloud-size-md {
	font-size: 9px;
}

.cloud-size-lg {
	font-size: 10px;
}

.cloud-size-xl {
	font-size: 11px;
}

@media (min-width: 768px) {
	.cloud-size-sm {
		font-size: 10px;
	}

	.cloud-size-md {
		font-size: 0.72rem;
	}

	.cloud-size-lg {
		font-size: 14px;
	}

	.cloud-size-xl {
		font-size: 0.95rem;
	}
}
</style>
