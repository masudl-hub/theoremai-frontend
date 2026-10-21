import { Card } from '@astryxdesign/core/Card';
import { createArchitectWorkspace, toolSpecNodeId } from '@theoremjs/studio';
import { StudioEditorPreview } from '@theoremjs/studio/ui/studio-screen.tsx';
import { useState } from 'react';
import { ON_SITE } from '../../lib/studio-supplies';

/**
 * The code architect's Exa web search, open on its connection test, which found the remote tool,
 * with three slips a builder makes: Exa's API key pasted into the headers, and two labels that name
 * fields the tool doesn't have. The studio says what would work for each.
 */
function exaSearchWithSlips() {
	const workspace = createArchitectWorkspace();
	const search = workspace.toolSpecs.find((tool) => tool.mcpToolName === 'web_search_exa');
	return {
		...workspace,
		selected: toolSpecNodeId(search?.key ?? ''),
		toolSpecs: workspace.toolSpecs.map((tool) =>
			tool === search
				? {
						...tool,
						activity: 'Searching the web for {search_query}',
						activityPast: 'Found {numResult} pages',
						headersJson: '{\n  "Accept": "application/json",\n  "x-api-key": "exa_4f9c2e71b8d0"\n}',
					}
				: tool,
		),
	};
}

/** What Exa's server answered: the two tools it has. */
const PROBE = {
	ok: true,
	elapsedMs: 184,
	tools: ['web_search_exa', 'web_fetch_exa'],
	targetToolFound: true,
};

/** The studio tile's editor: the studio's own toolbar and inspector, shown and not used. */
export default function StudioEditor() {
	const [workspace] = useState(exaSearchWithSlips);
	return (
		<Card variant="glass" padding={0} elevation="med" className="packages-editor" inert aria-hidden>
			<StudioEditorPreview workspace={workspace} on={ON_SITE} probe={PROBE} />
		</Card>
	);
}
