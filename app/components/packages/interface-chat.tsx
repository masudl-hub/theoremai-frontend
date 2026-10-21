import { Card } from '@astryxdesign/core/Card';
import { createComposerPendingMessage } from '@theoremjs/agents/interface';
import { StudioRunner } from '@theoremjs/studio/ui/studio-runner.tsx';
import { useState } from 'react';
import { conciergePayload } from '../../lib/home-agent';
import { INTERFACE_COMPOSER } from '../../lib/home-agent-chat';
import { useOpening } from '../../lib/home-opening';

/** The composer's staged file and its queued and stashed messages. */
function stagedComposer() {
	const { files, queued, stashed } = INTERFACE_COMPOSER;
	return {
		// why: The composer shows the file's name and size; its bytes are blank.
		files: files.map(({ name, type, bytes }) => new File([new Uint8Array(bytes)], name, { type })),
		pending: [
			createComposerPendingMessage({ kind: 'queue', draft: { text: queued } }),
			createComposerPendingMessage({ kind: 'stash', draft: { text: stashed } }),
		],
	};
}

/**
 * The headless interface tile's chat: the full concierge as the studio runs it, opened on a busy
 * turn. It is the goals' runner and opening, shown and not used.
 */
export default function InterfaceChat() {
	const [payload] = useState(conciergePayload);
	const [staged] = useState(stagedComposer);
	const opening = useOpening(payload, 0, 'interface');
	if (!payload || !opening?.started) return null;
	return (
		<Card variant="glass" padding={0} elevation="med" className="packages-chat" inert aria-hidden>
			<StudioRunner
				payload={payload}
				mode="demo"
				runtime={null}
				conversation={opening.started.conversation}
				conversationView={opening.started.view}
				initialText={INTERFACE_COMPOSER.text}
				initialFiles={staged.files}
				initialPending={staged.pending}
			/>
		</Card>
	);
}
