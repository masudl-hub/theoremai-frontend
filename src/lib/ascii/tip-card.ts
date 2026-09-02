/** Shared ASCII tooltip card — same box art as the package map. */

function viewportSize(): { w: number; h: number } {
	return {
		w: typeof window !== 'undefined' ? window.innerWidth : 1024,
		h: typeof window !== 'undefined' ? window.innerHeight : 768,
	};
}

function pickTipY(
	yAbove: number,
	yBelow: number,
	anchorY: number,
	tipHeight: number,
	pad: number,
	vpH: number,
): number {
	let y: number;
	if (yAbove >= pad) {
		y = yAbove;
	} else if (yBelow + tipHeight <= vpH - pad) {
		y = yBelow;
	} else if (anchorY > vpH / 2) {
		y = Math.max(pad, yAbove);
	} else {
		y = Math.min(vpH - tipHeight - pad, yBelow);
	}
	return Math.max(pad, Math.min(vpH - tipHeight - pad, y));
}

export function wrapText(text: string, width: number): string[] {
	const lines: string[] = [];
	for (const raw of text.split('\n')) {
		const words = raw.split(/\s+/).filter(Boolean);
		if (!words.length) {
			lines.push('');
			continue;
		}
		let line = '';
		for (const word of words) {
			const next = line ? `${line} ${word}` : word;
			if (next.length <= width) {
				line = next;
				continue;
			}
			if (line) lines.push(line);
			line = word.length > width ? word.slice(0, width) : word;
		}
		if (line) lines.push(line);
	}
	return lines;
}

export function computeTipPosition(
	clientX: number,
	clientY: number,
	tipWidth: number,
	tipHeight: number,
	pad = 12,
): { x: number; y: number } {
	const { w: vpW, h: vpH } = viewportSize();

	// Horizontal: default to right of cursor; if overflowing right, place to left or clamp
	let x = clientX + 12;
	if (x + tipWidth > vpW - pad) {
		const leftX = clientX - tipWidth - 12;
		if (leftX >= pad) {
			x = leftX;
		} else {
			x = Math.max(pad, vpW - tipWidth - pad);
		}
	}
	x = Math.max(pad, Math.min(vpW - tipWidth - pad, x));

	// Vertical: default above cursor; if overflowing top, place below or clamp
	const yAbove = clientY - tipHeight - 10;
	const yBelow = clientY + 18;
	const y = pickTipY(yAbove, yBelow, clientY, tipHeight, pad, vpH);

	return { x, y };
}

export function computeTipPositionForRect(
	targetRect: DOMRect,
	tipWidth: number,
	tipHeight: number,
	pad = 12,
): { x: number; y: number } {
	const { w: vpW, h: vpH } = viewportSize();

	let x = targetRect.left;
	if (x + tipWidth > vpW - pad) {
		x = Math.max(pad, vpW - tipWidth - pad);
	}
	x = Math.max(pad, x);

	const yAbove = targetRect.top - tipHeight - 8;
	const yBelow = targetRect.bottom + 8;
	const y = pickTipY(yAbove, yBelow, targetRect.top, tipHeight, pad, vpH);

	return { x, y };
}

function renderListRows(
	items: readonly string[],
	listLabel: string,
	inner: number,
	labelW: number,
	columns = 2,
): string[] {
	if (!items.length) return [];

	const head = `${listLabel.padEnd(labelW)} `;
	const headPad = ' '.repeat(head.length);
	const contentW = inner - 2 - head.length;
	const colGap = 2;
	const colW = Math.max(8, Math.floor((contentW - colGap * (columns - 1)) / columns));

	const rows: string[] = [];
	for (let i = 0; i < items.length; i += columns) {
		const cols: string[] = [];
		for (let c = 0; c < columns; c++) {
			const item = items[i + c];
			cols.push(item ? item.slice(0, colW).padEnd(colW) : ''.padEnd(colW));
		}
		while (cols.length > 1 && cols[cols.length - 1]?.trim() === '') cols.pop();
		const line = cols.join(' '.repeat(colGap)).trimEnd();
		rows.push(i === 0 ? `${head}${line}` : `${headPad}${line}`);
	}
	return rows;
}

export type SpecLine = { label: string; value: string };

export type AsciiCardAction = {
	id: string;
	/** Plain label; rendered as `[ ${label} ]`. */
	label: string;
};

