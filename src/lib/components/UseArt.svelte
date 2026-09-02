<script lang="ts">
import { type SceneId, sceneClouds } from '$lib/data/use-art-clouds';

let { id }: { id: SceneId } = $props();

type SceneConfig = {
	foreground: string;
};

const scenes: Record<SceneId, SceneConfig> = {
	/* 1 · Install — Coastal survey beacon & maritime horizon */
	install: {
		foreground: [
			'                                                            ^^',
			'                                    ^^',
			'',
			'',
			'     /\\',
			'    /__\\                                              .---.',
			'   |====|                                            /|   |\\',
			'   | [] |                                           /_|___|_\\',
			'   |    |===--  -  -                                  | | |',
			'   |====|         -  -                                |===|',
			'   | [] |            - -                             /|   |\\',
			'   |    |                                           /==|===|==\\',
			'  /======\\       ~^~-~^~             ~^~-~^~       /           \\',
			' /________\\   ~^~       ~^~-~^~    ~^~       ~^~-~^~            ~^~-~^~',
			'/          \\~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
			'~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
		].join('\n'),
	},

	/* 2 · Describe agent — Panoramic computing skyline with antennas/masts (no crosses) */
	agent: {
		foreground: [
			'                                                                !',
			'       !                                                      .-|-.',
			'     .-|-.                                                    |===|',
			'     |===|                                !                   |   |',
			'     |   |                              .-|-.                 |   |',
			'     |   |                              |===|                 |   |',
			'     |   |   .-----.                    |   |                 |   |',
			'     |   |   | [ ] |    .---------.     |   |                 |   |',
			'   .-|   |-. | [ ] |    | [ ] [ ] |   .-|   |-.   .-----------.   |',
			'   | [ ] [ ] | [ ] |    | [ ] [ ] |   | [ ] [ ] | | [ ] [ ] [ ] | |',
			'   | [ ] [ ] | [ ] |    | [ ] [ ] |   | [ ] [ ] | | [ ] [ ] [ ] | |',
			'   | [ ] [ ] | [ ] |    | [ ] [ ] |   | [ ] [ ] | | [ ] [ ] [ ] | |',
			'   | [ ] [ ] | [ ] |    | [ ] [ ] |   | [ ] [ ] | | [ ] [ ] [ ] | |',
			'===|=========|=====|====|=========|===|=========|=|===========|===|===',
		].join('\n'),
	},

	/* 3 · Define models — Celestial dual-diamond Gemini constellation & mountain observatory */
	models: {
		foreground: [
			'                  . : * : .                      . : * : .',
			'                     / \\                            / \\',
			'                    *---*  - - - - - - - - - - - - *---*',
			'                     \\ /                            \\ /',
			"                      '                              '",
			'                              .  * .',
			'                             *      *',
			"                              ' . * '",
			'',
			'                              .-----.',
			"                            .'   |   '.",
			'                           /   .-|-.   \\           .-----.',
			"                          |   |  |  |   |        .'   |   '.",
			'         /\\               |___|__|__|___|       /   .-|-.   \\',
			'   /\\   /  \\      /\\     /               \\     |   |  |  |   |',
			'__/  \\_/    \\____/  \\___/_________________\\____|___|__|__|___|____',
		].join('\n'),
	},

	/* 4 · Configure tools — Construction tower cranes, lattice booms & hoisted payload block */
	tools: {
		foreground: [
			'             !                                       !',
			'          \\--|--/                                 \\--|--/',
			'        .---|---|-----------.                   .---|---|-----------.',
			'        | X | X | X | X | X | \\                 | X | X | X | X | X | \\',
			"        '---|---|-----------'--\\                '---|---|-----------'--\\",
			'            | X |               \\                   | X |               \\',
			'            | X |                \\                  | X |                \\',
			'            | X |                 \\                 | X |                 \\',
			'            | X |                  \\                | X |                  \\',
			'            | X |                   |               | X |                  |',
			'            | X |                   |               | X |                  |',
			'            | X |                                   | X |               .-----.',
			'            | X |                                   | X |               |TOOL |',
			"        .---|---|---.                           .---|---|---.           '-----'",
			'       /    | X |    \\                         /    | X |    \\',
			'======/_____|___|_____\\=======================/_____|___|_____\\=================',
		].join('\n'),
	},

	/* 5 · Allow inputs — Telemetry station & parabolic satellite dish array */
	inputs: {
		foreground: [
			'                                  (((( * ))))',
			'',
			'',
			'       !',
			'     .-|-.',
			'     |===|          __                                      __',
			'     |   |         /  \\                                    /  \\',
			'     |   |        /    \\===                               /    \\===',
			'     |   |       |  ()  |   \\                            |  ()  |   \\',
			'     |   |        \\    /     \\                            \\    /     \\',
			'     |   |         \\__/       |                            \\__/       |',
			'     |   |          ||        |                             ||        |',
			'     |   |         _||_      /                             _||_      /',
			'   .-|   |-.      /    \\____/                             /    \\____/',
			'===|=========|===/======\\================================/======\\===========',
		].join('\n'),
	},

	/* 6 · Describe outputs — Broadcast antenna, waveforms & structured grid projector */
	outputs: {
		foreground: [
			'                       . : | : .',
			'                      .  : | :  .',
			'                     .   : | :   .',
			'                        (((|)))',
			'                           |',
			'                         .-|-.',
			'                         |===|',
			'                         |   |',
			'   .                     |   |       .---.---.---.',
			'  / \\                  .-|   |-.     | [ ] [ ] [ ] |',
			' /   \\                 |   |   |     |---+---+---|',
			' /     \\   _.~"~._.~"~. |   |   |     | [ ] [ ] [ ] |    _.~"~._.~"~._',
			"       \\               |   |   |     '---'---'---'",
			'========\\==============|===|===|====================================',
		].join('\n'),
	},

	/* 7 · Set guardrails — Fortified stone citadel with battlements, banners & portcullis */
	guardrails: {
		foreground: [
			'                   |>>>',
			'                   |                                  |>>>',
			'                 .-|-.               |>>>             |',
			'                 |===|               |              .-|-.',
			'    |>>>         |   |             .-|-.            |===|         |>>>',
			'    |          .-|   |-.           |===|          .-|   |-.       |',
			'  .-|-.        | |_| |_|           |   |          | |_| |_|     .-|-.',
			"  |===|        |  :  : |        .-'     '-.       |  :  : |     |===|",
			'  |   |        | :  :  |        | |_|_|_| |       | :  :  |     |   |',
			".-'   '-.      |  :  : |        |  : : :  |     .-'   '-.     .-'   '-.",
			'| |_|_| |      | :  :  |        | : : : : |     | |_|_| |     | |_|_| |',
			'| : : : |====--|  :  : |--------|  : : :  |-----| : : : |--===| : : : |',
			'| : : : |      | :  :  |  /===\\ | : : : : |     | : : : |     | : : : |',
			'| : : : |      |  :  : |  |+++| |  : : :  |     | : : : |     | : : : |',
			'|=======|======|=======|==|+++|=|=========|=====|=======|=====|=======|',
		].join('\n'),
	},
};

