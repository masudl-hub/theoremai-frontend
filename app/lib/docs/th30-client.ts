/**
 * Client-side thirty navigate / highlight. An id is found with getElementById,
 * never querySelector('#live.vad'), because a dot in an id is not a class.
 */

const HIGHLIGHT_MS = 8000;

function flatText(el: Element): string {
	return (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();
}

function shown(el: HTMLElement): boolean {
	const box = el.getBoundingClientRect();
	return box.width > 0 || box.height > 0;
}

/** The deepest element whose visible text or label is exactly `needle`. */
function deepestExact(root: Element, needle: string): HTMLElement | null {
	for (const child of root.children) {
		const found = deepestExact(child, needle);
		if (found) return found;
	}
	if (!(root instanceof HTMLElement) || !shown(root)) return null;
	return flatText(root).toLowerCase() === needle ? root : null;
}

function firstPartial(needle: string): HTMLElement | null {
	const nodes = document.querySelectorAll(
		'h1,h2,h3,h4,h5,h6,a,button,label,summary,[role="button"],[role="link"],[role="heading"],[aria-label]',
	);
	for (const node of nodes) {
		if (!(node instanceof HTMLElement) || !shown(node)) continue;
		if (flatText(node).toLowerCase().includes(needle)) return node;
	}
	return null;
}

/** An id, a docs block, or the visible words of something on the page. */
export function findHighlightTarget(target: string): HTMLElement | null {
	const query = target.trim();
	if (!query) return null;
	const byId = document.getElementById(query);
	if (byId) return byId;
	const block = document.querySelector(`[data-docs-block="${CSS.escape(query)}"]`);
	if (block instanceof HTMLElement) return block;
	const needle = query.toLowerCase();
	return deepestExact(document.body, needle) ?? (needle.length >= 3 ? firstPartial(needle) : null);
}

function clearHighlight(el: HTMLElement): void {
	el.removeAttribute('data-th30-highlight');
	el.removeAttribute('data-th30-label');
	if (el.hasAttribute('data-th30-tabindex')) {
		el.removeAttribute('tabindex');
		el.removeAttribute('data-th30-tabindex');
	}
}

/** Scroll the match into view, focus it, and mark it. Returns whether anything matched. */
export function highlightBlock(target: string, label?: string): boolean {
	const el = findHighlightTarget(target);
	if (!el) return false;
	document.querySelectorAll('[data-th30-highlight]').forEach((node) => {
		if (node instanceof HTMLElement) clearHighlight(node);
	});
	if (!el.hasAttribute('tabindex') && el.tabIndex < 0) {
		el.setAttribute('tabindex', '-1');
		el.setAttribute('data-th30-tabindex', '');
	}
	el.setAttribute('data-th30-highlight', '');
	if (label) el.setAttribute('data-th30-label', label);
	el.focus({ preventScroll: true });
	el.scrollIntoView({ block: 'center', behavior: 'smooth' });
	window.setTimeout(() => {
		clearHighlight(el);
	}, HIGHLIGHT_MS);
	return true;
}

/** After a navigation, mark `id` once that page is showing it. */
export function highlightWhenPresent(id: string, pathname: string): void {
	const started = performance.now();
	const tick = () => {
		const waiting = performance.now() - started < 2000;
		if (window.location.pathname !== pathname) {
			if (waiting) requestAnimationFrame(tick);
			return;
		}
		if (highlightBlock(id)) return;
		if (waiting) requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}
