import { Card } from '@astryxdesign/core/Card';
import { createExampleDraft, modelBindingNodeId, workspaceFromDraft } from '@theoremjs/studio';
import { ProfileEditor } from '@theoremjs/studio/ui/profile-editor.tsx';
import { StudioTreePreview } from '@theoremjs/studio/ui/studio-screen.tsx';
import { useState } from 'react';
import { KERNEL_PACKAGE_VERSION } from '../../lib/kernel-version';

/** The concierge, open on its first model, as the studio opens it. */
function openOnModel() {
	const draft = createExampleDraft();
	const model = modelBindingNodeId(draft.modelBindings[0]?.key ?? '');
	return { draft, model, workspace: workspaceFromDraft(draft, model) };
}

const still = () => {};

/**
 * The studio tile's editor: the studio's own tree and inspector, open on the concierge's model.
 * It is the studio's, shown and not used.
 */
export default function StudioEditor() {
	const [{ draft, model, workspace }] = useState(openOnModel);
	return (
		<Card variant="glass" padding={0} elevation="med" className="packages-editor" inert aria-hidden>
			<StudioTreePreview workspace={workspace} kernelVersion={KERNEL_PACKAGE_VERSION} />
			<div className="packages-editor-inspector">
				<ProfileEditor
					draft={draft}
					setDraft={still}
					selectedId={model}
					onSelect={still}
					issues={[]}
				/>
			</div>
		</Card>
	);
}
