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
} from 'theorum';
import { protocolsForModality } from '../src/lib/playground/compat.ts';
import { compilePlayground } from '../src/lib/playground/compile.ts';
import { createInitialGraph, syncGraphForProfile } from '../src/lib/playground/example.ts';

function identityFrom(nodes, patch = {}) {
	const data = nodes.find((n) => n.data.kind === 'identity')?.data;
	assert.ok(data, 'identity node required');
	return { ...data, ...patch };
}

function forceProtocol(nodes, protocol, provider) {
	return nodes.map((n) => {
		if (n.data.kind !== 'models') return n;
		return { ...n, data: { ...n.data, protocol, provider } };
	});
}

function graphFor(type) {
	const initial = createInitialGraph();
	const identity = identityFrom(initial.nodes, { profileType: type });
	return syncGraphForProfile(initial.nodes, [], identity);
}

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

console.log('graph sync shapes');
{
	const blank = createInitialGraph();
	assert.equal(blank.nodes.length, 1);
	assert.equal(blank.nodes[0].data.kind, 'identity');
	assert.equal(blank.nodes[0].data.profileType, '');
	ok('initial graph is identity-only');
}

for (const type of PROFILE_TYPES) {
	const { nodes, edges } = graphFor(type);
	assert.ok(nodes.some((n) => n.data.kind === 'identity'));
	assert.ok(nodes.some((n) => n.data.kind === 'models'));
	assert.ok(nodes.some((n) => n.data.kind === 'modelSpec'));
	assert.ok(edges.length > 0);

	if (type === 'image') assert.ok(nodes.some((n) => n.data.kind === 'image'));
	if (type === 'speech') assert.ok(nodes.some((n) => n.data.kind === 'speech'));
	if (type === 'live') assert.ok(nodes.some((n) => n.data.kind === 'live'));
	if (type === 'text') {
		assert.ok(!nodes.some((n) => n.data.kind === 'image'));
		assert.ok(!nodes.some((n) => n.data.kind === 'speech'));
		assert.ok(!nodes.some((n) => n.data.kind === 'live'));
	}

	const models = nodes.find((n) => n.data.kind === 'models')?.data;
	assert.ok(models);
	assert.equal(isValidProfileProtocol(type, models.protocol), true, `${type} default protocol`);
	ok(`syncGraphForProfile(${type}) shape + legal protocol`);
}

console.log('compile happy paths');
for (const type of PROFILE_TYPES) {
	const { nodes } = graphFor(type);
	const result = compilePlayground(nodes);
	assert.equal(result.ok, true, `${type} compile: ${result.ok ? '' : result.message}\n${result.ok ? '' : JSON.stringify(result.issues, null, 2)}`);
	assert.equal(result.profile.type, type);
	assert.equal(isValidProfileProtocol(type, result.profile.model.protocol), true);
	if (type === 'image') assert.ok(result.profile.image);
	if (type === 'speech') assert.ok(result.profile.speech);
	if (type === 'live') assert.ok(result.profile.live);
	ok(`compilePlayground(${type})`);
}

console.log('illegal type/protocol pairs rejected at validate');
const illegal = [];
for (const type of PROFILE_TYPES) {
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
				i.facet === 'models' &&
				i.message.includes(`cannot use protocol "${protocol}"`) &&
				i.message.includes(`Profile type "${type}"`),
		),
		`${type}+${protocol} issue missing: ${JSON.stringify(result.issues)}`,
	);
	ok(`reject ${type} + ${protocol}`);
}

console.log(`\npressure-playground: ${passed} checks passed`);
