import { Button } from '@astryxdesign/core/Button';
import { useClipboard } from '@astryxdesign/core/hooks';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useState } from 'react';
import { INSTALL_COMMANDS } from '../lib/home-content';
import './install-copy.css';

/** A package's install command to copy, and the switch between packages. */
export function InstallCopy({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
	const { copy, isCopied } = useClipboard({ announce: 'Install command copied' });
	const [chosen, setChosen] = useState<string>(INSTALL_COMMANDS[0].id);
	const { command } = INSTALL_COMMANDS.find(({ id }) => id === chosen) ?? INSTALL_COMMANDS[0];
	return (
		<div className="install-copy" data-size={size}>
			<Button
				className="install-copy-command"
				variant="ghost"
				size={size}
				icon={isCopied ? <IconCheck aria-hidden /> : <IconCopy aria-hidden />}
				label={isCopied ? 'Copied' : command}
				onClick={() => {
					void copy(command);
				}}
			/>
			<SegmentedControl label="Package" size={size} value={chosen} onChange={setChosen}>
				{INSTALL_COMMANDS.map(({ id, label }) => (
					<SegmentedControlItem key={id} value={id} label={label} />
				))}
			</SegmentedControl>
		</div>
	);
}
