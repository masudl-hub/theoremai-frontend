import { cloudPlacementRule } from './cloud-styles.ts';
import {
	CUMULUS,
	CUMULUS_MID,
	CUMULUS_SM,
	CUMULUS_TWIN,
	STRATO,
	STRATO_SM,
	STRATO_WIDE,
} from './clouds.ts';

export type SceneId =
	| 'install'
	| 'agent'
	| 'models'
	| 'tools'
	| 'inputs'
	| 'outputs'
	| 'guardrails';

export type SceneCloud = {
	art: string;
	left: string;
	top: string;
	duration: string;
	delay: string;
	opacity?: number;
};

export const sceneClouds: Record<SceneId, SceneCloud[]> = {
	install: [
		{ art: STRATO_SM, left: '4%', top: '2px', duration: '42s', delay: '-4s', opacity: 0.8 },
		{ art: CUMULUS_SM, left: '66%', top: '0px', duration: '36s', delay: '-18s', opacity: 0.85 },
	],
	agent: [
		{ art: CUMULUS_TWIN, left: '8%', top: '0px', duration: '48s', delay: '-12s', opacity: 0.8 },
		{ art: CUMULUS_SM, left: '74%', top: '4px', duration: '38s', delay: '-24s', opacity: 0.85 },
	],
	models: [
		{ art: CUMULUS_MID, left: '4%', top: '2px', duration: '44s', delay: '-8s', opacity: 0.8 },
		{ art: STRATO_SM, left: '70%', top: '6px', duration: '40s', delay: '-20s', opacity: 0.85 },
	],
	tools: [
		{ art: STRATO, left: '18%', top: '4px', duration: '46s', delay: '-15s', opacity: 0.8 },
		{ art: CUMULUS_SM, left: '68%', top: '2px', duration: '35s', delay: '-6s', opacity: 0.85 },
	],
	inputs: [
		{ art: CUMULUS, left: '6%', top: '0px', duration: '45s', delay: '-10s', opacity: 0.8 },
		{ art: CUMULUS_SM, left: '72%', top: '4px', duration: '38s', delay: '-22s', opacity: 0.85 },
	],
	outputs: [
		{ art: STRATO_WIDE, left: '2%', top: '2px', duration: '52s', delay: '-14s', opacity: 0.8 },
		{ art: CUMULUS_SM, left: '70%', top: '4px', duration: '37s', delay: '-25s', opacity: 0.85 },
	],
	guardrails: [
		{ art: CUMULUS_MID, left: '6%', top: '0px', duration: '42s', delay: '-16s', opacity: 0.8 },
		{ art: STRATO_SM, left: '66%', top: '4px', duration: '40s', delay: '-28s', opacity: 0.85 },
	],
};

export function useArtSceneCloudCss(): string {
	return (Object.keys(sceneClouds) as SceneId[])
		.flatMap((sceneId) =>
			sceneClouds[sceneId].map((cloud, index) =>
				cloudPlacementRule(
					`[data-scene-cloud="${sceneId}-${String(index)}"]`,
					{ left: cloud.left, top: cloud.top, opacity: cloud.opacity ?? 0.8 },
					{ duration: cloud.duration, delay: cloud.delay },
				),
			),
		)
		.join('\n\n');
}
