import { Card } from '@astryxdesign/core/Card';
import { createComposerPendingMessage } from '@theoremjs/agents/interface';
import { StudioRunner } from '@theoremjs/studio/ui/studio-runner.tsx';
import { useEffect, useState } from 'react';
import { conciergePayload } from '../../lib/home-agent';
import { INTERFACE_COMPOSER } from '../../lib/home-agent-chat';
import { useOpening } from '../../lib/home-opening';
import { stillRenditions } from '../../lib/stills';

/** The messages the composer has set aside: one queued, one stashed. */
function setAside() {
	const { queued, stashed } = INTERFACE_COMPOSER;
	return [
		createComposerPendingMessage({ kind: 'queue', draft: { text: queued } }),
		createComposerPendingMessage({ kind: 'stash', draft: { text: stashed } }),
	];
}

/** The composer's photos, read from their stills; undefined until they are, empty if they cannot be. */
function usePhotos() {
	const [photos, setPhotos] = useState<File[]>();
	useEffect(() => {
		const controller = new AbortController();
		void Promise.all(
			INTERFACE_COMPOSER.photos.map(async ({ name, still }) => {
				const response = await fetch(stillRenditions(still).tile, { signal: controller.signal });
				return new File([await response.blob()], name, { type: 'image/webp' });
			}),
		)
			.catch(() => [])
			.then((files) => {
				if (!controller.signal.aborted) setPhotos(files);
			});
		return () => {
			controller.abort();
		};
	}, []);
	return photos;
}

/**
 * The headless interface tile's chat: the full concierge as the studio runs it, opened on a busy
 * turn. It is the goals' runner and opening, shown and not used.
 */
export default function InterfaceChat() {
	const [payload] = useState(conciergePayload);
	const [pending] = useState(setAside);
	const photos = usePhotos();
	const opening = useOpening(payload, 0, 'interface');
	if (!payload || !opening?.started || !photos) return null;
	return (
		<Card variant="glass" padding={0} elevation="med" className="packages-chat" inert aria-hidden>
			<StudioRunner
				payload={payload}
				mode="demo"
				runtime={null}
				conversation={opening.started.conversation}
				conversationView={opening.started.view}
				initialText={INTERFACE_COMPOSER.text}
				initialFiles={photos}
				initialPending={pending}
			/>
		</Card>
	);
}
