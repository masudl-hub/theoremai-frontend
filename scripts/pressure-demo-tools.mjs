/**
 * Safe smoke test for the travel concierge demo — one request per remote tool,
 * sequential with polite delays (Nominatim: 1 req/s). Not a load test.
 *
 * Run: npm run pressure:demo
 * Optional: npm run pressure:demo -- --mcp  (includes one slow DeepWiki call)
 */
import assert from 'node:assert/strict';
import { compilePlayground } from '../src/lib/playground/compile.ts';
import { playgroundDemoHandler } from 'theorum/playground';
import { createExampleGraph } from '../src/lib/playground/example.ts';

const NOMINATIM_UA = 'TheorumPlayground/1.0 (travel demo smoke test)';
const NOMINATIM_GAP_MS = 1100;

const args = new Set(process.argv.slice(2));
const includeMcp = args.has('--mcp');

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

let passed = 0;
let failed = 0;

function ok(label) {
	passed += 1;
	console.log(`  ✓ ${label}`);
}

function fail(label, err) {
	failed += 1;
	const message = err instanceof Error ? err.message : String(err);
	console.error(`  ✗ ${label}: ${message}`);
}

async function fetchOk(label, url, init = {}) {
	const controller = new AbortController();
	const timeout = setTimeout(() => {
		controller.abort();
	}, 20_000);
	try {
		const res = await fetch(url, { ...init, signal: controller.signal });
		const text = await res.text();
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
		}
		if (!text.trim()) {
			throw new Error('empty body');
		}
		ok(label);
	} finally {
		clearTimeout(timeout);
	}
}

/** @type {Array<{ name: string; url: string; init?: RequestInit; delayBefore?: number }>} */
const HTTP_SMOKE = [
	{
		name: 'geocode_city',
		url: 'https://geocoding-api.open-meteo.com/v1/search?count=1&name=Paris',
	},
	{
		name: 'search_places',
		url: 'https://nominatim.openstreetmap.org/search?format=json&q=Paris&limit=1',
		init: { headers: { 'User-Agent': NOMINATIM_UA } },
		delayBefore: NOMINATIM_GAP_MS,
	},
	{
		name: 'reverse_geocode',
		url: 'https://nominatim.openstreetmap.org/reverse?format=json&lat=48.85&lon=2.35',
		init: { headers: { 'User-Agent': NOMINATIM_UA } },
		delayBefore: NOMINATIM_GAP_MS,
	},
	{
		name: 'get_weather',
		url: 'https://api.open-meteo.com/v1/forecast?current_weather=true&latitude=48.85&longitude=2.35',
	},
	{
		name: 'get_sun_times',
		url: 'https://api.sunrise-sunset.org/json?lat=48.85&lng=2.35',
	},
	{
		name: 'convert_currency',
		url: 'https://api.frankfurter.dev/v1/latest?from=USD&to=EUR&amount=100',
	},
	{
		name: 'wikipedia_summary',
		url: 'https://en.wikipedia.org/api/rest_v1/page/summary/Paris',
	},
	{
		name: 'openlibrary_search',
		url: 'https://openlibrary.org/search.json?q=travel&limit=1',
	},
	{
		name: 'lookup_postal_code',
		url: 'https://api.zippopotam.us/us/90210',
	},
	{
		name: 'get_pokemon',
		url: 'https://pokeapi.co/api/v2/pokemon/pikachu',
	},
	{
		name: 'get_cat_fact',
		url: 'https://catfact.ninja/fact?max_length=160',
	},
	{
		name: 'tell_joke',
		url: 'https://official-joke-api.appspot.com/random_joke',
	},
	{
		name: 'get_advice',
		url: 'https://api.adviceslip.com/advice',
	},
	{
		name: 'random_dog_image',
		url: 'https://dog.ceo/api/breeds/image/random',
	},
];

/** @type {Array<{ name: string; input: Record<string, unknown> }>} */
const FUNCTION_SMOKE = [
	{ name: 'convert_units', input: { value: 32, from: 'f', to: 'c' } },
	{ name: 'weather_code_label', input: { weathercode: 0 } },
	{ name: 'trip_budget_estimate', input: { days: 3, perDiem: 120, currency: 'eur' } },
	{ name: 'packing_suggestions', input: { tempC: 22, activity: 'hiking' } },
	{ name: 'haversine_distance', input: { lat1: 48.85, lon1: 2.35, lat2: 51.5, lon2: -0.12 } },
];

console.log('compile travel concierge example graph');
{
	const { nodes } = createExampleGraph();
	const result = compilePlayground(nodes);
	if (!result.ok) {
		console.error(JSON.stringify(result.issues, null, 2));
		process.exit(1);
	}
	assert.equal(result.agentId, 'travel.concierge');
	assert.ok(result.customTools.length >= 20, `expected many tools, got ${result.customTools.length}`);
	assert.ok(result.profile.inputs?.text, 'inputs.text should be enabled');
	assert.ok(result.profile.inputs?.attachments, 'inputs.attachments should be enabled');
	ok(`compilePlayground (${result.customTools.length} custom tools)`);
}

console.log('function tools (local, no network)');
for (const { name, input } of FUNCTION_SMOKE) {
	try {
		const handler = playgroundDemoHandler(name);
		assert.ok(handler, `missing handler for ${name}`);
		const out = handler(input);
		assert.ok(out && typeof out === 'object', `${name} returned empty`);
		ok(name);
	} catch (err) {
		fail(name, err);
	}
}

console.log('HTTP tools (sequential, rate-limited where required)');
for (const case_ of HTTP_SMOKE) {
	if (case_.delayBefore) await sleep(case_.delayBefore);
	try {
		await fetchOk(case_.name, case_.url, case_.init);
	} catch (err) {
		fail(case_.name, err);
	}
	await sleep(200);
}

if (includeMcp) {
	console.log('MCP tool (single DeepWiki call, may take ~15s)');
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => {
			controller.abort();
		}, 45_000);
		const res = await fetch('https://mcp.deepwiki.com/mcp', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json, text/event-stream',
				'MCP-Protocol-Version': '2025-11-25',
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 'smoke-1',
				method: 'tools/call',
				params: {
					name: 'ask_question',
					arguments: {
						repoName: 'sveltejs/kit',
						question: 'What is SvelteKit in one sentence?',
					},
					_meta: { 'io.modelcontextprotocol/protocolVersion': '2025-11-25' },
				},
			}),
			signal: controller.signal,
		});
		clearTimeout(timeout);
		const text = await res.text();
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		if (!text.includes('"result"') && !text.includes('SvelteKit')) {
			throw new Error(`unexpected MCP body: ${text.slice(0, 160)}`);
		}
		ok('ask_repo_docs (DeepWiki MCP)');
	} catch (err) {
		fail('ask_repo_docs (DeepWiki MCP)', err);
	}
} else {
	console.log('MCP tool skipped (pass --mcp to include one DeepWiki call)');
}

console.log(`\npressure-demo-tools: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