/** Embedded markers for interactive action labels inside an ascii card. */
export const ASCII_CARD_ACTION_START = '\u001e';
export const ASCII_CARD_ACTION_END = '\u001f';

export type AsciiCardSegment =
	| { type: 'text'; value: string }
	| { type: 'action'; id: string; label: string };

function actionToken(id: string, label: string): string {
	return `${ASCII_CARD_ACTION_START}${id}\u001d${label}${ASCII_CARD_ACTION_END}`;
}

function actionVisible(label: string): string {
	return `[ ${label} ]`;
}

/** Split card art into text + action segments for hydration into live controls. */
export function parseAsciiCardSegments(art: string): AsciiCardSegment[] {
	const segments: AsciiCardSegment[] = [];
	const re = new RegExp(
		`${ASCII_CARD_ACTION_START}([^${ASCII_CARD_ACTION_END}\\u001d]+)\\u001d([^${ASCII_CARD_ACTION_END}]+)${ASCII_CARD_ACTION_END}`,
		'g',
	);
	let last = 0;
	for (const match of art.matchAll(re)) {
		const index = match.index;
		if (index > last) {
			segments.push({ type: 'text', value: art.slice(last, index) });
		}
		segments.push({ type: 'action', id: match[1], label: match[2] });
		last = index + match[0].length;
	}
	if (last < art.length) {
		segments.push({ type: 'text', value: art.slice(last) });
	}
	return segments;
}

export function renderAsciiCard(opts: {
	title: string;
	body: string;
	specs?: SpecLine[];
	list?: readonly string[];
	listLabel?: string;
	usage?: string;
	copyable?: boolean;
	footer?: string;
	/** Right-aligned bracket actions inside the card (permitted interactive variant). */
	actions?: readonly AsciiCardAction[];
	inner?: number;
	labelW?: number;
}): string {
	const labelW = opts.labelW ?? 9;
	const listLabel = opts.listLabel ?? 'options';
	const headLen = `${listLabel.padEnd(labelW)} `.length;
	const maxItemLen = opts.list?.length ? Math.max(...opts.list.map((s) => s.length)) : 0;
	const inner = opts.inner ?? (opts.list?.length ? Math.max(44, maxItemLen * 2 + headLen + 6) : 44);
	const rule = '─'.repeat(inner);
	const pad = (s: string) => `│ ${s.padEnd(inner - 1)}│`;
	const title = opts.title.slice(0, inner - 2);
	const body = wrapText(opts.body, inner - 2);

	const specLines = (opts.specs ?? []).flatMap(({ label, value }) => {
		const head = `${label.padEnd(labelW)} `;
		const wrapped = wrapText(value, inner - 2 - head.length);
		return wrapped.map((line, i) =>
			i === 0 ? `${head}${line}` : `${' '.repeat(head.length)}${line}`,
		);
	});

	const listLines = opts.list ? renderListRows(opts.list, listLabel, inner, labelW) : [];

	const usageLines = opts.usage
		? wrapText(opts.usage, inner - 4).map((line) =>
				pad(`${opts.copyable ? '> ' : '  '}${line}`.padEnd(inner - 2)),
			)
		: [];

	const footerLines = opts.footer ? wrapText(opts.footer, inner - 2).map((line) => pad(line)) : [];

	const rows: string[] = [`┌${rule}┐`, pad(title), `├${rule}┤`, ...body.map(pad)];

	if (specLines.length) {
		rows.push(pad(''), ...specLines.map(pad));
	}
	if (listLines.length) {
		rows.push(pad(''), ...listLines.map(pad));
	}
	if (usageLines.length) {
		rows.push(`├${rule}┤`, ...usageLines, pad(''));
	}
	if (footerLines.length) {
		rows.push(`├${rule}┤`, ...footerLines);
	}

	if (opts.actions?.length) {
		const visible = opts.actions.map((a) => actionVisible(a.label)).join(' ');
		const tokens = opts.actions.map((a) => actionToken(a.id, a.label)).join(' ');
		const lead = Math.max(0, inner - 2 - visible.length);
		const trail = Math.max(0, inner - 1 - lead - visible.length);
		rows.push(pad(''), `│ ${' '.repeat(lead)}${tokens}${' '.repeat(trail)}│`);
	}

	rows.push(`└${rule}┘`);
	return rows.join('\n');
}
