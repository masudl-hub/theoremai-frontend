import type { CloudSpec } from './clouds.ts';

export type CloudMotion = {
	duration: string;
	delay: string;
};

export function indexedCloudMotion(index: number): CloudMotion {
	const durationSec = 36 + index * 6;
	const delaySec = -index * 7;
	return {
		duration: `${String(durationSec)}s`,
		delay: `${String(delaySec)}s`,
	};
}

export function cloudPlacementRule(
	selector: string,
	cloud: Pick<CloudSpec, 'left' | 'top' | 'bottom' | 'opacity'>,
	motion?: CloudMotion,
): string {
	const lines = [`${selector} {`, `\tposition: absolute;`, `\tleft: ${cloud.left};`];

	if (cloud.bottom != null) {
		lines.push(`\tbottom: ${cloud.bottom};`);
	} else {
		lines.push(`\ttop: ${cloud.top ?? '0%'};`);
	}

	lines.push(`\topacity: ${String(cloud.opacity)};`);

	if (motion) {
		lines.push(`\t--cloud-duration: ${motion.duration};`);
		lines.push(`\tanimation-delay: ${motion.delay};`);
	}

	lines.push('}');
	return lines.join('\n');
}

export function cloudParadeCss(clouds: CloudSpec[], attr = 'data-cloud-id'): string {
	return clouds
		.map((cloud, index) =>
			cloudPlacementRule(`[${attr}="${cloud.id}"]`, cloud, indexedCloudMotion(index)),
		)
		.join('\n\n');
}