const current = $derived({ foreground: scenes[id].foreground, clouds: sceneClouds[id] });
</script>

<div
	class="use-scene-container relative my-2 w-full overflow-hidden select-none"
	aria-hidden="true"
>
	<!-- Floating clouds layer using landing page clouds scaled down -->
	<div class="scene-sky pointer-events-none absolute inset-x-0 top-0 z-0 h-24 overflow-hidden">
		{#each current.clouds as cloud, i (`${id}-cloud-${i}`)}
			<pre
				data-scene-cloud="{id}-{i}"
				class="ascii cloud-drift scene-cloud absolute text-[7px] leading-[1.05] md:text-[8.5px] md:leading-[1.1]"
			>{cloud.art}</pre>
		{/each}
	</div>

	<!-- Ground and structure layer -->
	<pre
		class="ascii scene-art relative z-10 text-xs leading-tight md:text-sm md:leading-snug"
	>{current.foreground}</pre>
</div>

<style>
.use-scene-container {
	color: var(--color-mute);
	opacity: 0.42;
	overflow: hidden;
	scrollbar-width: none;
	-ms-overflow-style: none;
	transition:
		color 0.25s ease,
		opacity 0.25s ease;
}

.use-scene-container::-webkit-scrollbar {
	display: none;
}

.use-scene-container:hover {
	color: #000;
	opacity: 0.85;
}

.scene-cloud {
	color: inherit;
	margin: 0;
	font-weight: 500;
	scrollbar-width: none;
}

.scene-cloud::-webkit-scrollbar {
	display: none;
}

.scene-art {
	margin: 0;
	white-space: pre;
	font-weight: 500;
	overflow: hidden;
	scrollbar-width: none;
}

.scene-art::-webkit-scrollbar {
	display: none;
}
</style>
