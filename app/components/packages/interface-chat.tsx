import { Card } from '@astryxdesign/core/Card';
import { createComposerPendingMessage } from '@theoremjs/agents/interface';
import { StudioRunner } from '@theoremjs/studio/ui/studio-runner.tsx';
import { useEffect, useState } from 'react';
import { conciergePayload } from '../../lib/home-agent';
import { INTERFACE_COMPOSER } from '../../lib/home-agent-chat';
import { useOpening } from '../../lib/home-opening';

/** The messages the composer has set aside: one queued, one stashed. */
function setAside() {
	const { queued, stashed } = INTERFACE_COMPOSER;
	return [
		createComposerPendingMessage({ kind: 'queue', draft: { text: queued } }),
		createComposerPendingMessage({ kind: 'stash', draft: { text: stashed } }),
	];
}

type Staged = { readonly name: string; readonly src: string; readonly type: string };

/** The composer's photos and voice note, read as files; undefined until they are, empty if they cannot be. */
function useStaged() {
	const [staged, setStaged] = useState<{ photos: File[]; voice: File[] }>();
	useEffect(() => {
		const controller = new AbortController();
		const read = async ({ name, src, type }: Staged) => {
			const response = await fetch(src, { signal: controller.signal });
			return new File([await response.blob()], name, { type });
		};
		void Promise.all([
			Promise.all(INTERFACE_COMPOSER.photos.map(read)),
			read(INTERFACE_COMPOSER.voice),
		])
			.then(([photos, voice]) => ({ photos, voice: [voice] }))
			.catch(() => ({ photos: [], voice: [] }))
			.then((files) => {
				if (!controller.signal.aborted) setStaged(files);
			});
		return () => {
			controller.abort();
		};
	}, []);
	return staged;
}

/**
 * The headless interface tile's chat: the full concierge as the studio runs it, opened on a busy
 * turn. It is the goals' runner and opening, shown and not used.
 */
export default function InterfaceChat() {
	const [payload] = useState(conciergePayload);
	const [pending] = useState(setAside);
	const staged = useStaged();
	const opening = useOpening(payload, 0, 'interface');
	if (!payload || !opening?.started || !staged) return null;
	return (
		<Card variant="glass" padding={0} elevation="med" className="packages-chat" inert aria-hidden>
			<StudioRunner
				payload={payload}
				runtime={null}
				conversation={opening.started.conversation}
				conversationView={opening.started.view}
				initialText={INTERFACE_COMPOSER.text}
				initialFiles={staged.photos}
				initialVoice={staged.voice}
				initialPending={pending}
			/>
		</Card>
	);
}
