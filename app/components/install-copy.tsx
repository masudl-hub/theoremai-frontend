import { useClipboard } from '@astryxdesign/core/hooks';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { INSTALL_COMMANDS, type PackageId } from '../lib/home-content';
import './install-copy.css';

const SCOPE = '@theoremjs';

/**
 * A package's install command to copy. With more than one package, the package's name in the
 * command is the switch: each press moves it to the next package, and the rest of the command follows.
 */
export function InstallCopy({
	size = 'sm',
	packages,
}: {
	size?: 'sm' | 'lg';
	/** The packages it switches between, in order; every package when left out. */
	packages?: readonly PackageId[];
}) {
	const { copy, isCopied } = useClipboard({ announce: 'Install command copied' });
	const [at, setAt] = useState(0);
	const switchRef = useRef<HTMLButtonElement>(null);
	const shown = packages
		? INSTALL_COMMANDS.filter((pkg) => packages.includes(pkg.id))
		: INSTALL_COMMANDS;
	const { id, command } = shown[at % shown.length];
	const next = shown[(at + 1) % shown.length];
	const name = `${SCOPE}/${id}`;
	const cut = command.indexOf(name) + SCOPE.length;
	const copyLabel = isCopied ? 'Copied' : 'Copy install command';
	return (
		<div className="install-copy" data-size={size}>
			<IconButton
				label={copyLabel}
				tooltip={copyLabel}
				variant="ghost"
				size={size}
				icon={isCopied ? <IconCheck aria-hidden /> : <IconCopy aria-hidden />}
				onClick={() => {
					void copy(command);
				}}
			/>
			<Text type={size === 'lg' ? 'large' : 'body'} className="install-copy-command">
				{command.slice(0, cut)}
				{shown.length === 1 ? (
					`/${id}`
				) : (
					<>
						<button
							ref={switchRef}
							type="button"
							className="install-copy-package"
							aria-label={`Package: ${id}. Switch to ${next.label}`}
							onClick={() => {
								setAt((index) => (index + 1) % shown.length);
							}}
						>
							<span key={id} className="install-copy-package-name">
								/{id}
							</span>
						</button>
						<Tooltip content={`Switch to ${next.label}`} anchorRef={switchRef} />
					</>
				)}
				{command.slice(cut + id.length + 1)}
			</Text>
		</div>
	);
}
