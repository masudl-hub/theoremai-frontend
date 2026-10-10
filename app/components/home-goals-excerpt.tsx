import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { type Excerpt, excerptLines } from '../lib/home-excerpt';
import { useGoalMarked } from './home-goals-beat';

/** The part of the agent's file a goal is about, read-only, with the lines a change wrote marked. */
export function GoalExcerpt({ excerpt }: { excerpt: Excerpt }) {
	const marked = useGoalMarked();
	const lines = excerptLines(excerpt, marked);
	return (
		<div className="home-goal-excerpt">
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
