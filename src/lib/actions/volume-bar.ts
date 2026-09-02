type VolumeBarParams = {
	level: number;
	index: number;
};

function barHeightPx({ level, index }: VolumeBarParams): number {
	return Math.max(3, (level * (index + 1) * 4) % 14);
}

/** Sets bar height from live volume level without inline styles in markup. */
export function volumeBar(node: HTMLDivElement, params: VolumeBarParams) {
	const apply = (next: VolumeBarParams) => {
		node.style.height = `${String(barHeightPx(next))}px`;
	};

	apply(params);

	return {
		update: apply,
	};
}
