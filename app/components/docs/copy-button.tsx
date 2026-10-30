import { useClipboard } from '@astryxdesign/core/hooks';
import { IconButton } from '@astryxdesign/core/IconButton';
import { IconCheck, IconCopy } from '@tabler/icons-react';

export function CopyIconButton({
	label,
	copiedLabel,
	text,
	className,
}: {
	label: string;
	copiedLabel: string;
	text: string;
	className?: string;
}) {
	const { copy, isCopied } = useClipboard({ announce: copiedLabel });
	return (
		<IconButton
			label={isCopied ? copiedLabel : label}
			tooltip={isCopied ? copiedLabel : label}
			variant="ghost"
			size="sm"
			icon={isCopied ? <IconCheck /> : <IconCopy />}
			className={className}
			onClick={() => {
				void copy(text);
			}}
		/>
	);
}
