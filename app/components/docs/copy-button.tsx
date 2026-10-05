import { useClipboard } from '@astryxdesign/core/hooks';
import { IconButton } from '@astryxdesign/core/IconButton';
import { IconCheck, IconCopy } from '@tabler/icons-react';

export function CopyIconButton({
	label,
	copiedLabel,
	text,
}: {
	label: string;
	copiedLabel: string;
	text: string;
}) {
	const { copy, isCopied } = useClipboard({ announce: copiedLabel });
	return (
		<IconButton
			label={isCopied ? copiedLabel : label}
			tooltip={isCopied ? copiedLabel : label}
			variant="ghost"
			size="sm"
			icon={isCopied ? <IconCheck /> : <IconCopy />}
			onClick={() => {
				void copy(text);
			}}
		/>
	);
}
