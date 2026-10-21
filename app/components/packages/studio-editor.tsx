import { Card } from '@astryxdesign/core/Card';
import { createArchitectWorkspace, toolSpecNodeId } from '@theoremjs/studio';
import { StudioEditorPreview } from '@theoremjs/studio/ui/studio-screen.tsx';
import { useState } from 'react';
import { ON_SITE } from '../../lib/studio-supplies';

const AWS_TOOLS = [
	'aws___read_documentation',
	'aws___search_documentation',
	'aws___list_regions',
	'aws___get_regional_availability',
	'aws___retrieve_skill',
];

/**
 * The code architect's AWS regions tool, open on its connection test, which found the remote tool,
 * with three slips a builder makes: an API key pasted into the headers, and two labels that name
 * fields the tool doesn't have. The studio says what would work for each.
 */
function awsRegionsWithSlips() {
	const workspace = createArchitectWorkspace();
	const regions = workspace.toolSpecs.find((tool) => tool.toolName === 'list_aws_regions');
	return {
		...workspace,
		selected: toolSpecNodeId(regions?.key ?? ''),
		toolSpecs: workspace.toolSpecs.map((tool) =>
			tool === regions
				? {
						...tool,
						activity: 'Listing AWS regions in {partition}',
						activityPast: 'Listed {content.regions.length} AWS regions',
						headersJson: '{\n  "Accept": "application/json",\n  "x-api-key": "ak_4f9c2e71b8"\n}',
					}
				: tool,
		),
	};
}

const PROBE = { ok: true, elapsedMs: 202, tools: AWS_TOOLS, targetToolFound: true };

/** The studio tile's editor: the studio's own toolbar and inspector, shown and not used. */
export default function StudioEditor() {
	const [workspace] = useState(awsRegionsWithSlips);
	return (
		<Card variant="glass" padding={0} elevation="med" className="packages-editor" inert aria-hidden>
			<StudioEditorPreview workspace={workspace} on={ON_SITE} probe={PROBE} />
		</Card>
	);
}
