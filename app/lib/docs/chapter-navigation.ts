import type { DocTreeNode } from './schema';

export function chapterNavigationTree(nodes: readonly DocTreeNode[]): DocTreeNode[] {
	return nodes.map((chapter) => ({
		...chapter,
		children: chapter.children.map((section) => ({ ...section, children: [] })),
	}));
}

export function chapterIsOpen(
	id: string,
	automatic: boolean,
	opened: ReadonlyMap<string, boolean>,
): boolean {
	return opened.get(id) ?? automatic;
}

export function setChapterCollapsed(
	opened: ReadonlyMap<string, boolean>,
	id: string,
	collapsed: boolean,
): Map<string, boolean> {
	return new Map(opened).set(id, !collapsed);
}
