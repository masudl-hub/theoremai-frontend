/**
 * Pressure-test PROFILE_GRAPH projection + compile invent bans.
 * Run: npm run pressure:projection
 */
import assert from 'node:assert/strict';
import {
	PROFILE_GRAPH,
	PROFILE_TYPES,
	resolveGuardrailPolicy,
	spineFacetsForProfileType,
} from '@theoremai/agents';
import { compilePlayground } from '../src/lib/playground/compile.ts';
import {
	createExampleGraph,
	createInitialGraph,
	syncGraphForProfile,
} from '../src/lib/playground/example.ts';

let passed = 0;
function ok(label) {
	passed += 1;
	console.log(`  ✓ ${label}`);
}

console.log('spine catalog');
for (const type of PROFILE_TYPES) {
	const ids = spineFacetsForProfileType(type).map((f) => f.id);
	assert.ok(ids.includes('observability'), `${type} missing observability`);
	assert.ok(ids.includes('guardrails'), `${type} missing guardrails`);
	ok(`spineFacetsForProfileType(${type}) has observability+guardrails`);
}

console.log('example graph kinds ⊂ PROFILE_GRAPH');
const { nodes } = createExampleGraph();
const graphIds = new Set(PROFILE_GRAPH.map((f) => f.id));
const kinds = new Set(nodes.map((n) => n.data.kind));
assert.ok(kinds.has('observability'));
assert.ok(kinds.has('turnBehaviour'));
assert.ok(kinds.has('guardrails'));
for (const kind of kinds) {
	assert.ok(graphIds.has(kind), `unknown kind ${kind}`);
}
ok('example includes observability/turnBehaviour/guardrails; all kinds catalogued');

console.log('compile emits nested observability; bans invents');
const withObs = nodes.map((n) => {
	if (n.data.kind !== 'observability') return n;
	return {
		...n,
		data: {
			...n.data,
			writeTo: 'traces',
			sampleRate: 1,
			include: { guardrailMatchPreview: true },
		},
	};
});
const compiled = compilePlayground(withObs);
assert.equal(compiled.ok, true, JSON.stringify(compiled.issues ?? compiled, null, 2));
assert.ok(compiled.profile.observability, 'compile omitted observability');
assert.equal(compiled.profile.observability.writeTo, 'traces');
assert.equal(compiled.profile.observability.include?.guardrailMatchPreview, true);
assert.equal(compiled.profile.observability.include?.upstreamLog, undefined);
ok('compilePlayground emits nested observability.include.guardrailMatchPreview');
assert.equal(Object.hasOwn(compiled.profile.identity, 'chat'), false);
ok('no identity.chat');

console.log('blank sync invent bans');
const blank = createInitialGraph();
assert.deepEqual(blank.nodes[0].data.includedOptionalFacets, []);
ok('initial includedOptionalFacets is empty');

const textId = {
	...blank.nodes[0].data,
	profileType: 'text',
	agentId: 'pressure.agent',
	handle: 'pressure',
	system: 'Say hi.',
	includedOptionalFacets: ['outputs', 'turnBehaviour', 'guardrails', 'observability'],
};
const synced = syncGraphForProfile([{ ...blank.nodes[0], data: textId }], [], textId);
const c2 = compilePlayground(synced.nodes);
assert.equal(c2.ok, true, JSON.stringify(c2.issues ?? c2, null, 2));
assert.equal(c2.profile.maxSteps, undefined);
ok('maxSteps omitted when unset');

assert.ok(synced.nodes.some((n) => n.data.kind === 'inputs'), 'inputs facet missing');
ok('inputs facet present on text sync graph');
assert.ok(synced.nodes.some((n) => n.data.kind === 'tools'), 'tools facet missing');
ok('tools facet present on text sync graph');

