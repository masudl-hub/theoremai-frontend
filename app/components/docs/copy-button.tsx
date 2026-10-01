import { IconButton } from '@astryxdesign/core/IconButton';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useState } from 'react';

export function CopyIconButton({
	label,
	copiedLabel,
	text,
}: {
	label: string;
	copiedLabel: string;
	text: string;
}) {
	const [copied, setCopied] = useState(false);
	return (
		<IconButton
			label={copied ? copiedLabel : label}
			tooltip={copied ? copiedLabel : label}
			variant="ghost"
			size="sm"
			icon={copied ? <IconCheck /> : <IconCopy />}
			onClick={() => {
				void navigator.clipboard
					.writeText(text)
					.then(() => {
						setCopied(true);
						window.setTimeout(() => {
							setCopied(false);
						}, 2000);
					})
					.catch(() => undefined);
			}}
		/>
	);
}
