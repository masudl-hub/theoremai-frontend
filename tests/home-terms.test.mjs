import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { createServer } from 'vite';
import { kernelMetaDefine } from '../scripts/kernel-meta.mjs';
import { resolveTheoremaiRoot } from '../scripts/resolve-theoremai-root.mjs';

test('profile and detector tooltips describe kernel concepts rather than functions or action settings', async () => {
	const cacheDir = await mkdtemp(join(tmpdir(), 'theorem-home-terms-'));
	const index = { articles: [
		{ slug: 'modalities', title: 'Choosing a modality', symbols: [] },
		{ slug: 'guardrails', title: 'Setting guardrails', symbols: [] },
	] };
	const server = await createServer({
		configFile: false,
		cacheDir,
		define: kernelMetaDefine(resolveTheoremaiRoot(process.cwd())),
		server: { middlewareMode: true, ws: false },
		plugins: [{
			name: 'test-docs-index',
			resolveId(id) { if (id === 'virtual:docs/index') return '\0test-docs-index'; },
			load(id) { if (id === '\0test-docs-index') return `export const docIndex=${JSON.stringify(index)}`; },
		}],
	});
	try {
		const { homeTerms } = await server.ssrLoadModule('/app/lib/.server/home-terms.ts');
		const terms = homeTerms();
		assert.equal(terms.profile.symbol.name, 'Profile');
		assert.equal(terms.profile.symbol.exported, 'type');
		assert.match(terms.profile.symbol.doc, /^The contract that defines/);
		assert.equal(terms.detector.symbol.name, 'Detector');
		assert.equal(terms.detector.symbol.exported, 'type');
		assert.match(terms.detector.symbol.doc, /^A detector recognizes/);
		assert.equal(terms.detector.href, '/docs/guardrails');
	} finally {
		await server.close();
		await rm(cacheDir, { recursive: true, force: true });
	}
});
