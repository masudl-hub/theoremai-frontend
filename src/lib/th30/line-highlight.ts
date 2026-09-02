export function clearLineHighlights(activeSelectedLines: HTMLElement[]): void {
	for (const el of activeSelectedLines) {
		el.classList.remove('th30-line-selected');
	}
}

export type HighlightLineCallbacks = {
	onLinesSelected: (lines: HTMLElement[]) => void;
	clearExistingTimer: () => void;
	scheduleAutoClear: (clearFn: () => void) => void;
};

export function highlightLines(
	container: Element,
	start: number,
	end: number | undefined,
	activeSelectedLines: HTMLElement[],
	callbacks: HighlightLineCallbacks,
): void {
	clearLineHighlights(activeSelectedLines);
	const endLine = end ?? start;
	const selected: HTMLElement[] = [];
	for (let line = start; line <= endLine; line++) {
		const lineEl = container.querySelector<HTMLElement>(`[data-line="${String(line)}"]`);
		if (lineEl) {
			lineEl.classList.add('th30-line-selected');
			selected.push(lineEl);
		}
	}
	callbacks.onLinesSelected(selected);
	if (selected.length > 0) {
		selected[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	callbacks.clearExistingTimer();
	callbacks.scheduleAutoClear(() => {
		clearLineHighlights(selected);
	});
}
