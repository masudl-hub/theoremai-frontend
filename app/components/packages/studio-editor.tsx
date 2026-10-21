import { Card } from '@astryxdesign/core/Card';
import { createExampleDraft, modelBindingNodeId, workspaceFromDraft } from '@theoremjs/studio';
import { StudioEditorPreview } from '@theoremjs/studio/ui/studio-screen.tsx';
import { useState } from 'react';
import { ON_SITE } from '../../lib/studio-supplies';

/**
 * The concierge, open on its smart model with three slips a builder makes: OpenAI's xhigh thinking
 * level on Gemini, a default effort that was renamed, and an option with one letter in the wrong
 * case. The studio says what would work for each.
 */
function smartWithSlips() {
	const draft = createExampleDraft();
	const smart = draft.modelBindings.find((binding) => binding.modelId === 'smart');
	const modelBindings = draft.modelBindings.map((binding) =>
		binding === smart
			? {
					...binding,
					efforts: [...binding.efforts, { alias: 'max', level: 'xhigh' as const }],
					defaultEffort: 'balanced',
					options: { persistViaInteractionID: true },
				}
			: binding,
	);
	return workspaceFromDraft({ ...draft, modelBindings }, modelBindingNodeId(smart?.key ?? ''));
}

/** The studio tile's editor: the studio's own toolbar and inspector, shown and not used. */
export default function StudioEditor() {
	const [workspace] = useState(smartWithSlips);
	return (
		<Card variant="glass" padding={0} elevation="med" className="packages-editor" inert aria-hidden>
			<StudioEditorPreview workspace={workspace} on={ON_SITE} />
		</Card>
	);
}
