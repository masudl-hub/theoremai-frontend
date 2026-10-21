import { Text } from '@astryxdesign/core/Text';
import type { ReactNode } from 'react';
import { InlineCode } from './docs/body';
import './statement.css';

/**
 * A statement on the landing page, the goals' and the packages' alike. A name in backticks is code,
 * unless `name` draws it.
 */
export function Statement({
	children,
	className,
	name,
}: {
	children: string;
	className?: string;
	name?: (text: string) => ReactNode;
}) {
	return (
		<Text className={className ? `home-stage-statement ${className}` : 'home-stage-statement'}>
			{children
				.split('`')
				.map((part, at) =>
					at % 2 ? (name?.(part) ?? <InlineCode key={part}>{part}</InlineCode>) : part,
				)}
		</Text>
	);
}
