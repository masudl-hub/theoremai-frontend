import type { readDocSection, searchDocumentation } from '$lib/docs/unified-docs';

export type Th30ToolDeps = {
	showActionLabel: (text: string) => void;
	flashNavFrame: () => void;
	highlightLines: (container: Element, start: number, end?: number) => void;
	readDocSection: typeof readDocSection;
	searchDocumentation: typeof searchDocumentation;
};

function formatLineRange(lineStart: number, lineEnd: number | undefined): string {
	if (lineEnd !== undefined && lineEnd !== lineStart) {
		return `L${String(lineStart)}-L${String(lineEnd)}`;
	}
	return `L${String(lineStart)}`;
}

export function runTh30ToolCall(
	name: string,
	args: Record<string, unknown>,
	deps: Th30ToolDeps,
): Record<string, unknown> {
	const {
		showActionLabel,
		flashNavFrame,
		highlightLines,
		readDocSection: readSection,
		searchDocumentation: searchDocs,
	} = deps;

	if (name === 'navigate') {
		const targetPath = (args.path as string) || '/';
		const subTarget = args.subTarget as string | undefined;

		showActionLabel(`Navigating to ${targetPath}${subTarget ? ` · ${subTarget}` : ''}`);
		flashNavFrame();

		if (targetPath.startsWith('/#') || targetPath.startsWith('#')) {
			const hash = targetPath.includes('#')
				? targetPath.slice(targetPath.indexOf('#'))
				: targetPath;
			const el = document.querySelector(hash);
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'start' });

				if (subTarget) {
					const subEl = el.querySelector(
						`[data-node="${subTarget}"], [data-pillar="${subTarget}"], [data-facet="${subTarget}"], #${subTarget}`,
					);
					if (subEl) {
						subEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
					}
				}
			} else {
				window.location.href = targetPath;
			}
		} else {
			window.location.href = targetPath;
		}
		return { success: true, navigatedTo: targetPath, subTarget };
	}

	if (name === 'highlight' || name === 'highlightSection') {
		const target = ((args.target ?? args.selector) as string) || '#use';
		const lineStart = typeof args.lineStart === 'number' ? args.lineStart : undefined;
		const lineEnd = typeof args.lineEnd === 'number' ? args.lineEnd : undefined;
		const subTarget = args.subTarget as string | undefined;
		const label = args.label as string | undefined;

		const desc =
			label ??
			(lineStart !== undefined
				? `Lines ${formatLineRange(lineStart, lineEnd)} in ${target}`
				: `Target ${target}`);
		showActionLabel(`Selecting: ${desc}`);

		const container = document.querySelector(target);
		if (container) {
			if (lineStart !== undefined) {
				highlightLines(container, lineStart, lineEnd);
			} else if (subTarget) {
				const subEl = container.querySelector(
					`[data-node="${subTarget}"], [data-pillar="${subTarget}"], [data-facet="${subTarget}"], #${subTarget}`,
				);
				if (subEl) {
					subEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
				} else {
					container.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			} else {
				container.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
			return {
				success: true,
				highlighted: target,
				lineRange: lineStart !== undefined ? formatLineRange(lineStart, lineEnd) : undefined,
				subTarget,
				label,
			};
		}
		return { success: false, error: `Element not found for selector: ${target}` };
	}

	if (name === 'read') {
		const target = (args.target as string) || '#overview';
		const detail = args.detail === 'summary' || args.detail === 'code_only' ? args.detail : 'full';
		showActionLabel(`Reading section: ${target}`);
		const doc = readSection(target, detail);
		return {
			target: doc.target,
			title: doc.title,
			content: doc.content,
			lineCount: doc.lineCount,
		};
	}

	if (name === 'searchDocs') {
		const query = (args.query as string) || '';
		const source =
			args.source === 'local' ||
			args.source === 'github' ||
			args.source === 'jsr' ||
			args.source === 'npm'
				? args.source
				: 'all';
		const limit = typeof args.limit === 'number' ? args.limit : 5;
		showActionLabel(`Searching docs for "${query}"`);
		const searchRes = searchDocs(query, source, limit);
		return {
			query: searchRes.query,
			results: searchRes.results,
			totalMatches: searchRes.totalMatches,
		};
	}

	return { success: true };
}
