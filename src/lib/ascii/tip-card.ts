/** Shared ASCII tooltip card — same box art as the package map. */

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

export function placeTip(e: MouseEvent, width = 400, pad = 12): { x: number; y: number } {
	let x = e.clientX + pad;
	if (x + width > window.innerWidth - pad) {
		x = Math.max(pad, e.clientX - width - pad);
	}
	return { x, y: e.clientY };
}

function renderListRows(
	items: readonly string[],
	listLabel: string,
	inner: number,
	labelW: number,
	columns = 2
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
		while (cols.length > 1 && cols[cols.length - 1]!.trim() === '') cols.pop();
		const line = cols.join(' '.repeat(colGap)).trimEnd();
		rows.push(i === 0 ? `${head}${line}` : `${headPad}${line}`);
	}
	return rows;
}

type SpecLine = { label: string; value: string };

export function renderAsciiCard(opts: {
	title: string;
	body: string;
	specs?: SpecLine[];
	list?: readonly string[];
	listLabel?: string;
	usage?: string;
	copyable?: boolean;
	footer?: string;
	inner?: number;
	labelW?: number;
}): string {
	const labelW = opts.labelW ?? 9;
	const listLabel = opts.listLabel ?? 'options';
	const headLen = `${listLabel.padEnd(labelW)} `.length;
	const maxItemLen = opts.list?.length ? Math.max(...opts.list.map((s) => s.length)) : 0;
	const inner =
		opts.inner ??
		(opts.list?.length ? Math.max(44, maxItemLen * 2 + headLen + 6) : 44);
	const rule = '─'.repeat(inner);
	const pad = (s: string) => `│ ${s.padEnd(inner - 1)}│`;
	const title = opts.title.slice(0, inner - 2);
	const body = wrapText(opts.body, inner - 2);

	const specLines = (opts.specs ?? []).flatMap(({ label, value }) => {
		const head = `${label.padEnd(labelW)} `;
		const wrapped = wrapText(value, inner - 2 - head.length);
		return wrapped.map((line, i) => (i === 0 ? `${head}${line}` : `${' '.repeat(head.length)}${line}`));
	});

	const listLines = opts.list ? renderListRows(opts.list, listLabel, inner, labelW) : [];

	const usageLines = opts.usage
		? wrapText(opts.usage, inner - 4).map((line) =>
				pad(`${opts.copyable ? '> ' : '  '}${line}`.padEnd(inner - 2))
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

	rows.push(`└${rule}┘`);
	return rows.join('\n');
}
