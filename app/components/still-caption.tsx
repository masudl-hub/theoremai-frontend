import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import type { ReactNode } from 'react';
import './still-caption.css';

/** The title under a still, the same on the overview, the docs landing and the contribute screen. */
export function StillTitle({ children, maxLines }: { children: ReactNode; maxLines?: number }) {
	return (
		<Heading className="still-title" level={3} maxLines={maxLines}>
			{children}
		</Heading>
	);
}

/** The description under a still. */
export function StillText({ children, maxLines }: { children: ReactNode; maxLines?: number }) {
	return (
		<Text color="secondary" maxLines={maxLines}>
			{children}
		</Text>
	);
}
