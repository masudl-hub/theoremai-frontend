/**
 * Pressure-test playground graph sync + compile across every modality
 * and every illegal type/protocol pairing the kernel matrix forbids.
 *
 * Run: node --experimental-strip-types scripts/pressure-playground.mjs
 */
import assert from 'node:assert/strict';
import {
	isValidProfileProtocol,
	PROFILE_TYPES,
	PROFILE_TYPE_PROTOCOLS,
	PROTOCOLS,
	protocolsForProfileType,
} from '@theoremai/agents';
import {
	MODALITY_OPTIONS,
	PLAYGROUND_EXCLUDED_TYPES,
	protocolsForModality,
} from '../src/lib/playground/compat.ts';
import { compilePlayground } from '../src/lib/playground/compile.ts';
import { createInitialGraph, syncGraphForProfile } from '../src/lib/playground/example.ts';

function identityFrom(nodes, patch = {}) {
	const data = nodes.find((n) => n.data.kind === 'identity')?.data;
	assert.ok(data, 'identity node required');
	return { ...data, ...patch };
}

function forceProtocol(nodes, protocol, provider) {
	return nodes.map((n) => {
		if (n.data.kind !== 'modelBinding') return n;
		return { ...n, data: { ...n.data, protocol, provider } };
	});
}

function modelBindings(nodes) {
	return nodes.filter((n) => n.data.kind === 'modelBinding');
}

function expectedDefaultProtocol(type) {
	return type === 'live' ? 'geminiLive' : 'openAi';
}

function graphFor(type) {
	const initial = createInitialGraph();
	const identity = identityFrom(initial.nodes, {
		profileType: type,
		agentId: `pressure.${type}`,
		handle: `pressure-${type}`,
		system: 'Pressure test profile.',
	});
	return syncGraphForProfile(initial.nodes, [], identity);
}

/** Types the playground offers; `host` and `decision` are kernel-only. */
const PLAYGROUND_TYPES = MODALITY_OPTIONS.map((o) => o.value);

let passed = 0;
function ok(label) {
	passed += 1;
	console.log(`  ✓ ${label}`);
}

console.log('kernel matrix surface');
for (const type of PROFILE_TYPES) {
	for (const protocol of PROTOCOLS) {
		const expected = PROFILE_TYPE_PROTOCOLS[type].includes(protocol);
		assert.equal(isValidProfileProtocol(type, protocol), expected, `${type}/${protocol}`);
	}
	ok(`isValidProfileProtocol exhaustive for ${type}`);
}

console.log('compat protocolsForModality mirrors kernel');
for (const type of PROFILE_TYPES) {
	const labeled = protocolsForModality(type).map((o) => o.value);
	assert.deepEqual(labeled, [...protocolsForProfileType(type)]);
	ok(`protocolsForModality(${type})`);
}
assert.deepEqual(
	protocolsForModality('').map((o) => o.value),
	[...PROTOCOLS],
);
ok('protocolsForModality(empty) returns all protocols');

console.log('playground profile types');
assert.deepEqual(
	PLAYGROUND_TYPES,
	PROFILE_TYPES.filter((t) => !PLAYGROUND_EXCLUDED_TYPES.includes(t)),
);
ok(`playground offers ${PLAYGROUND_TYPES.join(', ')}`);

console.log('graph sync shapes');
{
	const blank = createInitialGraph();
	assert.equal(blank.nodes.length, 1);
	assert.equal(blank.nodes[0].data.kind, 'identity');
	assert.equal(blank.nodes[0].data.profileType, '');
	ok('initial graph is identity-only');
}

for (const type of PLAYGROUND_TYPES) {
	const { nodes, edges } = graphFor(type);
	assert.ok(nodes.some((n) => n.data.kind === 'identity'));
	assert.ok(nodes.some((n) => n.data.kind === 'models'));
	assert.ok(nodes.some((n) => n.data.kind === 'modelBinding'));
	assert.ok(edges.length > 0);

	if (type === 'image') assert.ok(nodes.some((n) => n.data.kind === 'image'));
	if (type === 'speech') assert.ok(nodes.some((n) => n.data.kind === 'speech'));
	if (type === 'live') assert.ok(nodes.some((n) => n.data.kind === 'live'));
	if (type === 'text') {
		assert.ok(!nodes.some((n) => n.data.kind === 'image'));
		assert.ok(!nodes.some((n) => n.data.kind === 'speech'));
		assert.ok(!nodes.some((n) => n.data.kind === 'live'));
	}

	const bindings = modelBindings(nodes);
	assert.ok(bindings.length > 0, `${type} needs at least one model binding`);
	for (const binding of bindings) {
		assert.equal(
			isValidProfileProtocol(type, binding.data.protocol),
			true,
			`${type} default protocol on ${binding.data.modelId}`,
		);
		assert.equal(
			binding.data.protocol,
			expectedDefaultProtocol(type),
			`${type} default protocol`,
		);
	}
	ok(`syncGraphForProfile(${type}) shape + legal protocol`);
}

console.log('compile happy paths');
for (const type of PLAYGROUND_TYPES) {
	const { nodes } = graphFor(type);
	const result = compilePlayground(nodes);
	assert.equal(result.ok, true, `${type} compile: ${result.ok ? '' : result.message}\n${result.ok ? '' : JSON.stringify(result.issues, null, 2)}`);
	assert.equal(result.profile.type, type);
	for (const binding of Object.values(result.profile.models)) {
		assert.equal(isValidProfileProtocol(type, binding.protocol), true);
	}
	if (type === 'image') assert.ok(result.profile.image);
	if (type === 'speech') assert.ok(result.profile.speech);
	if (type === 'live') assert.ok(result.profile.live);
	ok(`compilePlayground(${type})`);
}

console.log('illegal type/protocol pairs rejected at validate');
const illegal = [];
for (const type of PLAYGROUND_TYPES) {
	for (const protocol of PROTOCOLS) {
		if (isValidProfileProtocol(type, protocol)) continue;
		illegal.push([type, protocol]);
	}
}
assert.ok(illegal.length >= 5, 'expected multiple illegal pairs');

for (const [type, protocol] of illegal) {
	const { nodes } = graphFor(type);
	const provider = protocol === 'openAi' ? 'openrouter' : 'google';
	const tainted = forceProtocol(nodes, protocol, provider);
	const result = compilePlayground(tainted);
	assert.equal(result.ok, false, `${type}+${protocol} must fail`);
	assert.ok(
		result.issues.some(
			(i) =>
				i.facet === 'modelBinding' &&
				i.message.includes(`cannot use protocol "${protocol}"`) &&
				i.message.includes(`Profile type "${type}"`),
		),
		`${type}+${protocol} issue missing: ${JSON.stringify(result.issues)}`,
	);
	ok(`reject ${type} + ${protocol}`);
}

console.log(`\npressure-playground: ${passed} checks passed`);
