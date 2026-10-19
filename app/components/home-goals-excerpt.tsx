import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { useLayoutEffect, useRef } from 'react';
import { type Excerpt, excerptLines } from '../lib/home-excerpt';
import { useGoalFocus, useGoalMarked } from './home-goals-beat';

/** The part of the agent's file a goal is about, read-only, with the lines a change wrote marked. */
export function GoalExcerpt({ excerpt }: { excerpt: Excerpt }) {
	const marked = useGoalMarked();
	const focus = useGoalFocus();
	const lines = excerptLines(excerpt, marked);
	const pane = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const root = pane.current;
		if (!root || !marked?.length) return;
		const preferred = focus === undefined ? [] : excerptLines(excerpt, { from: focus, to: focus });
		const relevant = preferred.length
			? preferred
			: marked.map((range) => excerptLines(excerpt, range)).sort((a, b) => b.length - a.length)[0];
		if (!relevant.length) return;
		const scroll = () => {
			const target = root.querySelector<HTMLElement>(`[data-line="${String(relevant[0])}"]`);
			if (!target) return false;
			root.scrollTop +=
				target.getBoundingClientRect().top -
				root.getBoundingClientRect().top -
				root.clientHeight / 3;
			return true;
		};
		if (scroll()) return;
		const observer = new MutationObserver(() => {
			if (scroll()) observer.disconnect();
		});
		observer.observe(root, { childList: true, subtree: true });
		return () => {
			observer.disconnect();
		};
	}, [excerpt, marked, focus]);
	return (
		<div ref={pane} className="home-goal-excerpt">
			{/* The block marks its own lines in a gray. These take the editor's tint for a change. */}
			{lines.length ? (
				<style>
					{`${lines.map((line) => `.home-goal-excerpt [data-line="${String(line)}"]`).join(',')} { background: var(--home-goal-changed); }`}
				</style>
			) : null}
			<CodeBlock
				language="typescript"
				code={excerpt.code}
				container="section"
				hasLanguageLabel={false}
				hasCopyButton={false}
				hasLineNumbers
				highlightMode="spans"
				isWrapped
				width="100%"
			/>
		</div>
	);
}
