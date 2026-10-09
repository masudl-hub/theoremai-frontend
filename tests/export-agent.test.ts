import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import {
	addAgent,
	agentDraft,
	type CompiledWorkspace,
	compileWorkspace,
	createBlankDraft,
	createExampleDraft,
	createSpanExampleDraft,
	defaultToolSpec,
	type StudioWorkspace,
	setProfileType,
	withAgentDraft,
	workspaceFromDraft,
} from '@theoremjs/studio';
import { exportFiles, exportText, llmBrief } from '@theoremjs/studio/ui/lib/export-agent.ts';
import { zipFiles } from '@theoremjs/studio/ui/lib/zip.ts';

/** The concierge, calling a helper through an agent tool. */
function conciergeAndHelper(): StudioWorkspace {
	const blank = setProfileType(createBlankDraft(), 'text');
	const helper = { ...blank, identity: { ...blank.identity, agentId: 'travel.helper', handle: 'helper' } };
	const workspace = addAgent(workspaceFromDraft(createExampleDraft()), helper);
	const [concierge, added] = workspace.agents;
	assert(concierge && added);
	const draft = agentDraft(workspace, concierge.key);
	assert(draft);
	const tool = defaultToolSpec({
		toolName: 'ask_helper',
		toolType: 'agent',
		description: 'Asks the helper.',
		agentKey: added.key,
	});
	return withAgentDraft(workspace, concierge.key, { ...draft, toolSpecs: [...draft.toolSpecs, tool] });
}

function compiled(workspace: StudioWorkspace): CompiledWorkspace {
	const result = compileWorkspace(workspace);
	assert(result.ok, JSON.stringify(!result.ok && result.issues));
	return result;
}

function agent(workspace: CompiledWorkspace, id: string) {
	const found = workspace.agents.find((each) => each.agentId === id);
	assert(found);
	return found;
}

test('an export is every agent, then the route and chat for the one being chatted with', () => {
	const workspace = compiled(conciergeAndHelper());
	const files = exportFiles(workspace, agent(workspace, 'travel.concierge'));
	assert.deepEqual(
		files.map((file) => file.path),
		[
			'README.md',
			'tools.ts',
			'agents/travel.helper.ts',
			'agents/travel.concierge.ts',
			'theorem.ts',
			'route.ts',
			'AgentChat.tsx',
		],
	);
	const route = files.find((file) => file.path === 'route.ts')?.code ?? '';
	assert.match(route, /import '\.\/theorem';/);
	assert.match(route, /import \{ profile \} from '\.\/agents\/travel\.concierge';/);
	assert.match(route, /createTheoremHandler\(\{/);
	assert.match(route, /THEOREM_VAULT_SLOT_A/);
	assert.match(exportText(files), /\/\/ ─── agents\/travel\.helper\.ts ───/);
	assert.match(llmBrief(workspace, agent(workspace, 'travel.concierge')), /`travel\.helper`/);
});

test('a decision exports its questions with its profile, and a decision route', () => {
	const workspace = compiled(workspaceFromDraft(createSpanExampleDraft()));
	const [span] = workspace.agents;
	assert(span);
	const files = exportFiles(workspace, span);
	assert.deepEqual(
		files.map((file) => file.path).slice(-2),
		['route.ts', 'AgentDecision.tsx'],
	);
	const route = files.find((file) => file.path === 'route.ts')?.code ?? '';
	assert.match(route, /import \{ profile, questions \} from/);
	assert.match(route, /createTheoremDecisionHandler/);
	const module = files.find((file) => file.path.startsWith('agents/'))?.code ?? '';
	assert.match(module, /export const questions = /);
});

test('the zip holds every file', () => {
	const workspace = compiled(conciergeAndHelper());
	const files = exportFiles(workspace, agent(workspace, 'travel.concierge'));
	const zip = zipFiles(files);
	const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
	// The end record: its signature, then the entry count at byte 10.
	assert.equal(view.getUint32(zip.length - 22, true), 0x06054b50);
	assert.equal(view.getUint16(zip.length - 12, true), files.length);
});

test('an exported chat passes a value per slot and its context, and the route its server context', () => {
	const blank = setProfileType(createBlankDraft(), 'text');
	const draft = {
		...blank,
		identity: { ...blank.identity, agentId: 'travel.guide', handle: 'guide' },
		inputs: {
			...blank.inputs,
			slotsJson: '{"language":["en","fr"]}',
			contextFrom: ['client' as const, 'server' as const],
			contextMaxChars: 2000,
		},
	};
	const workspace = compiled(workspaceFromDraft(draft));
	const [only] = workspace.agents;
	assert(only);
	const files = exportFiles(workspace, only);
	const chat = files.find((file) => file.path === 'AgentChat.tsx')?.code ?? '';
	assert.match(chat, /\/\/ language: en \| fr\n\s+slots=\{\{ "language": "en" \}\}/);
	assert.match(chat, /context=\{\{\}\}/);
	assert.match(files.find((file) => file.path === 'route.ts')?.code ?? '', /context: \(\) => \(\{\}\),/);
});

test('a local export configures the registered adapter URL and keeps host options to the vault', () => {
  const draft = setProfileType(createBlankDraft(), 'text');
  draft.identity.agentId = 'local.test';
  draft.identity.handle = 'Local';
  draft.modelBindings[0].provider = 'local';
  draft.modelBindings[0].protocol = 'openAi';
  draft.modelBindings[0].apiId = 'local-model';
  const workspace = compileWorkspace(workspaceFromDraft(draft), 'local');
  assert(workspace.ok, JSON.stringify(!workspace.ok && workspace.issues));
  const files = exportFiles(workspace, workspace.agents[0]);
  const registration = files.find(file => file.path === 'theorem.ts')?.code ?? '';
  assert.match(registration, /LOCAL_MODEL_URL/);
  assert.match(registration, /openAIChat/);
  assert.ok(registration.includes("replace(/\\/$/, '') + '/v1'"));
  const route = files.find(file => file.path === 'route.ts')?.code ?? '';
  assert.doesNotMatch(route, /local: \{ baseUrl/);
  const emitted = ts.transpileModule(registration, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } });
  assert.deepEqual(emitted.diagnostics, []);
});
