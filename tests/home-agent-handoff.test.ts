import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHomeAgent } from '../app/lib/home-agent.ts';
import { keepHomeAgent, takeHomeAgent } from '../app/lib/home-agent-handoff.ts';

test('Open Studio handoff keeps the research pagereader with stage-read tools', () => {
	const { workspace } = createHomeAgent();
	assert.equal(workspace.agents.length, 2);
	assert.ok(workspace.agents.some((agent) => agent.identity.agentId === 'research.pagereader'));
	assert.ok(
		workspace.toolSpecs.some(
			(tool) => tool.toolName === 'read_model_card' && Boolean(tool.stageAgentKey),
		),
		'stage-read tools must still name the pagereader',
	);

	keepHomeAgent(workspace);
	const handed = takeHomeAgent();
	assert.ok(handed);
	assert.equal(handed.agents.length, 2);
	assert.ok(handed.agents.some((agent) => agent.identity.agentId === 'research.pagereader'));
	assert.ok(
		handed.toolSpecs.some(
			(tool) => tool.toolName === 'read_model_card' && Boolean(tool.stageAgentKey),
		),
	);
	assert.equal(takeHomeAgent(), undefined, 'handoff is one-shot');
});
