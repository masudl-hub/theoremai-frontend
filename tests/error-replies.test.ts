import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TheoremError } from '@theoremjs/agents';
import { errorJson, ndjsonEventStream } from '../app/lib/.server/ndjson-stream.ts';
import { testConnection } from '../app/lib/.server/test-connection.ts';

const SECRET = 'upstream said: key sk-live-123 rejected at 10.0.0.4';

async function* failing(): AsyncGenerator<unknown> {
	yield { type: 'text', text: 'hello' };
	throw new TheoremError('auth', SECRET);
}

test('a stream that fails ends on the visitor wording, never the raw reason', async () => {
	const body = await ndjsonEventStream(failing()).text();
	const last = JSON.parse(body.trim().split('\n').at(-1) ?? '') as Record<string, unknown>;
	assert.equal(last.type, 'error');
	assert.equal(last.errorKind, 'auth');
	assert.equal(typeof last.error, 'string');
	assert.equal('errorInternal' in last, false);
	assert.ok(!body.includes('sk-live-123'));
});

test('a caught failure answers with its kind, its status and the visitor wording', async () => {
	const refused = errorJson(new TheoremError('request', SECRET));
	assert.equal(refused.status, 400);
	assert.equal(refused.headers.get('cache-control'), 'no-store');
	const refusedBody = await refused.text();
	assert.equal((JSON.parse(refusedBody) as { errorKind: string }).errorKind, 'request');
	assert.ok(!refusedBody.includes('sk-live-123'));

	const crashed = errorJson(new Error(SECRET));
	assert.equal(crashed.status, 500);
	assert.ok(!(await crashed.text()).includes('sk-live-123'));
});

function probe(body: unknown) {
	return testConnection(
		new Request('https://theorem.test/api/studio/test-connection', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: typeof body === 'string' ? body : JSON.stringify(body),
		}),
	);
}

test('the tool test words its own failures', async () => {
	const malformed = await probe('{');
	assert.equal(malformed.status, 400);
	assert.equal(((await malformed.json()) as { errorKind: string }).errorKind, 'request');

	const inward = await probe({ type: 'http', endpoint: 'http://127.0.0.1:9/private' });
	const blocked = (await inward.json()) as { ok: boolean; code: string; error: string };
	assert.equal(blocked.code, 'ssrf_blocked');
	assert.ok(!blocked.error.includes('127.0.0.1'));

	const typo = await probe({ type: 'mcp', serverUrl: 'nope' });
	assert.equal(((await typo.json()) as { code: string }).code, 'invalid_url');

	const unfilled = await probe({
		type: 'http',
		endpoint: 'https://example.com/users/{id}',
		pathParams: ['id'],
		sampleInput: {},
	});
	const mapping = (await unfilled.json()) as { code: string; error: string };
	assert.equal(mapping.code, 'invalid_mapping');
	assert.ok(!mapping.error.includes('example.com'));
});
