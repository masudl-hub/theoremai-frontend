/**
 * Client-side Th30 navigate / highlight. Uses getElementById, never
 * querySelector('#live.vad').
 */

export function scrollToBlock(blockId: string): HTMLElement | null {
	const el = document.getElementById(blockId);
	if (!el) return null;
	el.scrollIntoView({ block: 'center', behavior: 'smooth' });
	return el;
}

export function highlightBlock(blockId: string, label?: string): boolean {
	const el = scrollToBlock(blockId);
	if (!el) return false;
	document.querySelectorAll('[data-th30-highlight]').forEach((node) => {
		node.removeAttribute('data-th30-highlight');
		node.removeAttribute('data-th30-label');
	});
	el.setAttribute('data-th30-highlight', '');
	if (label) el.setAttribute('data-th30-label', label);
	window.setTimeout(() => {
		el.removeAttribute('data-th30-highlight');
		el.removeAttribute('data-th30-label');
	}, 8000);
	return true;
}

export function docsPath(slug: string, blockId?: string): string {
	return blockId ? `/docs/${slug}#${blockId}` : `/docs/${slug}`;
}
