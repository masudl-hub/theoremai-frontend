import { Button, type ButtonProps } from '@astryxdesign/core/Button';
import { useClipboard } from '@astryxdesign/core/hooks';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { starterPrompt } from '../lib/docs/starter-prompt';

/** Copies a prompt for the reader's coding agent: it reads the docs, asks, plans, then builds. */
export function AgentPromptButton({ size = 'md' }: { size?: ButtonProps['size'] }) {
	const { copy, isCopied } = useClipboard({ announce: 'Prompt copied' });
	return (
		<Button
			variant="primary"
			size={size}
			label={isCopied ? 'Copied' : 'Agent prompt'}
			icon={isCopied ? <IconCheck aria-hidden /> : <IconCopy aria-hidden />}
			onClick={() => {
				void copy(starterPrompt(window.location.origin));
			}}
		/>
	);
}