assert.equal(c2.profile.inputs?.text, undefined, 'invented inputs.text');
assert.equal(c2.profile.outputs, undefined, 'invented outputs block from empty seed');
assert.equal(c2.profile.observability, undefined, 'invented observability from empty seed');
assert.equal(c2.profile.turnBehaviour, undefined, 'invented turnBehaviour from empty seed');
ok('blank text compile omits inputs.text / outputs / observability / turnBehaviour');

for (const binding of Object.values(c2.profile.models)) {
	assert.equal(binding.maxOutputTokens, undefined, 'invented maxOutputTokens');
	assert.equal(binding.efforts, undefined, 'invented efforts');
}
ok('blank model binding omits maxOutputTokens and efforts');

console.log('sparse guardrails → no invented sanitize/hasEgress');
const sparseGR = synced.nodes.map((n) => {
	if (n.data.kind !== 'guardrails') return n;
	return { ...n, data: { kind: 'guardrails', expanded: false, quotaEnabled: false } };
});
const c3 = compilePlayground(sparseGR);
assert.equal(c3.ok, true, JSON.stringify(c3.issues ?? c3, null, 2));
assert.equal(c3.profile.guardrails?.sanitizeInput, undefined, 'invented sanitizeInput');
assert.equal(c3.profile.guardrails?.redactSensitive, undefined, 'invented redactSensitive');
assert.equal(c3.profile.guardrails?.egress, undefined, 'invented egress');
ok('sparse guardrails compile omits sanitize/redact/egress');

console.log('turnBehaviour resume empty lists → resumption {}');
const withResume = synced.nodes.map((n) => {
	if (n.data.kind !== 'turnBehaviour') return n;
	return {
		...n,
		data: {
			kind: 'turnBehaviour',
			expanded: false,
			resumeEnabled: true,
			allowContinue: [],
			autoContinue: [],
		},
	};
});
const c4 = compilePlayground(withResume);
assert.equal(c4.ok, true, JSON.stringify(c4.issues ?? c4, null, 2));
assert.deepEqual(c4.profile.turnBehaviour?.resumption, {});
assert.equal(c4.profile.turnBehaviour?.resumption?.allowContinue, undefined);
assert.equal(c4.profile.turnBehaviour?.resumption?.autoContinue, undefined);
ok('resume with empty lists does not materialize DEFAULT_*');

console.log('canary resolve');
assert.equal(resolveGuardrailPolicy(undefined).canary, true);
assert.equal(resolveGuardrailPolicy({}).canary, true);
assert.equal(resolveGuardrailPolicy({ canary: false }).canary, false);
ok('canary omit → true; explicit false preserved');

console.log('image/speech blank pin omit');
{
	const imageId = {
		...blank.nodes[0].data,
		profileType: 'image',
		agentId: 'pressure.image',
		handle: 'pressure-image',
		system: 'Describe.',
		includedOptionalFacets: [],
	};
	const imageSynced = syncGraphForProfile([{ ...blank.nodes[0], data: imageId }], [], imageId);
	const ci = compilePlayground(imageSynced.nodes);
	assert.equal(ci.ok, true, JSON.stringify(ci.issues ?? ci, null, 2));
	assert.equal(ci.profile.image?.mimeType, undefined, 'invented image.mimeType');
	assert.equal(ci.profile.image?.maxInputImages, undefined, 'invented maxInputImages');
	ok('blank image omits mimeType/maxInputImages');

	const speechId = {
		...blank.nodes[0].data,
		profileType: 'speech',
		agentId: 'pressure.speech',
		handle: 'pressure-speech',
		system: 'Speak.',
		includedOptionalFacets: [],
	};
	const speechSynced = syncGraphForProfile([{ ...blank.nodes[0], data: speechId }], [], speechId);
	const cs = compilePlayground(speechSynced.nodes);
	assert.equal(cs.ok, true, JSON.stringify(cs.issues ?? cs, null, 2));
	assert.equal(cs.profile.speech?.format, undefined, 'invented speech.format');
	ok('blank speech omits format');
}

console.log(`\npressure-projection: ${passed} checks passed`);
