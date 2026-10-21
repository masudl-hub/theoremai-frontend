import { Card } from '@astryxdesign/core/Card';
import {
	createExampleDraft,
	createLiveExampleDraft,
	modelBindingNodeId,
	workspaceFromDraft,
} from '@theoremjs/studio';
import { StudioEditorPreview } from '@theoremjs/studio/ui/studio-screen.tsx';
import { useState } from 'react';
import { ON_SITE } from '../../lib/studio-supplies';

/**
 * The live concierge, given a second model that only writes text, and open on it: the studio says
 * which protocol a live agent runs on.
 */
function liveWithTextModel() {
	const live = createLiveExampleDraft();
	const text = createExampleDraft().modelBindings.find((binding) => binding.modelId === 'smart');
	if (!text) return workspaceFromDraft(live);
	const added = { ...text, key: 'model-smart' };
	return workspaceFromDraft(
		{
			...live,
			modelBindings: [...live.modelBindings, added],
			models: { ...live.models, defaultModel: live.modelBindings[0]?.modelId ?? '' },
		},
		modelBindingNodeId(added.key),
	);
}

/** The studio tile's editor: the studio's own toolbar and inspector, shown and not used. */
export default function StudioEditor() {
	const [workspace] = useState(liveWithTextModel);
	return (
		<Card variant="glass" padding={0} elevation="med" className="packages-editor" inert aria-hidden>
			<StudioEditorPreview workspace={workspace} on={ON_SITE} />
		</Card>
	);
}
