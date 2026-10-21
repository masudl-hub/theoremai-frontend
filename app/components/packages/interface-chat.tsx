import { Card } from '@astryxdesign/core/Card';
import { StudioRunner } from '@theoremjs/studio/ui/studio-runner.tsx';
import { useState } from 'react';
import { conciergePayload } from '../../lib/home-agent';
import { INTERFACE_DRAFT } from '../../lib/home-agent-chat';
import { useOpening } from '../../lib/home-opening';

/**
 * The headless interface tile's chat: the full concierge as the studio runs it, opened on a busy
 * turn. It is the goals' runner and opening, shown and not used.
 */
export default function InterfaceChat() {
	const [payload] = useState(conciergePayload);
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
				initialText={INTERFACE_DRAFT}
			/>
		</Card>
	);
}
