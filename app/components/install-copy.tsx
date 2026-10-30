import { useClipboard } from '@astryxdesign/core/hooks';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { INSTALL_COMMANDS } from '../lib/home-content';
import './install-copy.css';

const SCOPE = '@theoremjs';

/**
 * A package's install command to copy. The package's name in the command is the switch: each
 * press moves it to the next package, and the rest of the command follows.
 */
export function InstallCopy() {
	const { copy, isCopied } = useClipboard({ announce: 'Install command copied' });
	const [at, setAt] = useState(0);
	const switchRef = useRef<HTMLButtonElement>(null);
	const { id, command } = INSTALL_COMMANDS[at];
	const next = INSTALL_COMMANDS[(at + 1) % INSTALL_COMMANDS.length];
	const name = `${SCOPE}/${id}`;
	const cut = command.indexOf(name) + SCOPE.length;
	const copyLabel = isCopied ? 'Copied' : 'Copy install command';
	return (
		<div className="install-copy">
			<IconButton
				label={copyLabel}
				tooltip={copyLabel}
				variant="ghost"
				size="sm"
				icon={isCopied ? <IconCheck aria-hidden /> : <IconCopy aria-hidden />}
				onClick={() => {
					void copy(command);
				}}
			/>
			<Text type="body" className="install-copy-command">
				{command.slice(0, cut)}
				<button
					ref={switchRef}
					type="button"
					className="install-copy-package"
					aria-label={`Package: ${id}. Switch to ${next.label}`}
					onClick={() => {
						setAt((index) => (index + 1) % INSTALL_COMMANDS.length);
					}}
				>
					<span key={id} className="install-copy-package-name">
						/{id}
					</span>
				</button>
				<Tooltip content={`Switch to ${next.label}`} anchorRef={switchRef} />
				{command.slice(cut + id.length + 1)}
			</Text>
		</div>
	);
}
