import { Text } from '@astryxdesign/core/Text';
import { InlineCode } from './docs/body';
import './statement.css';

/** A statement on the landing page, the goals' and the packages' alike. A name in backticks is code. */
export function Statement({ children, className }: { children: string; className?: string }) {
	return (
		<Text className={className ? `home-stage-statement ${className}` : 'home-stage-statement'}>
			{children
				.split('`')
				.map((part, at) => (at % 2 ? <InlineCode key={part}>{part}</InlineCode> : part))}
		</Text>
	);
}
